import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth, getSessionUser } from "@/lib/auth";
import MatchesList from "./MatchesList";

export const dynamic = "force-dynamic";

export default async function MatchesPage({
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
    include: {
      players: true,
      matches: {
        where: { isBye: false },
        orderBy: [{ bracket: "asc" }, { round: "asc" }, { position: "asc" }],
        include: { scoreHistory: { orderBy: { createdAt: "desc" } } },
      },
    },
  });

  if (!tournament) notFound();

  if (tournament.status === "REGISTRATION") {
    return (
      <div className="text-center py-20 text-gg-muted">
        <div className="text-4xl mb-4">⏳</div>
        <p>Tournament hasn&apos;t started yet.</p>
        <p className="text-sm mt-1">Matches will appear here once the organizer starts the tournament.</p>
      </div>
    );
  }

  const playerMap: Record<string, { name: string; duprId: string | null }> =
    Object.fromEntries(
      tournament.players.map((p) => [
        p.id,
        { name: `${p.firstName} ${p.lastName}`, duprId: p.duprId },
      ])
    );

  return (
    <MatchesList
      matches={tournament.matches as never}
      playerMap={playerMap}
      isAdmin={isAdmin}
      tournamentId={id}
      format={tournament.format}
    />
  );
}
