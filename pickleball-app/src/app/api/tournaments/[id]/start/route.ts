import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateSingleElim,
  generateDoubleElim,
  generateRoundRobin,
} from "@/lib/bracket";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as { id: string } & typeof session.user).id;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { players: { include: { user: true } } },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (tournament.createdById !== userId) {
    return NextResponse.json({ error: "Only the organizer can start" }, { status: 403 });
  }
  if (tournament.status !== "REGISTRATION") {
    return NextResponse.json({ error: "Tournament already started" }, { status: 400 });
  }
  if (tournament.players.length < 2) {
    return NextResponse.json({ error: "Need at least 2 players" }, { status: 400 });
  }

  // Shuffle players for random seeding
  const playerIds = tournament.players
    .map((p) => p.userId)
    .sort(() => Math.random() - 0.5);

  let matches;
  switch (tournament.format) {
    case "SINGLE_ELIMINATION":
      matches = generateSingleElim(id, playerIds);
      break;
    case "DOUBLE_ELIMINATION":
      matches = generateDoubleElim(id, playerIds);
      break;
    case "ROUND_ROBIN":
      matches = generateRoundRobin(id, playerIds);
      break;
    default:
      return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    // Create all matches
    await tx.match.createMany({ data: matches });

    // Advance bye winners for SE/DE
    if (tournament.format !== "ROUND_ROBIN") {
      const byeMatches = matches.filter((m) => m.isBye && m.winnerId);
      for (const m of byeMatches) {
        if (m.nextMatchId && m.winnerId && m.nextMatchSlot) {
          const update =
            m.nextMatchSlot === 1
              ? { player1Id: m.winnerId }
              : { player2Id: m.winnerId };
          await tx.match.update({ where: { id: m.nextMatchId }, data: update });
        }
      }
    }

    await tx.tournament.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });
  });

  return NextResponse.json({ ok: true });
}
