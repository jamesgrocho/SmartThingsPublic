import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import TournamentActions from "./TournamentActions";

export const dynamic = "force-dynamic";

const FORMAT_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: "Single Elimination",
  DOUBLE_ELIMINATION: "Double Elimination",
  ROUND_ROBIN: "Round Robin",
};

const STATUS_BADGE: Record<string, string> = {
  REGISTRATION: "bg-pickle-500/20 text-pickle-400 border-pickle-500/30",
  IN_PROGRESS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  COMPLETED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default async function TournamentPage({
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
      createdBy: { select: { id: true, name: true, email: true } },
      players: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!tournament) notFound();

  const isOrganizer = userId === tournament.createdById;
  const isPlayer = tournament.players.some((p) => p.userId === userId);
  const isFull = tournament.players.length >= tournament.maxPlayers;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                  STATUS_BADGE[tournament.status]
                }`}
              >
                {tournament.status.replace("_", " ")}
              </span>
              <span className="text-sm text-gray-500">
                {FORMAT_LABELS[tournament.format]}
              </span>
            </div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            {tournament.description && (
              <p className="text-gray-400 mt-2">{tournament.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Organized by{" "}
              <span className="text-gray-300">{tournament.createdBy.name}</span>
            </p>
          </div>

          {tournament.status !== "REGISTRATION" && (
            <Link
              href={`/tournaments/${id}/bracket`}
              className="btn-primary"
            >
              View Bracket →
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Players", value: `${tournament.players.length} / ${tournament.maxPlayers}` },
          { label: "Format", value: FORMAT_LABELS[tournament.format] },
          { label: "Status", value: tournament.status.replace("_", " ") },
        ].map((s) => (
          <div key={s.label} className="card text-center py-4">
            <div className="text-2xl font-bold text-pickle-400">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Actions (client component) */}
      <TournamentActions
        tournamentId={id}
        status={tournament.status}
        isOrganizer={isOrganizer}
        isPlayer={isPlayer}
        isFull={isFull}
        playerCount={tournament.players.length}
        userId={userId}
      />

      {/* Player list */}
      <div className="card mt-8">
        <h2 className="font-semibold text-gray-200 mb-4">
          Players ({tournament.players.length})
        </h2>
        {tournament.players.length === 0 ? (
          <p className="text-gray-500 text-sm">No players yet — be the first to register!</p>
        ) : (
          <ul className="divide-y divide-gray-800">
            {tournament.players.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="w-6 text-center text-sm text-gray-500">
                  {i + 1}
                </span>
                <div className="w-8 h-8 bg-pickle-500/20 rounded-full flex items-center justify-center text-pickle-400 text-sm font-semibold">
                  {p.user.name[0].toUpperCase()}
                </div>
                <span className="font-medium">{p.user.name}</span>
                {p.userId === tournament.createdById && (
                  <span className="text-xs text-gray-500 ml-auto">organizer</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
