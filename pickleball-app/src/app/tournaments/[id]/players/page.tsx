import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth, getSessionUser } from "@/lib/auth";
import PlayersTab from "./PlayersTab";

export const dynamic = "force-dynamic";

export default async function PlayersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const sessionUser = getSessionUser(session as { user?: unknown });
  const isAdmin = sessionUser?.isAdmin ?? false;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { players: { orderBy: { createdAt: "asc" } } },
  });

  if (!tournament) notFound();

  return (
    <PlayersTab
      tournamentId={id}
      players={tournament.players}
      status={tournament.status}
      isAdmin={isAdmin}
    />
  );
}
