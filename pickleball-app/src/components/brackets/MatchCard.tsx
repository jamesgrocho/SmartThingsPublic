"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ScoreModal from "@/components/ScoreModal";

export interface MatchData {
  id: string;
  round: number;
  position: number;
  bracket: string;
  player1Id: string | null;
  player2Id: string | null;
  player1Score: number | null;
  player2Score: number | null;
  winnerId: string | null;
  nextMatchId: string | null;
  isBye: boolean;
  completedAt: string | null;
  reportedById: string | null;
}

interface Props {
  match: MatchData;
  playerMap: Record<string, string>;
  userId: string | null;
  tournamentId: string;
}

export default function MatchCard({ match, playerMap, userId, tournamentId }: Props) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const p1Name = match.player1Id ? (playerMap[match.player1Id] ?? "Unknown") : "TBD";
  const p2Name = match.player2Id ? (playerMap[match.player2Id] ?? "Unknown") : "TBD";

  const isCompleted = !!match.completedAt;
  const isParticipant =
    userId && (match.player1Id === userId || match.player2Id === userId);
  const isReady = match.player1Id && match.player2Id && !match.isBye;
  const canClick = isReady;

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

  if (match.isBye) {
    return (
      <div className="w-48 rounded-lg border border-dashed border-gray-700 p-2 opacity-50">
        <div className="text-xs text-gray-500 text-center">BYE</div>
        <div className="text-sm text-gray-400 text-center mt-1">{p1Name || p2Name}</div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`w-48 rounded-lg border overflow-hidden transition-all ${
          isCompleted
            ? "border-gray-700"
            : canClick
            ? "border-gray-600 hover:border-pickle-500 cursor-pointer"
            : "border-gray-800"
        }`}
        onClick={() => canClick && setModalOpen(true)}
        title={canClick ? "Click to report score" : undefined}
      >
        {/* Player 1 */}
        <div
          className={`flex items-center justify-between px-3 py-2 ${
            isCompleted && match.winnerId === match.player1Id
              ? "bg-pickle-500/20"
              : "bg-gray-800"
          }`}
        >
          <span
            className={`text-sm truncate ${
              !match.player1Id ? "text-gray-500 italic" :
              isCompleted && match.winnerId === match.player1Id
                ? "text-pickle-300 font-semibold"
                : "text-gray-200"
            }`}
          >
            {p1Name}
          </span>
          {isCompleted && match.player1Score !== null && (
            <span className={`text-sm font-bold ml-2 ${match.winnerId === match.player1Id ? "text-pickle-400" : "text-gray-500"}`}>
              {match.player1Score}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-700" />

        {/* Player 2 */}
        <div
          className={`flex items-center justify-between px-3 py-2 ${
            isCompleted && match.winnerId === match.player2Id
              ? "bg-pickle-500/20"
              : "bg-gray-800"
          }`}
        >
          <span
            className={`text-sm truncate ${
              !match.player2Id ? "text-gray-500 italic" :
              isCompleted && match.winnerId === match.player2Id
                ? "text-pickle-300 font-semibold"
                : "text-gray-200"
            }`}
          >
            {p2Name}
          </span>
          {isCompleted && match.player2Score !== null && (
            <span className={`text-sm font-bold ml-2 ${match.winnerId === match.player2Id ? "text-pickle-400" : "text-gray-500"}`}>
              {match.player2Score}
            </span>
          )}
        </div>

        {/* Status bar */}
        {!isCompleted && isReady && (
          <div className="bg-pickle-500/10 px-3 py-1 text-center">
            <span className="text-xs text-pickle-400">
              {isParticipant ? "Click to report score" : "Pending"}
            </span>
          </div>
        )}
      </div>

      {modalOpen && (
        <ScoreModal
          match={match}
          player1Name={p1Name}
          player2Name={p2Name}
          onClose={() => setModalOpen(false)}
          onSubmit={submitScore}
          canReport={!!isParticipant || true} // organizer handled server-side
        />
      )}
    </>
  );
}
