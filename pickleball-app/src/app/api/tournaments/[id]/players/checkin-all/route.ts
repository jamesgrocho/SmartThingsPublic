import { NextRequest, NextResponse } from "next/server";
import { auth, getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = getSessionUser(session as { user?: unknown });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;

  await prisma.player.updateMany({
    where: { tournamentId: id },
    data: { checkedIn: true },
  });

  return NextResponse.json({ ok: true });
}
