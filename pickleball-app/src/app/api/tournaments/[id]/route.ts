import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      players: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
      matches: { orderBy: [{ bracket: "asc" }, { round: "asc" }, { position: "asc" }] },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(tournament);
}
