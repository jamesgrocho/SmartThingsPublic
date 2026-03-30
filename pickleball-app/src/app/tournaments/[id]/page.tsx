import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth, getSessionUser } from "@/lib/auth";
import TournamentActions from "./TournamentActions";
import PlayerManager from "./PlayerManager";

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
  const sessionUser = getSessionUser(session as { user?: unknown });
  const isAdmin = sessionUser?.isAdmin ?? false;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      players: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!tournament) notFound();

  // Generate QR code for the bracket URL
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const bracketUrl = `${protocol}://${host}/tournaments/${id}/bracket`;

  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(bracketUrl, {
      width: 220,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch {
    // QR generation failure is non-fatal
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_BADGE[tournament.status]}`}>
                {tournament.status.replace(/_/g, " ")}
              </span>
              <span className="text-sm text-gray-500">{FORMAT_LABELS[tournament.format]}</span>
            </div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            {tournament.description && (
              <p className="text-gray-400 mt-2">{tournament.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Organized by <span className="text-gray-300">{tournament.createdBy.name}</span>
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            {tournament.status !== "REGISTRATION" && (
              <Link href={`/tournaments/${id}/bracket`} className="btn-primary">
                View Bracket →
              </Link>
            )}
            {isAdmin && tournament.status !== "REGISTRATION" && (
              <a
                href={`/api/tournaments/${id}/export`}
                className="btn-secondary"
                download
              >
                Export DUPR CSV
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Players", value: `${tournament.players.length} / ${tournament.maxPlayers}` },
          { label: "Format", value: FORMAT_LABELS[tournament.format] },
          { label: "Match Type", value: tournament.matchType === "S" ? "Singles" : "Doubles" },
        ].map((s) => (
          <div key={s.label} className="card text-center py-4">
            <div className="text-xl font-bold text-pickle-400">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Left: Player management (admin) or player list (public) */}
        <div>
          {isAdmin && tournament.status === "REGISTRATION" ? (
            <PlayerManager
              tournamentId={id}
              players={tournament.players}
              maxPlayers={tournament.maxPlayers}
            />
          ) : (
            <div className="card">
              <h2 className="font-semibold text-gray-200 mb-4">
                Players ({tournament.players.length})
              </h2>
              {tournament.players.length === 0 ? (
                <p className="text-gray-500 text-sm">No players registered yet.</p>
              ) : (
                <ul className="divide-y divide-gray-800">
                  {tournament.players.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5">
                      <span className="w-6 text-center text-sm text-gray-500">{i + 1}</span>
                      <div className="w-8 h-8 bg-pickle-500/20 rounded-full flex items-center justify-center text-pickle-400 text-sm font-semibold">
                        {p.firstName[0].toUpperCase()}
                      </div>
                      <span className="font-medium">{p.firstName} {p.lastName}</span>
                      {p.duprId && (
                        <span className="ml-auto text-xs text-gray-500 font-mono">{p.duprId}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Admin start button */}
          {isAdmin && (
            <div className="mt-4">
              <TournamentActions
                tournamentId={id}
                status={tournament.status}
                playerCount={tournament.players.length}
              />
            </div>
          )}
        </div>

        {/* Right: QR code */}
        <div className="card flex flex-col items-center text-center">
          <h2 className="font-semibold text-gray-200 mb-1">Share Tournament</h2>
          <p className="text-sm text-gray-400 mb-4">
            Players scan this to view the bracket and enter scores
          </p>

          {qrDataUrl ? (
            <div className="bg-white p-3 rounded-xl inline-block mb-4">
              <Image src={qrDataUrl} alt="Tournament QR Code" width={220} height={220} />
            </div>
          ) : (
            <div className="w-[220px] h-[220px] bg-gray-800 rounded-xl mb-4 flex items-center justify-center text-gray-500 text-sm">
              QR unavailable
            </div>
          )}

          <p className="text-xs text-gray-500 font-mono break-all mb-3">{bracketUrl}</p>

          <div className="flex gap-2">
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`${tournament.name}-qr.png`}
                className="btn-secondary text-sm py-1.5"
              >
                Download QR
              </a>
            )}
            <CopyButton text={bracketUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Small inline client component for the copy button
function CopyButton({ text }: { text: string }) {
  return (
    <button
      className="btn-secondary text-sm py-1.5"
      onClick={() => navigator.clipboard.writeText(text)}
      suppressHydrationWarning
    >
      Copy Link
    </button>
  );
}
