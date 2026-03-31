import { NextRequest, NextResponse } from "next/server";
import { auth, getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: list players (public)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const players = await prisma.player.findMany({
    where: { tournamentId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(players);
}

// POST: add a player (admin only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = getSessionUser(session as { user?: unknown });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const { firstName, lastName, duprId } = await req.json();

  if (!firstName?.trim() || !lastName?.trim()) {
    return NextResponse.json({ error: "First and last name required" }, { status: 400 });
  }

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  if (tournament.status !== "REGISTRATION") {
    return NextResponse.json({ error: "Tournament has already started" }, { status: 400 });
  }

  const count = await prisma.player.count({ where: { tournamentId: id } });
  if (count >= tournament.maxPlayers) {
    return NextResponse.json({ error: "Tournament is full" }, { status: 400 });
  }

  const player = await prisma.player.create({
    data: {
      tournamentId: id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      duprId: duprId?.trim() || null,
    },
  });

  return NextResponse.json(player, { status: 201 });
}

// DELETE: remove a player (admin only, registration phase only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = getSessionUser(session as { user?: unknown });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;
  const { playerId } = await req.json();

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament || tournament.status !== "REGISTRATION") {
    return NextResponse.json({ error: "Cannot remove after tournament starts" }, { status: 400 });
  }

  await prisma.player.delete({ where: { id: playerId } });
  return NextResponse.json({ ok: true });
}
