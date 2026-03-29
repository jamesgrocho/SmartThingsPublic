import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  if (tournament.status !== "REGISTRATION") {
    return NextResponse.json({ error: "Registration is closed" }, { status: 400 });
  }

  const playerCount = await prisma.tournamentPlayer.count({ where: { tournamentId: id } });
  if (playerCount >= tournament.maxPlayers) {
    return NextResponse.json({ error: "Tournament is full" }, { status: 400 });
  }

  const existing = await prisma.tournamentPlayer.findUnique({
    where: { tournamentId_userId: { tournamentId: id, userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already joined" }, { status: 409 });
  }

  const player = await prisma.tournamentPlayer.create({
    data: { tournamentId: id, userId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(player, { status: 201 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const userId = (session.user as { id: string } & typeof session.user).id;

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament || tournament.status !== "REGISTRATION") {
    return NextResponse.json({ error: "Cannot leave after tournament starts" }, { status: 400 });
  }

  await prisma.tournamentPlayer.deleteMany({
    where: { tournamentId: id, userId },
  });

  return NextResponse.json({ ok: true });
}
