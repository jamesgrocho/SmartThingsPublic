import { NextRequest, NextResponse } from "next/server";
import { auth, getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; playerId: string }> }
) {
  const session = await auth();
  const user = getSessionUser(session as { user?: unknown });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { playerId } = await params;
  const { checkedIn } = await req.json();

  const player = await prisma.player.update({
    where: { id: playerId },
    data: { checkedIn: Boolean(checkedIn) },
  });

  return NextResponse.json(player);
}
