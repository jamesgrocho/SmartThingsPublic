import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TournamentCard from "@/components/TournamentCard";

export const dynamic = "force-dynamic";

export default async function TournamentsPage() {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { players: true, matches: true } },
    },
  });

  const open = tournaments.filter((t) => t.status === "REGISTRATION");
  const active = tournaments.filter((t) => t.status === "IN_PROGRESS");
  const done = tournaments.filter((t) => t.status === "COMPLETED");

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tournaments</h1>
          <p className="text-gray-400 mt-1">Browse and join pickleball events</p>
        </div>
        <Link href="/tournaments/new" className="btn-primary">
          + New Tournament
        </Link>
      </div>

      {tournaments.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">🏓</div>
          <p className="text-lg">No tournaments yet.</p>
          <Link href="/tournaments/new" className="btn-primary mt-4 inline-block">
            Create the first one
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            In Progress
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((t) => (
              <TournamentCard key={t.id} tournament={t as never} />
            ))}
          </div>
        </section>
      )}

      {open.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-pickle-400 mb-4">
            Open Registration
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {open.map((t) => (
              <TournamentCard key={t.id} tournament={t as never} />
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-500 mb-4">Completed</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {done.map((t) => (
              <TournamentCard key={t.id} tournament={t as never} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
