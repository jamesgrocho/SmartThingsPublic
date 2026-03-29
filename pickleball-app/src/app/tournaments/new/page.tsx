"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const FORMATS = [
  {
    value: "SINGLE_ELIMINATION",
    label: "Single Elimination",
    icon: "⚡",
    desc: "Lose once and you're out. Fast and decisive.",
  },
  {
    value: "DOUBLE_ELIMINATION",
    label: "Double Elimination",
    icon: "🔄",
    desc: "Two losses to be eliminated. More second chances.",
  },
  {
    value: "ROUND_ROBIN",
    label: "Round Robin",
    icon: "🔃",
    desc: "Everyone plays everyone. Best overall record wins.",
  },
];

export default function NewTournamentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState("SINGLE_ELIMINATION");
  const [maxPlayers, setMaxPlayers] = useState(16);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (status === "loading") return null;
  if (!session) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <p className="text-gray-400 mb-4">You must be logged in to create a tournament.</p>
        <Link href="/login" className="btn-primary">Sign in</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, format, maxPlayers }),
    });

    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create tournament");
      return;
    }

    const tournament = await res.json();
    router.push(`/tournaments/${tournament.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">New Tournament</h1>
        <p className="text-gray-400 mt-1">Set up your pickleball event</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-200">Basic Info</h2>

          <div>
            <label className="label">Tournament Name *</label>
            <input
              className="input"
              placeholder="e.g. Spring Smash Classic"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Optional details about the event…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Max Players</label>
            <select
              className="input"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
            >
              {[4, 8, 16, 32, 64].map((n) => (
                <option key={n} value={n}>{n} players</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-200">Format</h2>
          <div className="space-y-3">
            {FORMATS.map((f) => (
              <label
                key={f.value}
                className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  format === f.value
                    ? "border-pickle-500 bg-pickle-500/10"
                    : "border-gray-700 hover:border-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={f.value}
                  checked={format === f.value}
                  onChange={() => setFormat(f.value)}
                  className="mt-0.5 accent-pickle-500"
                />
                <div>
                  <div className="font-medium">
                    {f.icon} {f.label}
                  </div>
                  <div className="text-sm text-gray-400 mt-0.5">{f.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating…" : "Create Tournament"}
          </button>
          <Link href="/tournaments" className="btn-secondary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
