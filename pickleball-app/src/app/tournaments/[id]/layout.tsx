import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth, getSessionUser } from "@/lib/auth";
import TournamentTabs from "@/components/TournamentTabs";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FORMAT_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: "Single Elimination",
  DOUBLE_ELIMINATION: "Double Elimination",
  ROUND_ROBIN:        "Round Robin",
};

const STATUS_BADGE: Record<string, string> = {
  REGISTRATION: "badge-green",
  IN_PROGRESS:  "badge-yellow",
  COMPLETED:    "badge-gray",
};

export default async function TournamentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const sessionUser = getSessionUser(session as { user?: unknown });
  const isAdmin = sessionUser?.isAdmin ?? false;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { id: true, name: true, format: true, status: true, createdById: true },
  });

  if (!tournament) notFound();

  return (
    <div>
      {/* Tournament header */}
      <div className="border-b border-gg-border bg-gg-card/40">
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-0">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={STATUS_BADGE[tournament.status]}>
                  {tournament.status === "REGISTRATION" && "● Open"}
                  {tournament.status === "IN_PROGRESS"  && "● Live"}
                  {tournament.status === "COMPLETED"    && "✓ Completed"}
                </span>
                <span className="text-gg-muted text-xs">{FORMAT_LABELS[tournament.format]}</span>
              </div>
              <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
            </div>
            <div className="flex gap-2">
              {isAdmin && tournament.status !== "REGISTRATION" && (
                <a href={`/api/tournaments/${id}/export`} download className="btn-secondary text-xs py-1.5">
                  Export DUPR
                </a>
              )}
              <Link href="/tournaments" className="btn-ghost text-xs">← All tournaments</Link>
            </div>
          </div>
          <TournamentTabs id={id} status={tournament.status} />
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}
