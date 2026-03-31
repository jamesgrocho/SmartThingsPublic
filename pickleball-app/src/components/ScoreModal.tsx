"use client";
import { useState, useEffect } from "react";

interface GameScore { p1: number; p2: number }

interface HistoryEntry {
  id: string;
  reporterName: string;
  reporterType: string;
  action: string;
  scoreData: string;
  createdAt: string;
}

interface MatchData {
  id: string;
  tournamentId: string;
  player1Id: string | null;
  player2Id: string | null;
  game1P1: number | null; game1P2: number | null;
  game2P1: number | null; game2P2: number | null;
  game3P1: number | null; game3P2: number | null;
  game4P1: number | null; game4P2: number | null;
  game5P1: number | null; game5P2: number | null;
  winnerId: string | null;
  completedAt: string | null;
  scoreHistory: HistoryEntry[];
}

interface Props {
  match: MatchData;
  p1Name: string;
  p2Name: string;
  isAdmin: boolean;
  onClose: () => void;
  onSubmit: (matchId: string, games: GameScore[], reporterName: string) => Promise<void>;
}

function getLocalIdentityKey(tournamentId: string) {
  return `pickleball_identity_${tournamentId}`;
}

function loadIdentity(tournamentId: string): { playerId: string; name: string } | null {
  try {
    const raw = localStorage.getItem(getLocalIdentityKey(tournamentId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveIdentity(tournamentId: string, playerId: string, name: string) {
  localStorage.setItem(getLocalIdentityKey(tournamentId), JSON.stringify({ playerId, name }));
}

function getInitialGames(match: MatchData): GameScore[] {
  const games: GameScore[] = [];
  for (let i = 1; i <= 5; i++) {
    const p1 = ((match as unknown) as Record<string, number | null>)[`game${i}P1`];
    const p2 = ((match as unknown) as Record<string, number | null>)[`game${i}P2`];
    if (p1 != null && p2 != null) games.push({ p1, p2 });
  }
  return games.length > 0 ? games : [{ p1: 0, p2: 0 }];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export default function ScoreModal({ match, p1Name, p2Name, isAdmin, onClose, onSubmit }: Props) {
  const [step, setStep] = useState<"identity" | "score">("score");
  const [identity, setIdentity] = useState<{ playerId: string; name: string } | null>(null);
  const [games, setGames] = useState<GameScore[]>(getInitialGames(match));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      setStep("score");
      return;
    }
    const saved = loadIdentity(match.tournamentId);
    if (saved) {
      setIdentity(saved);
      setStep("score");
    } else {
      setStep("identity");
    }
  }, [isAdmin, match.tournamentId]);

  function selectIdentity(playerId: string, name: string) {
    saveIdentity(match.tournamentId, playerId, name);
    setIdentity({ playerId, name });
    setStep("score");
  }

  function updateGame(i: number, field: "p1" | "p2", val: number) {
    setGames((prev) => prev.map((g, idx) => (idx === i ? { ...g, [field]: val } : g)));
  }

  function addGame() {
    if (games.length < 5) setGames((prev) => [...prev, { p1: 0, p2: 0 }]);
  }

  function removeGame(i: number) {
    if (games.length > 1) setGames((prev) => prev.filter((_, idx) => idx !== i));
  }

  function computeWinner(): string | null {
    if (games.length === 0) return null;
    let p1w = 0, p2w = 0;
    for (const g of games) {
      if (g.p1 > g.p2) p1w++;
      else if (g.p2 > g.p1) p2w++;
    }
    if (p1w === p2w) return null;
    return p1w > p2w ? p1Name : p2Name;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    for (const g of games) {
      if (g.p1 === g.p2) {
        setError("A game cannot end in a tie");
        return;
      }
    }

    const reporterName = isAdmin ? "Admin" : (identity?.name ?? "");

    setLoading(true);
    try {
      await onSubmit(match.id, games, reporterName);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  const projectedWinner = computeWinner();
  const isEdit = !!match.completedAt;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl my-4">

        {/* Identity selection step */}
        {step === "identity" && (
          <div className="p-6">
            <h2 className="text-lg font-bold mb-1">Who are you?</h2>
            <p className="text-sm text-gray-400 mb-6">
              Select your name to report the score for this match
            </p>
            <div className="space-y-3">
              {[
                { id: match.player1Id!, name: p1Name },
                { id: match.player2Id!, name: p2Name },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectIdentity(p.id, p.name)}
                  className="w-full text-left p-4 rounded-lg border border-gray-700 hover:border-pickle-500 hover:bg-pickle-500/10 transition-all"
                >
                  <div className="font-medium">{p.name}</div>
                </button>
              ))}
              <button
                onClick={onClose}
                className="w-full text-center text-sm text-gray-500 hover:text-gray-300 py-2"
              >
                Just viewing — close
              </button>
            </div>
          </div>
        )}

        {/* Score entry step */}
        {step === "score" && (
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">{p1Name} vs {p2Name}</h2>
                <p className="text-sm text-gray-400">
                  {isEdit ? "Edit score" : "Report score"}
                  {!isAdmin && identity && (
                    <span className="ml-2 text-gray-500">
                      — reporting as <span className="text-gray-300">{identity.name}</span>
                      <button
                        onClick={() => { setStep("identity"); setIdentity(null); }}
                        className="ml-1 text-pickle-400 hover:text-pickle-300 text-xs underline"
                      >
                        change
                      </button>
                    </span>
                  )}
                </p>
              </div>
              <button onClick={onClose} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Game scores */}
              <div className="space-y-2 mb-4">
                <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-2 items-center text-xs text-gray-500 mb-1 px-1">
                  <span className="w-12" />
                  <span className="text-center">{p1Name.split(" ")[0]}</span>
                  <span />
                  <span className="text-center">{p2Name.split(" ")[0]}</span>
                  <span className="w-6" />
                </div>

                {games.map((g, i) => (
                  <div key={i} className="grid grid-cols-[auto_1fr_auto_1fr_auto] gap-2 items-center">
                    <span className="text-xs text-gray-500 w-12">Game {i + 1}</span>
                    <input
                      type="number" min={0} max={99}
                      className={`input text-center font-bold ${g.p1 > g.p2 ? "border-pickle-500 bg-pickle-500/10" : ""}`}
                      value={g.p1}
                      onChange={(e) => updateGame(i, "p1", Number(e.target.value))}
                      required
                    />
                    <span className="text-gray-500 text-center">–</span>
                    <input
                      type="number" min={0} max={99}
                      className={`input text-center font-bold ${g.p2 > g.p1 ? "border-pickle-500 bg-pickle-500/10" : ""}`}
                      value={g.p2}
                      onChange={(e) => updateGame(i, "p2", Number(e.target.value))}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeGame(i)}
                      className="w-6 text-gray-600 hover:text-red-400 text-lg leading-none"
                      disabled={games.length === 1}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {games.length < 5 && (
                <button type="button" onClick={addGame}
                  className="text-sm text-pickle-400 hover:text-pickle-300 mb-4">
                  + Add Game {games.length + 1}
                </button>
              )}

              {projectedWinner && (
                <div className="bg-pickle-500/10 border border-pickle-500/20 rounded-lg p-3 text-sm text-pickle-300 mb-4 text-center">
                  🏆 {projectedWinner} wins
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={loading || !projectedWinner}>
                  {loading ? "Saving…" : isEdit ? "Update Score" : "Submit Score"}
                </button>
              </div>
            </form>

            {/* Score history */}
            {match.scoreHistory.length > 0 && (
              <div className="mt-6 border-t border-gray-800 pt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Score History
                </h3>
                <div className="space-y-2">
                  {match.scoreHistory.map((h) => {
                    let gamesArr: GameScore[] = [];
                    try { gamesArr = JSON.parse(h.scoreData); } catch { /* ignore */ }
                    return (
                      <div key={h.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            h.reporterType === "admin"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}>
                            {h.reporterType}
                          </span>
                          <span className="font-medium text-gray-200">{h.reporterName}</span>
                          <span className="text-gray-500">{h.action}</span>
                          <span className="text-gray-600 text-xs ml-auto">{formatTime(h.createdAt)}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 ml-1">
                          {gamesArr.map((g, i) => `${g.p1}–${g.p2}`).join(", ")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
