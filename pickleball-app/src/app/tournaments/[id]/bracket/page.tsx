import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import SingleElimination from "@/components/brackets/SingleElimination";
import DoubleElimination from "@/components/brackets/DoubleElimination";
import RoundRobin from "@/components/brackets/RoundRobin";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FORMAT_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: "Single Elimination",
  DOUBLE_ELIMINATION: "Double Elimination",
  ROUND_ROBIN: "Round Robin",
};

export default async function BracketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user
    ? (session.user as { id: string } & typeof session.user).id
    : null;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      players: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      matches: {
        orderBy: [{ bracket: "asc" }, { round: "asc" }, { position: "asc" }],
      },
    },
  });

  if (!tournament) notFound();
  if (tournament.status === "REGISTRATION") {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="text-gray-400 mb-4">Tournament hasn&apos;t started yet.</p>
        <Link href={`/tournaments/${id}`} className="btn-secondary">
          ← Back
        </Link>
      </div>
    );
  }

  const playerMap = Object.fromEntries(
    tournament.players.map((p) => [p.userId, p.user.name])
  );

  return (
    <div className="px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <Link
              href={`/tournaments/${id}`}
              className="text-sm text-gray-500 hover:text-gray-300 mb-1 block"
            >
              ← {tournament.name}
            </Link>
            <h1 className="text-2xl font-bold">
              {FORMAT_LABELS[tournament.format]} Bracket
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {tournament.status === "COMPLETED"
                ? "Tournament completed"
                : "Live — click any match to report scores"}
            </p>
          </div>
          <div className="flex gap-2 text-sm">
            <span className="flex items-center gap-1 text-gray-400">
              <span className="w-3 h-3 rounded-sm bg-pickle-500 inline-block" /> Winner
            </span>
            <span className="flex items-center gap-1 text-gray-400">
              <span className="w-3 h-3 rounded-sm bg-gray-700 inline-block" /> TBD
            </span>
          </div>
        </div>

        {/* Bracket */}
        {tournament.format === "SINGLE_ELIMINATION" && (
          <SingleElimination
            matches={tournament.matches as never}
            playerMap={playerMap}
            userId={userId}
            tournamentId={id}
          />
        )}
        {tournament.format === "DOUBLE_ELIMINATION" && (
          <DoubleElimination
            matches={tournament.matches as never}
            playerMap={playerMap}
            userId={userId}
            tournamentId={id}
          />
        )}
        {tournament.format === "ROUND_ROBIN" && (
          <RoundRobin
            matches={tournament.matches as never}
            playerMap={playerMap}
            userId={userId}
            tournamentId={id}
          />
        )}
      </div>
    </div>
  );
}
