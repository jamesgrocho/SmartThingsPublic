"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  tournamentId: string;
  status: string;
  playerCount: number;
}

export default function TournamentActions({ tournamentId, status, playerCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (status !== "REGISTRATION") return null;

  async function start() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/start`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to start");
        return;
      }
      router.push(`/tournaments/${tournamentId}/bracket`);
      router.refresh();
    } catch (e) {
      setError(`Network error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      <button
        onClick={start}
        className="btn-primary w-full"
        disabled={loading || playerCount < 2}
        title={playerCount < 2 ? "Add at least 2 players first" : ""}
      >
        {loading ? "Starting…" : "🚀 Start Tournament"}
      </button>
      {playerCount < 2 && (
        <p className="text-xs text-gray-500 text-center">Add at least 2 players to start</p>
      )}
    </div>
  );
}
