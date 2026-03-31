"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  duprId: string | null;
  checkedIn: boolean;
}

interface Props {
  tournamentId: string;
  players: Player[];
  status: string;
  isAdmin: boolean;
}

export default function PlayersTab({ tournamentId, players: initial, status, isAdmin }: Props) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>(initial);
  const [loading, setLoading] = useState<string | null>(null);

  const checkedIn = players.filter((p) => p.checkedIn).length;

  async function toggleCheckIn(player: Player) {
    setLoading(player.id);
    const res = await fetch(`/api/tournaments/${tournamentId}/players/${player.id}/checkin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkedIn: !player.checkedIn }),
    });
    setLoading(null);
    if (!res.ok) return;
    setPlayers((prev) =>
      prev.map((p) => (p.id === player.id ? { ...p, checkedIn: !p.checkedIn } : p))
    );
    router.refresh();
  }

  async function checkInAll() {
    const res = await fetch(`/api/tournaments/${tournamentId}/players/checkin-all`, {
      method: "PATCH",
    });
    if (!res.ok) return;
    setPlayers((prev) => prev.map((p) => ({ ...p, checkedIn: true })));
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      {/* Header stats */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-white">
            {players.length} Players
          </h2>
          <p className="text-sm text-gg-muted mt-0.5">
            {checkedIn} checked in · {players.length - checkedIn} pending
          </p>
        </div>
        {isAdmin && status === "IN_PROGRESS" && players.some((p) => !p.checkedIn) && (
          <button onClick={checkInAll} className="btn-secondary text-xs">
            Check in all
          </button>
        )}
      </div>

      {/* Progress bar */}
      {status !== "REGISTRATION" && (
        <div className="mb-5">
          <div className="w-full bg-gg-card-2 rounded-full h-1.5">
            <div
              className="bg-gg-green h-1.5 rounded-full transition-all"
              style={{ width: `${players.length > 0 ? (checkedIn / players.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Player list */}
      <div className="card divide-y divide-gg-border p-0 overflow-hidden">
        {players.length === 0 ? (
          <p className="text-gg-muted text-sm p-5">No players added yet.</p>
        ) : (
          players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 text-xs text-gg-muted text-right flex-none">{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-gg-green/10 border border-gg-green/20 flex items-center justify-center text-gg-green text-sm font-bold flex-none">
                {p.firstName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">
                  {p.firstName} {p.lastName}
                </div>
                {p.duprId && (
                  <div className="text-xs text-gg-muted font-mono">{p.duprId}</div>
                )}
              </div>

              {/* Check-in toggle (admin, live tournament) */}
              {isAdmin && status !== "REGISTRATION" ? (
                <button
                  onClick={() => toggleCheckIn(p)}
                  disabled={loading === p.id}
                  className={`flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    p.checkedIn
                      ? "bg-gg-green/20 text-gg-green border border-gg-green/30 hover:bg-gg-error-dim hover:text-red-400 hover:border-red-500/30"
                      : "bg-gg-card-2 text-gg-muted border border-gg-border hover:border-gg-green hover:text-gg-green"
                  }`}
                >
                  {loading === p.id ? "…" : p.checkedIn ? "✓ Checked in" : "Check in"}
                </button>
              ) : (
                p.checkedIn && <span className="badge-green flex-none">✓ In</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
