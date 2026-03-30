"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

const FORMATS = [
  { value: "SINGLE_ELIMINATION", label: "Single Elimination", icon: "⚡", desc: "One loss and you're out." },
  { value: "DOUBLE_ELIMINATION", label: "Double Elimination", icon: "🔄", desc: "Two losses to be eliminated." },
  { value: "ROUND_ROBIN",        label: "Round Robin",        icon: "🔃", desc: "Everyone plays everyone." },
];

export default function NewTournamentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [format,      setFormat]      = useState("SINGLE_ELIMINATION");
  const [matchType,   setMatchType]   = useState("S");
  const [scoreType,   setScoreType]   = useState("RALLY");
  const [maxPlayers,  setMaxPlayers]  = useState(16);
  const [error,       setError]       = useState("");
  const [loading,     setLoading]     = useState(false);

  if (status === "loading") return null;
  if (!session || !isAdmin) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <p className="text-gg-muted mb-4">Admin access required.</p>
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
      body: JSON.stringify({ name, description, format, matchType, scoreType, maxPlayers }),
    });
    setLoading(false);
    if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
    const t = await res.json();
    router.push(`/tournaments/${t.id}`);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">New Tournament</h1>
        <p className="text-gg-muted text-sm mt-1">Set up your pickleball event</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-gg-error-dim border border-gg-error/30 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="card space-y-4">
          <h2 className="text-sm font-semibold text-gg-muted uppercase tracking-widest">Details</h2>
          <div>
            <label className="label">Tournament Name *</label>
            <input className="input" placeholder="e.g. Spring Smash Classic"
              value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="Optional…"
              value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Max Players</label>
              <select className="input" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                {[4, 8, 16, 32, 64].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Match Type</label>
              <select className="input" value={matchType} onChange={(e) => setMatchType(e.target.value)}>
                <option value="S">Singles</option>
                <option value="D">Doubles</option>
              </select>
            </div>
            <div>
              <label className="label">Scoring</label>
              <select className="input" value={scoreType} onChange={(e) => setScoreType(e.target.value)}>
                <option value="RALLY">Rally</option>
                <option value="SIDEOUT">Sideout</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="text-sm font-semibold text-gg-muted uppercase tracking-widest">Format</h2>
          {FORMATS.map((f) => (
            <label key={f.value}
              className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                format === f.value
                  ? "border-gg-green bg-gg-green/5"
                  : "border-gg-border hover:border-gg-border-2"
              }`}>
              <input type="radio" name="format" value={f.value} checked={format === f.value}
                onChange={() => setFormat(f.value)} className="mt-0.5 accent-gg-green" />
              <div>
                <div className="text-sm font-medium">{f.icon} {f.label}</div>
                <div className="text-xs text-gg-muted mt-0.5">{f.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="submit" className="btn-primary flex-1 py-3" disabled={loading}>
            {loading ? "Creating…" : "Create Tournament"}
          </button>
          <Link href="/tournaments" className="btn-secondary px-6 py-3">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
