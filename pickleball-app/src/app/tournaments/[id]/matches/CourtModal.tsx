"use client";
import { useState } from "react";

interface Props {
  matchId: string;
  current: number | null;
  onClose: () => void;
  onSave: () => void;
}

export default function CourtModal({ matchId, current, onClose, onSave }: Props) {
  const [court, setCourt] = useState(current?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(`/api/matches/${matchId}/court`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courtNumber: court ? Number(court) : null }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Failed");
      return;
    }
    onSave();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gg-card border border-gg-border rounded-2xl w-full max-w-xs p-6 shadow-2xl">
        <h2 className="text-lg font-bold mb-4">Assign Court</h2>
        {error && (
          <div className="bg-gg-error-dim border border-gg-error/30 rounded-xl p-3 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Court Number</label>
            <input
              type="number"
              min={1}
              max={99}
              className="input text-center text-2xl font-bold"
              placeholder="—"
              value={court}
              onChange={(e) => setCourt(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? "Saving…" : "Assign"}
            </button>
          </div>
          {current && (
            <button
              type="button"
              className="w-full text-xs text-gg-muted hover:text-red-400 transition-colors"
              onClick={async () => {
                await fetch(`/api/matches/${matchId}/court`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ courtNumber: null }),
                });
                onSave();
              }}
            >
              Remove court assignment
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
