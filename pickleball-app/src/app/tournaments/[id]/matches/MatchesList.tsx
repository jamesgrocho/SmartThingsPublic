"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ScoreModal from "@/components/ScoreModal";
import CourtModal from "./CourtModal";

interface GameScore { p1: number; p2: number }

interface HistoryEntry {
  id: string;
  reporterName: string;
  reporterType: string;
  action: string;
  scoreData: string;
  createdAt: string;
}

export interface MatchRow {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  bracket: string;
  player1Id: string | null;
  player2Id: string | null;
  game1P1: number | null; game1P2: number | null;
  game2P1: number | null; game2P2: number | null;
  game3P1: number | null; game3P2: number | null;
  game4P1: number | null; game4P2: number | null;
  game5P1: number | null; game5P2: number | null;
  winnerId: string | null;
  nextMatchId: string | null;
  courtNumber: number | null;
  status: string;
  completedAt: string | null;
  scoreHistory: HistoryEntry[];
}

interface Props {
  matches: MatchRow[];
  playerMap: Record<string, { name: string; duprId: string | null }>;
  isAdmin: boolean;
  tournamentId: string;
  format: string;
}

function getGames(match: MatchRow): GameScore[] {
  const out: GameScore[] = [];
  for (let i = 1; i <= 5; i++) {
    const p1 = ((match as unknown) as Record<string, number | null>)[`game${i}P1`];
    const p2 = ((match as unknown) as Record<string, number | null>)[`game${i}P2`];
    if (p1 != null && p2 != null) out.push({ p1, p2 });
  }
  return out;
}

function bracketLabel(bracket: string, round: number, format: string): string {
  if (format === "ROUND_ROBIN") return `Round ${round}`;
  if (bracket === "GRAND_FINALS") return "Grand Finals";
  if (bracket === "LOSERS") return `Losers Bracket — Round ${round}`;
  return `Winners — Round ${round}`;
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED:   "badge-gray",
  IN_PROGRESS: "badge-yellow",
  COMPLETED:   "badge-green",
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED:   "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED:   "Completed",
};

export default function MatchesList({ matches, playerMap, isAdmin, tournamentId, format }: Props) {
  const router = useRouter();
  const [scoreMatch, setScoreMatch] = useState<MatchRow | null>(null);
  const [courtMatch, setCourtMatch] = useState<MatchRow | null>(null);

  // Group matches by bracket + round
  const groups: Record<string, MatchRow[]> = {};
  for (const m of matches) {
    const key = `${m.bracket}__${m.round}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }

  // Sort group keys: WINNERS first, LOSERS second, GRAND_FINALS last
  const bracketOrder = { WINNERS: 0, LOSERS: 1, GRAND_FINALS: 2 };
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [bA, rA] = a.split("__");
    const [bB, rB] = b.split("__");
    const bo = (bracketOrder[bA as keyof typeof bracketOrder] ?? 9) -
               (bracketOrder[bB as keyof typeof bracketOrder] ?? 9);
    return bo !== 0 ? bo : Number(rA) - Number(rB);
  });

  async function submitScore(matchId: string, games: GameScore[], reporterName: string) {
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ games, reporterName }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Failed to submit");
    }
    router.refresh();
  }

  // Stats bar
  const total = matches.length;
  const done  = matches.filter((m) => m.completedAt).length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <div className="card-sm">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-white font-medium">{done} / {total} matches completed</span>
          <span className="text-gg-muted">{pct}%</span>
        </div>
        <div className="w-full bg-gg-card-2 rounded-full h-2">
          <div
            className="bg-gg-green h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Match groups */}
      {sortedKeys.map((key) => {
        const [bracket, roundStr] = key.split("__");
        const round = Number(roundStr);
        const groupMatches = groups[key].sort((a, b) => a.position - b.position);

        return (
          <section key={key}>
            <h2 className="text-xs font-semibold text-gg-muted uppercase tracking-widest mb-3">
              {bracketLabel(bracket, round, format)}
            </h2>
            <div className="space-y-3">
              {groupMatches.map((match) => {
                const p1 = match.player1Id ? playerMap[match.player1Id]?.name : null;
                const p2 = match.player2Id ? playerMap[match.player2Id]?.name : null;
                const games = getGames(match);
                const isReady = !!(match.player1Id && match.player2Id);
                const isCompleted = !!match.completedAt;

                return (
                  <div
                    key={match.id}
                    className={`match-card overflow-hidden ${isReady && !isCompleted ? "match-card-clickable" : ""}`}
                    onClick={() => isReady && !isCompleted && setScoreMatch(match)}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      {/* Court badge */}
                      <div className="flex-none">
                        {match.courtNumber ? (
                          <div
                            className="w-12 h-12 rounded-xl bg-gg-green/10 border border-gg-green/30 flex flex-col items-center justify-center cursor-pointer hover:bg-gg-green/20 transition-colors"
                            onClick={(e) => { e.stopPropagation(); if (isAdmin) setCourtMatch(match); }}
                            title={isAdmin ? "Change court" : undefined}
                          >
                            <span className="text-xs text-gg-muted leading-none">Court</span>
                            <span className="text-lg font-bold text-gg-green leading-tight">{match.courtNumber}</span>
                          </div>
                        ) : (
                          <div
                            className={`w-12 h-12 rounded-xl bg-gg-card-2 border border-gg-border flex flex-col items-center justify-center ${isAdmin ? "cursor-pointer hover:border-gg-green/50 transition-colors" : ""}`}
                            onClick={(e) => { e.stopPropagation(); if (isAdmin) setCourtMatch(match); }}
                            title={isAdmin ? "Assign court" : undefined}
                          >
                            <span className="text-xs text-gg-muted">{isAdmin ? "+ Court" : "TBD"}</span>
                          </div>
                        )}
                      </div>

                      {/* Players + score */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          {/* Player 1 */}
                          <div className={`flex-1 min-w-0 text-sm font-medium truncate ${
                            isCompleted && match.winnerId === match.player1Id
                              ? "text-gg-green"
                              : p1 ? "text-white" : "text-gg-muted italic"
                          }`}>
                            {isCompleted && match.winnerId === match.player1Id && "🏆 "}
                            {p1 ?? "TBD"}
                          </div>

                          {/* Score or VS */}
                          <div className="flex-none text-center px-2">
                            {isCompleted && games.length > 0 ? (
                              <div className="text-xs text-gg-muted font-mono whitespace-nowrap">
                                {games.map((g) => `${g.p1}–${g.p2}`).join(", ")}
                              </div>
                            ) : (
                              <span className="text-xs text-gg-muted">vs</span>
                            )}
                          </div>

                          {/* Player 2 */}
                          <div className={`flex-1 min-w-0 text-sm font-medium truncate text-right ${
                            isCompleted && match.winnerId === match.player2Id
                              ? "text-gg-green"
                              : p2 ? "text-white" : "text-gg-muted italic"
                          }`}>
                            {p2 ?? "TBD"}
                            {isCompleted && match.winnerId === match.player2Id && " 🏆"}
                          </div>
                        </div>

                        {/* Last reporter */}
                        {match.scoreHistory.length > 0 && (
                          <div className="text-xs text-gg-muted mt-1">
                            Reported by {match.scoreHistory[0].reporterName}
                          </div>
                        )}
                      </div>

                      {/* Status + action */}
                      <div className="flex-none flex flex-col items-end gap-1">
                        <span className={STATUS_STYLES[match.status] || "badge-gray"}>
                          {STATUS_LABELS[match.status] || match.status}
                        </span>
                        {isCompleted && (
                          <button
                            className="text-xs text-gg-muted hover:text-white underline"
                            onClick={(e) => { e.stopPropagation(); setScoreMatch(match); }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Score modal */}
      {scoreMatch && (
        <ScoreModal
          match={scoreMatch as never}
          p1Name={scoreMatch.player1Id ? (playerMap[scoreMatch.player1Id]?.name ?? "Player 1") : "TBD"}
          p2Name={scoreMatch.player2Id ? (playerMap[scoreMatch.player2Id]?.name ?? "Player 2") : "TBD"}
          isAdmin={isAdmin}
          onClose={() => setScoreMatch(null)}
          onSubmit={submitScore}
        />
      )}

      {/* Court assignment modal */}
      {courtMatch && isAdmin && (
        <CourtModal
          matchId={courtMatch.id}
          current={courtMatch.courtNumber}
          onClose={() => setCourtMatch(null)}
          onSave={() => { setCourtMatch(null); router.refresh(); }}
        />
      )}
    </div>
  );
}
