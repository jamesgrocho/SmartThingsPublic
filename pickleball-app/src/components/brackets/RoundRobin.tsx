"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ScoreModal from "@/components/ScoreModal";
import { MatchData } from "./MatchCard";

interface Props {
  matches: MatchData[];
  playerMap: Record<string, string>;
  userId: string | null;
  tournamentId: string;
}

interface Standing {
  playerId: string;
  name: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  played: number;
}

export default function RoundRobin({ matches, playerMap, userId, tournamentId }: Props) {
  const router = useRouter();
  const [selectedMatch, setSelectedMatch] = useState<MatchData | null>(null);

  // Build standings
  const standings: Record<string, Standing> = {};
  const ensurePlayer = (id: string) => {
    if (!standings[id]) {
      standings[id] = {
        playerId: id,
        name: playerMap[id] ?? "Unknown",
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        played: 0,
      };
    }
  };

  for (const m of matches) {
    if (!m.player1Id || !m.player2Id) continue;
    ensurePlayer(m.player1Id);
    ensurePlayer(m.player2Id);

    if (m.completedAt && m.winnerId) {
      standings[m.player1Id].played++;
      standings[m.player2Id].played++;
      standings[m.player1Id].pointsFor += m.player1Score ?? 0;
      standings[m.player1Id].pointsAgainst += m.player2Score ?? 0;
      standings[m.player2Id].pointsFor += m.player2Score ?? 0;
      standings[m.player2Id].pointsAgainst += m.player1Score ?? 0;
      if (m.winnerId === m.player1Id) {
        standings[m.player1Id].wins++;
        standings[m.player2Id].losses++;
      } else {
        standings[m.player2Id].wins++;
        standings[m.player1Id].losses++;
      }
    }
  }

  const sorted = Object.values(standings).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const aDiff = a.pointsFor - a.pointsAgainst;
    const bDiff = b.pointsFor - b.pointsAgainst;
    return bDiff - aDiff;
  });

  // Group matches by round
  const roundMap: Record<number, MatchData[]> = {};
  for (const m of matches) {
    if (!roundMap[m.round]) roundMap[m.round] = [];
    roundMap[m.round].push(m);
  }
  const rounds = Object.keys(roundMap).map(Number).sort((a, b) => a - b);

  async function submitScore(matchId: string, s1: number, s2: number) {
    const res = await fetch(`/api/matches/${matchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player1Score: s1, player2Score: s2 }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw new Error(d.error || "Failed to submit");
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Standings table */}
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
              <th className="pb-3 pr-4 text-center">+/-</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sorted.map((s, i) => (
              <tr key={s.playerId} className={i === 0 && s.played > 0 ? "text-pickle-300" : ""}>
                <td className="py-2.5 pr-4 text-gray-500">{i + 1}</td>
                <td className="py-2.5 pr-4 font-medium">
                  {i === 0 && s.wins > 0 && "🏆 "}
                  {s.name}
                </td>
                <td className="py-2.5 pr-4 text-center text-pickle-400 font-semibold">{s.wins}</td>
                <td className="py-2.5 pr-4 text-center text-red-400">{s.losses}</td>
                <td className="py-2.5 pr-4 text-center text-gray-400">{s.played}</td>
                <td className="py-2.5 pr-4 text-center text-gray-400">
                  {s.pointsFor - s.pointsAgainst > 0 ? "+" : ""}
                  {s.pointsFor - s.pointsAgainst}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Match schedule */}
      <div>
        <h2 className="font-bold text-gray-200 mb-4">Match Schedule</h2>
        <div className="space-y-4">
          {rounds.map((r) => (
            <div key={r}>
              <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                Round {r}
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {roundMap[r].map((match) => {
                  const p1 = match.player1Id ? (playerMap[match.player1Id] ?? "?") : "TBD";
                  const p2 = match.player2Id ? (playerMap[match.player2Id] ?? "?") : "TBD";
                  const completed = !!match.completedAt;
                  const canClick = match.player1Id && match.player2Id;
                  const isParticipant =
                    userId && (match.player1Id === userId || match.player2Id === userId);

                  return (
                    <div
                      key={match.id}
                      onClick={() => canClick && setSelectedMatch(match)}
                      className={`rounded-lg border p-3 transition-all ${
                        completed
                          ? "border-gray-700"
                          : canClick
                          ? "border-gray-600 hover:border-pickle-500 cursor-pointer"
                          : "border-gray-800 opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${match.winnerId === match.player1Id ? "text-pickle-300" : "text-gray-200"}`}>
                          {p1}
                          {match.winnerId === match.player1Id && " 🏆"}
                        </span>
                        {completed ? (
                          <span className="text-sm font-bold text-gray-300">
                            {match.player1Score} – {match.player2Score}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {isParticipant ? "Report" : "vs"}
                          </span>
                        )}
                        <span className={`text-sm font-medium ${match.winnerId === match.player2Id ? "text-pickle-300" : "text-gray-200"}`}>
                          {p2}
                          {match.winnerId === match.player2Id && " 🏆"}
                        </span>
                      </div>
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
          player1Name={selectedMatch.player1Id ? (playerMap[selectedMatch.player1Id] ?? "?") : "TBD"}
          player2Name={selectedMatch.player2Id ? (playerMap[selectedMatch.player2Id] ?? "?") : "TBD"}
          onClose={() => setSelectedMatch(null)}
          onSubmit={submitScore}
          canReport={
            !!(userId && (selectedMatch.player1Id === userId || selectedMatch.player2Id === userId))
          }
        />
      )}
    </div>
  );
}
