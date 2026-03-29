import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, format, maxPlayers } = await req.json();
  if (!name || !format) {
    return NextResponse.json({ error: "name and format required" }, { status: 400 });
  }

  const validFormats = ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN"];
  if (!validFormats.includes(format)) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const userId = (session.user as { id: string } & typeof session.user).id;

  const tournament = await prisma.tournament.create({
    data: {
      name,
      description: description || null,
      format,
      maxPlayers: Number(maxPlayers) || 16,
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(tournament, { status: 201 });
}
