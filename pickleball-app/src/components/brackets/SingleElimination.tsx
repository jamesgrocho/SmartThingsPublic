"use client";
import MatchCard, { MatchData } from "./MatchCard";

interface Props {
  matches: MatchData[];
  playerMap: Record<string, string>;
  userId: string | null;
  tournamentId: string;
}

export default function SingleElimination({ matches, playerMap, userId, tournamentId }: Props) {
  // Group by round
  const roundMap: Record<number, MatchData[]> = {};
  for (const m of matches) {
    if (!roundMap[m.round]) roundMap[m.round] = [];
    roundMap[m.round].push(m);
  }

  const rounds = Object.keys(roundMap)
    .map(Number)
    .sort((a, b) => a - b);

  const roundLabels = (r: number, total: number) => {
    if (r === total) return "Final";
    if (r === total - 1) return "Semifinal";
    if (r === total - 2) return "Quarterfinal";
    return `Round ${r}`;
  };

  return (
    <div className="overflow-x-auto pb-8">
      <div className="flex gap-0 min-w-max">
        {rounds.map((r, ri) => {
          const roundMatches = roundMap[r].sort((a, b) => a.position - b.position);
          const matchCount = roundMatches.length;
          // Space each match slot proportional to round (doubles each round)
          const slotHeight = Math.pow(2, ri) * 80 + (Math.pow(2, ri) - 1) * 12;

          return (
            <div key={r} className="flex flex-col">
              {/* Round label */}
              <div className="text-center text-xs font-medium text-gray-500 uppercase tracking-widest mb-4 w-56 px-4">
                {roundLabels(r, rounds.length)}
              </div>

              {/* Matches */}
              <div className="flex flex-col" style={{ gap: `${slotHeight}px` }}>
                {roundMatches.map((match) => (
                  <div key={match.id} className="relative flex items-center">
                    <MatchCard
                      match={match}
                      playerMap={playerMap}
                      userId={userId}
                      tournamentId={tournamentId}
                    />
                    {/* Right connector line */}
                    {ri < rounds.length - 1 && (
                      <div className="w-8 h-0.5 bg-gray-700" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Winner display */}
      {(() => {
        const finalRound = Math.max(...rounds);
        const finalMatch = roundMap[finalRound]?.[0];
        if (finalMatch?.winnerId) {
          const winnerName = playerMap[finalMatch.winnerId] ?? "Unknown";
          return (
            <div className="mt-10 text-center">
              <div className="inline-flex flex-col items-center gap-2 bg-pickle-500/10 border border-pickle-500/30 rounded-2xl px-8 py-4">
                <span className="text-3xl">🏆</span>
                <span className="text-lg font-bold text-pickle-300">
                  {winnerName}
                </span>
                <span className="text-sm text-gray-400">Tournament Champion</span>
              </div>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}
