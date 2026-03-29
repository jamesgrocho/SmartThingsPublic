import Link from "next/link";
import { prisma } from "@/lib/prisma";
import TournamentCard from "@/components/TournamentCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const recent = await prisma.tournament.findMany({
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      _count: { select: { players: true, matches: true } },
    },
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-pickle-900/20 to-gray-950 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-pickle-500/10 border border-pickle-500/20 rounded-full px-4 py-1.5 text-pickle-400 text-sm font-medium mb-6">
            🏓 Pickleball Tournament Platform
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Run your{" "}
            <span className="text-pickle-400">Pickleball</span>
            <br />
            tournaments online
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Create brackets, register players, and let everyone report their own
            scores in real time — single elimination, double elimination, or
            round robin.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/tournaments/new" className="btn-primary text-lg px-8 py-3">
              Create Tournament
            </Link>
            <Link href="/tournaments" className="btn-secondary text-lg px-8 py-3">
              Browse Tournaments
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 border-t border-gray-800">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10 text-gray-200">
            Everything you need to run a great event
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "🏆",
                title: "3 Bracket Formats",
                desc: "Single elimination, double elimination, and round robin — pick what fits your event.",
              },
              {
                icon: "📊",
                title: "Live Score Reporting",
                desc: "Players log in and submit their own match results. Brackets update instantly.",
              },
              {
                icon: "👥",
                title: "Player Registration",
                desc: "Open registration lets players join and claim their spot with just an account.",
              },
            ].map((f) => (
              <div key={f.title} className="card text-center">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent tournaments */}
      {recent.length > 0 && (
        <section className="py-12 px-6 border-t border-gray-800">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-200">Recent Tournaments</h2>
              <Link href="/tournaments" className="text-pickle-400 hover:text-pickle-300 text-sm">
                View all →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recent.map((t) => (
                <TournamentCard key={t.id} tournament={t as never} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
