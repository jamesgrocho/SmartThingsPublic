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
      <section className="py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="text-6xl mb-6">🏓</div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-5">
            Run your pickleball
            <br />
            <span className="text-gg-green">tournaments online</span>
          </h1>
          <p className="text-gg-muted text-lg max-w-xl mx-auto mb-10">
            Create brackets, add players, assign courts, and let everyone report
            scores in real time — single elimination, double elimination, or round robin.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/tournaments/new" className="btn-primary text-base px-8 py-3">
              Create Tournament
            </Link>
            <Link href="/tournaments" className="btn-secondary text-base px-8 py-3">
              Browse Tournaments
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-14 px-6 border-t border-gg-border">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: "⚡", title: "3 Bracket Formats", desc: "Single elim, double elim, and round robin. Pick what fits your event." },
              { icon: "🎾", title: "Court Assignment", desc: "Assign court numbers to matches. Players always know where to go." },
              { icon: "📊", title: "Live Score Reporting", desc: "Players scan a QR code and submit scores directly from their phone." },
              { icon: "✅", title: "Player Check-In", desc: "Mark players as checked in. No-shows are easy to spot." },
              { icon: "📤", title: "DUPR Export", desc: "One-click CSV export in the exact format DUPR requires for upload." },
              { icon: "🔗", title: "Score History", desc: "Every score edit is logged — who reported it and when." },
            ].map((f) => (
              <div key={f.title} className="card-sm">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white mb-1">{f.title}</h3>
                <p className="text-gg-muted text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent tournaments */}
      {recent.length > 0 && (
        <section className="py-12 px-6 border-t border-gg-border">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-white">Recent Tournaments</h2>
              <Link href="/tournaments" className="text-gg-green hover:text-green-400 text-sm">
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
