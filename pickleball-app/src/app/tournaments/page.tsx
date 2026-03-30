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

  const open   = tournaments.filter((t) => t.status === "REGISTRATION");
  const active = tournaments.filter((t) => t.status === "IN_PROGRESS");
  const done   = tournaments.filter((t) => t.status === "COMPLETED");

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Tournaments</h1>
          <p className="text-gg-muted text-sm mt-1">Browse and join pickleball events</p>
        </div>
        <Link href="/tournaments/new" className="btn-primary">+ New</Link>
      </div>

      {tournaments.length === 0 && (
        <div className="text-center py-24 text-gg-muted">
          <div className="text-5xl mb-4">🏓</div>
          <p>No tournaments yet.</p>
          <Link href="/tournaments/new" className="btn-primary mt-4 inline-block">
            Create the first one
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-gg-yellow animate-pulse" />
            <h2 className="text-sm font-semibold text-gg-yellow uppercase tracking-widest">Live</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((t) => <TournamentCard key={t.id} tournament={t as never} />)}
          </div>
        </section>
      )}

      {open.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-gg-green" />
            <h2 className="text-sm font-semibold text-gg-green uppercase tracking-widest">Open Registration</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {open.map((t) => <TournamentCard key={t.id} tournament={t as never} />)}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-gg-muted" />
            <h2 className="text-sm font-semibold text-gg-muted uppercase tracking-widest">Completed</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {done.map((t) => <TournamentCard key={t.id} tournament={t as never} />)}
          </div>
        </section>
      )}
    </div>
  );
}
