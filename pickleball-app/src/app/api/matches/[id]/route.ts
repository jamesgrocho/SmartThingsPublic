import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as { id: string } & typeof session.user).id;
  const { player1Score, player2Score } = await req.json();

  if (typeof player1Score !== "number" || typeof player2Score !== "number") {
    return NextResponse.json({ error: "Scores must be numbers" }, { status: 400 });
  }
  if (player1Score < 0 || player2Score < 0) {
    return NextResponse.json({ error: "Scores cannot be negative" }, { status: 400 });
  }
  if (player1Score === player2Score) {
    return NextResponse.json({ error: "Pickleball cannot end in a tie" }, { status: 400 });
  }

  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (match.completedAt) {
    return NextResponse.json({ error: "Match already completed" }, { status: 400 });
  }
  if (!match.player1Id || !match.player2Id) {
    return NextResponse.json({ error: "Both players must be set" }, { status: 400 });
  }

  // Only a participant or the tournament organizer can report
  const tournament = await prisma.tournament.findUnique({
    where: { id: match.tournamentId },
  });
  const isParticipant =
    match.player1Id === userId || match.player2Id === userId;
  const isOrganizer = tournament?.createdById === userId;
  if (!isParticipant && !isOrganizer) {
    return NextResponse.json({ error: "Only a match participant can report the score" }, { status: 403 });
  }

  const winnerId =
    player1Score > player2Score ? match.player1Id : match.player2Id;
  const loserId =
    player1Score > player2Score ? match.player2Id : match.player1Id;

  await prisma.$transaction(async (tx) => {
    // Update this match
    await tx.match.update({
      where: { id },
      data: {
        player1Score,
        player2Score,
        winnerId,
        reportedById: userId,
        completedAt: new Date(),
      },
    });

    // Advance winner to next match
    if (match.nextMatchId && match.nextMatchSlot) {
      const winUpdate =
        match.nextMatchSlot === 1
          ? { player1Id: winnerId }
          : { player2Id: winnerId };
      await tx.match.update({ where: { id: match.nextMatchId }, data: winUpdate });
    }

    // For double elim, send loser to losers bracket
    if (match.loserNextMatchId && match.loserNextMatchSlot) {
      const loseUpdate =
        match.loserNextMatchSlot === 1
          ? { player1Id: loserId }
          : { player2Id: loserId };
      await tx.match.update({
        where: { id: match.loserNextMatchId },
        data: loseUpdate,
      });
    }

    // Check if tournament is complete (no remaining incomplete non-bye matches)
    const remaining = await tx.match.count({
      where: {
        tournamentId: match.tournamentId,
        completedAt: null,
        isBye: false,
        player1Id: { not: null },
        player2Id: { not: null },
      },
    });

    // Subtract the current match (just completed)
    if (remaining === 0) {
      await tx.tournament.update({
        where: { id: match.tournamentId },
        data: { status: "COMPLETED" },
      });
    }
  });

  const updated = await prisma.match.findUnique({ where: { id } });
  return NextResponse.json(updated);
}
