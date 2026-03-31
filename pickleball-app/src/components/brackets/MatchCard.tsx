"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ScoreModal from "@/components/ScoreModal";

interface GameScore { p1: number; p2: number }

interface HistoryEntry {
  id: string;
  reporterName: string;
  reporterType: string;
  action: string;
  scoreData: string;
  createdAt: string;
}

export interface MatchData {
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
  isBye: boolean;
  completedAt: string | null;
  scoreHistory: HistoryEntry[];
}

interface Props {
  match: MatchData;
  playerMap: Record<string, { name: string; duprId: string | null }>;
  isAdmin: boolean;
  tournamentId: string;
}

function getScoreSummary(match: MatchData): string {
  const parts: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const p1 = ((match as unknown) as Record<string, number | null>)[`game${i}P1`];
    const p2 = ((match as unknown) as Record<string, number | null>)[`game${i}P2`];
    if (p1 != null && p2 != null) parts.push(`${p1}–${p2}`);
  }
  return parts.join(", ");
}

export default function MatchCard({ match, playerMap, isAdmin, tournamentId }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const p1Info = match.player1Id ? playerMap[match.player1Id] : null;
  const p2Info = match.player2Id ? playerMap[match.player2Id] : null;
  const p1Name = p1Info?.name ?? "TBD";
  const p2Name = p2Info?.name ?? "TBD";

  const isCompleted = !!match.completedAt;
  const isReady = !!(match.player1Id && match.player2Id && !match.isBye);
  const scoreSummary = isCompleted ? getScoreSummary(match) : "";

  if (match.isBye) {
    return (
      <div className="w-52 rounded-lg border border-dashed border-gray-700 p-2 opacity-50">
        <div className="text-xs text-gray-500 text-center">BYE — {p1Name || p2Name}</div>
      </div>
    );
  }

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

  return (
    <>
      <div
        className={`w-52 rounded-lg border overflow-hidden transition-all ${
          isCompleted
            ? "border-gray-700"
            : isReady
            ? "border-gray-600 hover:border-pickle-500 cursor-pointer"
            : "border-gray-800"
        }`}
        onClick={() => isReady && setModalOpen(true)}
        title={isReady ? "Click to report score" : undefined}
      >
        {/* Player 1 row */}
        <div className={`flex items-center justify-between px-3 py-2 ${
          isCompleted && match.winnerId === match.player1Id ? "bg-pickle-500/20" : "bg-gray-800"
        }`}>
          <span className={`text-sm truncate flex-1 ${
            !match.player1Id ? "text-gray-500 italic" :
            isCompleted && match.winnerId === match.player1Id
              ? "text-pickle-300 font-semibold"
              : "text-gray-200"
          }`}>
            {isCompleted && match.winnerId === match.player1Id && "🏆 "}
            {p1Name}
          </span>
        </div>

        <div className="h-px bg-gray-700" />

        {/* Player 2 row */}
        <div className={`flex items-center justify-between px-3 py-2 ${
          isCompleted && match.winnerId === match.player2Id ? "bg-pickle-500/20" : "bg-gray-800"
        }`}>
          <span className={`text-sm truncate flex-1 ${
            !match.player2Id ? "text-gray-500 italic" :
            isCompleted && match.winnerId === match.player2Id
              ? "text-pickle-300 font-semibold"
              : "text-gray-200"
          }`}>
            {isCompleted && match.winnerId === match.player2Id && "🏆 "}
            {p2Name}
          </span>
        </div>

        {/* Score summary / status */}
        {isCompleted && scoreSummary ? (
          <div className="bg-gray-900 px-3 py-1 text-center">
            <span className="text-xs text-gray-400 font-mono">{scoreSummary}</span>
          </div>
        ) : isReady ? (
          <div className="bg-pickle-500/10 px-3 py-1 text-center">
            <span className="text-xs text-pickle-400">
              {match.scoreHistory.length > 0 ? "Edit score" : "Report score"}
            </span>
          </div>
        ) : null}
      </div>

      {modalOpen && (
        <ScoreModal
          match={match}
          p1Name={p1Name}
          p2Name={p2Name}
          isAdmin={isAdmin}
          onClose={() => setModalOpen(false)}
          onSubmit={submitScore}
        />
      )}
    </>
  );
}
