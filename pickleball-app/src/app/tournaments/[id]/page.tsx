import { notFound } from "next/navigation";
import Image from "next/image";
import QRCode from "qrcode";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth, getSessionUser } from "@/lib/auth";
import TournamentActions from "./TournamentActions";
import PlayerManager from "./PlayerManager";
import CopyButton from "./CopyButton";

export const dynamic = "force-dynamic";

export default async function TournamentOverviewPage({
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
      createdBy: { select: { id: true, name: true } },
      players: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!tournament) notFound();

  // QR code
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const bracketUrl = `${protocol}://${host}/tournaments/${id}/matches`;

  let qrDataUrl = "";
  try {
    qrDataUrl = await QRCode.toDataURL(bracketUrl, {
      width: 200, margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
  } catch { /* non-fatal */ }

  const checkedIn = tournament.players.filter((p) => p.checkedIn).length;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left column */}
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Players", value: `${tournament.players.length}/${tournament.maxPlayers}` },
            { label: "Checked In", value: `${checkedIn}/${tournament.players.length}` },
            { label: "Match Type", value: tournament.matchType === "S" ? "Singles" : "Doubles" },
          ].map((s) => (
            <div key={s.label} className="card-sm text-center py-4">
              <div className="text-lg font-bold text-gg-green">{s.value}</div>
              <div className="text-xs text-gg-muted mt-1 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Player management (admin) or read-only list */}
        {isAdmin && tournament.status === "REGISTRATION" ? (
          <PlayerManager
            tournamentId={id}
            players={tournament.players}
            maxPlayers={tournament.maxPlayers}
          />
        ) : (
          <div className="card">
            <h2 className="font-semibold text-white mb-4">
              Players ({tournament.players.length})
            </h2>
            {tournament.players.length === 0 ? (
              <p className="text-gg-muted text-sm">No players registered yet.</p>
            ) : (
              <ul className="divide-y divide-gg-border">
                {tournament.players.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-5 text-xs text-gg-muted text-right">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-gg-green/20 flex items-center justify-center text-gg-green text-xs font-bold">
                      {p.firstName[0]}
                    </div>
                    <span className="text-sm font-medium flex-1">{p.firstName} {p.lastName}</span>
                    {p.checkedIn && <span className="badge-green text-xs">✓ In</span>}
                    {p.duprId && <span className="text-xs text-gg-muted font-mono">{p.duprId}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Start tournament (admin) */}
        {isAdmin && (
          <TournamentActions
            tournamentId={id}
            status={tournament.status}
            playerCount={tournament.players.length}
          />
        )}
      </div>

      {/* Right column — QR code */}
      <div className="card flex flex-col items-center text-center">
        <h2 className="font-semibold text-white mb-1">Share with Players</h2>
        <p className="text-sm text-gg-muted mb-5">
          Players scan this to view matches and report scores
        </p>

        {qrDataUrl ? (
          <div className="bg-white p-3 rounded-2xl inline-block mb-4">
            <Image src={qrDataUrl} alt="QR Code" width={200} height={200} />
          </div>
        ) : (
          <div className="w-[200px] h-[200px] bg-gg-card-2 rounded-2xl mb-4 flex items-center justify-center text-gg-muted text-sm">
            QR unavailable
          </div>
        )}

        <p className="text-xs text-gg-muted font-mono break-all mb-4 max-w-[280px]">
          {bracketUrl}
        </p>

        <div className="flex gap-2">
          {qrDataUrl && (
            <a href={qrDataUrl} download={`${tournament.name}-qr.png`}
              className="btn-secondary text-xs py-1.5">
              Download QR
            </a>
          )}
          <CopyButton text={bracketUrl} />

        </div>
      </div>
    </div>
  );
}

