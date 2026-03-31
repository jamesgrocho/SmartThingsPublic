import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth, getSessionUser } from "@/lib/auth";
import SingleElimination from "@/components/brackets/SingleElimination";
import DoubleElimination from "@/components/brackets/DoubleElimination";
import RoundRobin from "@/components/brackets/RoundRobin";

export const dynamic = "force-dynamic";

export default async function BracketPage({
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
        <p>Bracket will appear once the tournament starts.</p>
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

  const commonProps = {
    matches: tournament.matches as never,
    playerMap,
    isAdmin,
    tournamentId: id,
  };

  return (
    <div className="overflow-x-auto pb-8">
      <p className="text-sm text-gg-muted mb-6">
        {tournament.status === "COMPLETED"
          ? "Tournament complete 🏆"
          : "Tap any match to report scores"}
      </p>
      {tournament.format === "SINGLE_ELIMINATION" && <SingleElimination {...commonProps} />}
      {tournament.format === "DOUBLE_ELIMINATION" && <DoubleElimination {...commonProps} />}
      {tournament.format === "ROUND_ROBIN"        && <RoundRobin        {...commonProps} />}
    </div>
  );
}
