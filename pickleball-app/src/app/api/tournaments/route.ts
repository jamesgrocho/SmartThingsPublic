import { NextRequest, NextResponse } from "next/server";
import { auth, getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { players: true, matches: true } },
    },
  });
  return NextResponse.json(tournaments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = getSessionUser(session as { user?: unknown });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { name, description, format, matchType, scoreType, maxPlayers } = await req.json();
  if (!name || !format) {
    return NextResponse.json({ error: "name and format required" }, { status: 400 });
  }

  const validFormats = ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN"];
  if (!validFormats.includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const tournament = await prisma.tournament.create({
    data: {
      name,
      description: description || null,
      format,
      matchType: matchType || "S",
      scoreType: scoreType || "RALLY",
      maxPlayers: Number(maxPlayers) || 16,
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(tournament, { status: 201 });
}
