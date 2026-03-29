"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Props {
  tournamentId: string;
  status: string;
  isOrganizer: boolean;
  isPlayer: boolean;
  isFull: boolean;
  playerCount: number;
  userId: string | null;
}

export default function TournamentActions({
  tournamentId,
  status,
  isOrganizer,
  isPlayer,
  isFull,
  playerCount,
  userId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function join() {
    if (!userId) { router.push("/login"); return; }
    setLoading(true); setError("");
    const res = await fetch(`/api/tournaments/${tournamentId}/join`, { method: "POST" });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to join"); return; }
    router.refresh();
  }

  async function leave() {
    setLoading(true); setError("");
    const res = await fetch(`/api/tournaments/${tournamentId}/join`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to leave"); return; }
    router.refresh();
  }

  async function start() {
    setLoading(true); setError("");
    const res = await fetch(`/api/tournaments/${tournamentId}/start`, { method: "POST" });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Failed to start"); return; }
    router.push(`/tournaments/${tournamentId}/bracket`);
  }

  if (status !== "REGISTRATION") return null;

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {!userId && (
          <Link href="/login" className="btn-primary">
            Sign in to join
          </Link>
        )}
        {userId && !isPlayer && !isFull && (
          <button onClick={join} className="btn-primary" disabled={loading}>
            {loading ? "Joining…" : "Join Tournament"}
          </button>
        )}
        {userId && isPlayer && !isOrganizer && (
          <button onClick={leave} className="btn-secondary" disabled={loading}>
            {loading ? "Leaving…" : "Leave Tournament"}
          </button>
        )}
        {isOrganizer && (
          <button
            onClick={start}
            className="btn-primary"
            disabled={loading || playerCount < 2}
            title={playerCount < 2 ? "Need at least 2 players" : ""}
          >
            {loading ? "Starting…" : "Start Tournament"}
          </button>
        )}
        {isFull && !isPlayer && (
          <span className="text-sm text-gray-400 py-2">Tournament is full</span>
        )}
      </div>
    </div>
  );
}
