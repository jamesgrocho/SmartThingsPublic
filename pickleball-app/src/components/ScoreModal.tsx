"use client";
import { useState } from "react";

interface Match {
  id: string;
  player1Id: string | null;
  player2Id: string | null;
  player1Score: number | null;
  player2Score: number | null;
  winnerId: string | null;
  completedAt: string | null;
}

interface Props {
  match: Match;
  player1Name: string;
  player2Name: string;
  onClose: () => void;
  onSubmit: (matchId: string, s1: number, s2: number) => Promise<void>;
  canReport: boolean;
}

export default function ScoreModal({
  match,
  player1Name,
  player2Name,
  onClose,
  onSubmit,
  canReport,
}: Props) {
  const [s1, setS1] = useState(match.player1Score ?? 0);
  const [s2, setS2] = useState(match.player2Score ?? 0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const completed = !!match.completedAt;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (s1 === s2) { setError("Scores cannot be tied"); return; }
    setError(""); setLoading(true);
    try {
      await onSubmit(match.id, s1, s2);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit score");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6">
          <h2 className="text-lg font-bold mb-1">Match Score</h2>
          <p className="text-sm text-gray-400 mb-6">
            {completed ? "Final result" : "Report the result of this match"}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
              {/* Player 1 */}
              <div className="text-center">
                <div
                  className={`text-sm font-medium mb-2 ${
                    match.winnerId === match.player1Id
                      ? "text-pickle-400"
                      : "text-gray-300"
                  }`}
                >
                  {player1Name}
                  {match.winnerId === match.player1Id && " 🏆"}
                </div>
                <input
                  type="number"
                  min={0}
                  max={99}
                  className="input text-center text-2xl font-bold h-16"
                  value={s1}
                  onChange={(e) => setS1(Number(e.target.value))}
                  disabled={completed || !canReport}
                  required
                />
              </div>

              <span className="text-gray-500 font-bold text-lg">vs</span>

              {/* Player 2 */}
              <div className="text-center">
                <div
                  className={`text-sm font-medium mb-2 ${
                    match.winnerId === match.player2Id
                      ? "text-pickle-400"
                      : "text-gray-300"
                  }`}
                >
                  {player2Name}
                  {match.winnerId === match.player2Id && " 🏆"}
                </div>
                <input
                  type="number"
                  min={0}
                  max={99}
                  className="input text-center text-2xl font-bold h-16"
                  value={s2}
                  onChange={(e) => setS2(Number(e.target.value))}
                  disabled={completed || !canReport}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                {completed ? "Close" : "Cancel"}
              </button>
              {!completed && canReport && (
                <button type="submit" className="btn-primary flex-1" disabled={loading}>
                  {loading ? "Saving…" : "Submit Score"}
                </button>
              )}
              {!completed && !canReport && (
                <div className="flex-1 text-center text-sm text-gray-500 py-2">
                  Only a participant can report
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
