"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  duprId: string | null;
}

interface Props {
  tournamentId: string;
  players: Player[];
  maxPlayers: number;
}

export default function PlayerManager({ tournamentId, players: initial, maxPlayers }: Props) {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>(initial);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [duprId, setDuprId] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdding(true);
    const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, duprId }),
    });
    setAdding(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Failed to add player");
      return;
    }
    const player = await res.json();
    setPlayers((prev) => [...prev, player]);
    setFirstName("");
    setLastName("");
    setDuprId("");
    router.refresh();
  }

  async function removePlayer(playerId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Failed to remove");
      return;
    }
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    router.refresh();
  }

  const isFull = players.length >= maxPlayers;

  return (
    <div className="card">
      <h2 className="font-semibold text-gray-200 mb-4">
        Players ({players.length} / {maxPlayers})
      </h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-3">
          {error}
        </div>
      )}

      {/* Add player form */}
      {!isFull && (
        <form onSubmit={addPlayer} className="mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input text-sm"
              placeholder="First name *"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <input
              className="input text-sm"
              placeholder="Last name *"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <input
            className="input text-sm font-mono"
            placeholder="DUPR ID (optional)"
            value={duprId}
            onChange={(e) => setDuprId(e.target.value)}
          />
          <button type="submit" className="btn-primary text-sm w-full" disabled={adding}>
            {adding ? "Adding…" : "+ Add Player"}
          </button>
        </form>
      )}

      {/* Player list */}
      {players.length === 0 ? (
        <p className="text-gray-500 text-sm">No players yet. Add the first one above.</p>
      ) : (
        <ul className="divide-y divide-gray-800">
          {players.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <span className="w-6 text-center text-sm text-gray-500">{i + 1}</span>
              <div className="w-8 h-8 bg-pickle-500/20 rounded-full flex items-center justify-center text-pickle-400 text-sm font-semibold">
                {p.firstName[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">
                  {p.firstName} {p.lastName}
                </div>
                {p.duprId && (
                  <div className="text-xs text-gray-500 font-mono">{p.duprId}</div>
                )}
              </div>
              <button
                onClick={() => removePlayer(p.id)}
                className="text-gray-500 hover:text-red-400 text-lg leading-none transition-colors"
                title="Remove player"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
