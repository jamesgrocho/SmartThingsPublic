"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ScoreModal from "@/components/ScoreModal";
import { MatchData } from "./MatchCard";

interface GameScore { p1: number; p2: number }

interface Props {
  matches: MatchData[];
  playerMap: Record<string, { name: string; duprId: string | null }>;
  isAdmin: boolean;
  tournamentId: string;
}

interface Standing {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  gamesFor: number;
  gamesAgainst: number;
  played: number;
}

function getGames(match: MatchData): GameScore[] {
  const result: GameScore[] = [];
  for (let i = 1; i <= 5; i++) {
    const p1 = ((match as unknown) as Record<string, number | null>)[`game${i}P1`];
    const p2 = ((match as unknown) as Record<string, number | null>)[`game${i}P2`];
    if (p1 != null && p2 != null) result.push({ p1, p2 });
  }
  return result;
}

export default function RoundRobin({ matches, playerMap, isAdmin, tournamentId }: Props) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);

  // Build standings
  const standings: Record<string, Standing> = {};
  const ensure = (id: string) => {
    if (!standings[id]) {
      standings[id] = { playerId: id, name: playerMap[id]?.name ?? "Unknown", wins: 0, losses: 0, gamesFor: 0, gamesAgainst: 0, played: 0 };
    }
  };

  for (const m of matches) {
    if (!m.player1Id || !m.player2Id) continue;
    ensure(m.player1Id);
    ensure(m.player2Id);
    if (m.completedAt && m.winnerId) {
      standings[m.player1Id].played++;
      standings[m.player2Id].played++;
      const games = getGames(m);
      for (const g of games) {
        if (g.p1 > g.p2) { standings[m.player1Id].gamesFor += g.p1; standings[m.player1Id].gamesAgainst += g.p2; standings[m.player2Id].gamesFor += g.p2; standings[m.player2Id].gamesAgainst += g.p1; }
        else { standings[m.player2Id].gamesFor += g.p2; standings[m.player2Id].gamesAgainst += g.p1; standings[m.player1Id].gamesFor += g.p1; standings[m.player1Id].gamesAgainst += g.p2; }
      }
      if (m.winnerId === m.player1Id) { standings[m.player1Id].wins++; standings[m.player2Id].losses++; }
      else { standings[m.player2Id].wins++; standings[m.player1Id].losses++; }
    }
  }

  const sorted = Object.values(standings).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    return (b.gamesFor - b.gamesAgainst) - (a.gamesFor - a.gamesAgainst);
  });

  const roundMap: Record<number, MatchData[]> = {};
  for (const m of matches) {
    if (!roundMap[m.round]) roundMap[m.round] = [];
    roundMap[m.round].push(m);
  }
  const rounds = Object.keys(roundMap).map(Number).sort((a, b) => a - b);

  async function submitScore(matchId: string, games: GameScore[], reporterName: string) {
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ games, reporterName }),
    });
    if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Standings */}
      <div className="card overflow-x-auto">
        <h2 className="font-bold text-gray-200 mb-4">Standings</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 text-left border-b border-gray-800">
              <th className="pb-3 pr-4">#</th>
              <th className="pb-3 pr-4">Player</th>
              <th className="pb-3 pr-4 text-center">W</th>
              <th className="pb-3 pr-4 text-center">L</th>
              <th className="pb-3 pr-4 text-center">Played</th>
              <th className="pb-3 text-center">Pts +/-</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((s, i) => (
              <tr key={s.playerId} className={i === 0 && s.played > 0 ? "text-pickle-300" : ""}>
                <td className="py-2.5 pr-4 text-gray-500">{i + 1}</td>
                <td className="py-2.5 pr-4 font-medium">
                  {i === 0 && s.wins > 0 && "🏆 "}{s.name}
                </td>
                <td className="py-2.5 pr-4 text-center text-pickle-400 font-semibold">{s.wins}</td>
                <td className="py-2.5 pr-4 text-center text-red-400">{s.losses}</td>
                <td className="py-2.5 pr-4 text-center text-gray-400">{s.played}</td>
                <td className="py-2.5 text-center text-gray-400">
                  {s.gamesFor - s.gamesAgainst > 0 ? "+" : ""}{s.gamesFor - s.gamesAgainst}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Schedule */}
      <div>
        <h2 className="font-bold text-gray-200 mb-4">Match Schedule</h2>
        <div className="space-y-4">
          {rounds.map((r) => (
            <div key={r}>
              <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2">Round {r}</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {roundMap[r].map((match) => {
                  const p1 = match.player1Id ? (playerMap[match.player1Id]?.name ?? "?") : "TBD";
                  const p2 = match.player2Id ? (playerMap[match.player2Id]?.name ?? "?") : "TBD";
                  const completed = !!match.completedAt;
                  const games = getGames(match);
                  return (
                    <div key={match.id}
                      onClick={() => match.player1Id && match.player2Id && setSelectedMatch(match)}
                      className={`rounded-lg border p-3 transition-all ${
                        completed ? "border-gray-700" :
                        match.player1Id && match.player2Id ? "border-gray-600 hover:border-pickle-500 cursor-pointer" :
                        "border-gray-800 opacity-50"
                      }`}>
                      <div className="flex items-center justify-between text-sm">
                        <span className={match.winnerId === match.player1Id ? "text-pickle-300 font-semibold" : "text-gray-200"}>
                          {match.winnerId === match.player1Id && "🏆 "}{p1}
                        </span>
                        <span className="text-xs text-gray-500 mx-2">
                          {completed ? games.map(g => `${g.p1}–${g.p2}`).join(", ") : "vs"}
                        </span>
                        <span className={match.winnerId === match.player2Id ? "text-pickle-300 font-semibold" : "text-gray-200"}>
                          {match.winnerId === match.player2Id && "🏆 "}{p2}
                        </span>
                      </div>
                      {match.scoreHistory.length > 0 && (
                        <div className="text-xs text-gray-600 mt-1">
                          Reported by {match.scoreHistory[match.scoreHistory.length - 1].reporterName}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedMatch && (
        <ScoreModal
          match={selectedMatch}
          p1Name={selectedMatch.player1Id ? (playerMap[selectedMatch.player1Id]?.name ?? "?") : "TBD"}
          p2Name={selectedMatch.player2Id ? (playerMap[selectedMatch.player2Id]?.name ?? "?") : "TBD"}
          isAdmin={isAdmin}
          onClose={() => setSelectedMatch(null)}
          onSubmit={submitScore}
        />
      )}
    </div>
  );
}
