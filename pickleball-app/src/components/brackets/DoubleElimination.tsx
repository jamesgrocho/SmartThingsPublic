"use client";
import MatchCard, { MatchData } from "./MatchCard";

interface Props {
  matches: MatchData[];
  playerMap: Record<string, string>;
  userId: string | null;
  tournamentId: string;
}

function BracketSection({
  title,
  color,
  rounds,
  matches,
  playerMap,
  userId,
  tournamentId,
}: {
  title: string;
  color: string;
  rounds: number[];
  matches: Record<number, MatchData[]>;
  playerMap: Record<string, string>;
  userId: string | null;
  tournamentId: string;
}) {
  return (
    <div className="mb-12">
      <h2 className={`text-sm font-bold uppercase tracking-widest mb-6 ${color}`}>
        {title}
      </h2>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-0 min-w-max">
          {rounds.map((r, ri) => {
            const roundMatches = matches[r].sort((a, b) => a.position - b.position);
            const slotHeight = Math.max(20, Math.pow(2, ri) * 60 + (Math.pow(2, ri) - 1) * 12);

            return (
              <div key={r} className="flex flex-col">
                <div className="text-center text-xs text-gray-500 uppercase tracking-widest mb-4 w-56 px-4">
                  Round {r}
                </div>
                <div className="flex flex-col" style={{ gap: `${slotHeight}px` }}>
                  {roundMatches.map((match) => (
                    <div key={match.id} className="flex items-center">
                      <MatchCard
                        match={match}
                        playerMap={playerMap}
                        userId={userId}
                        tournamentId={tournamentId}
                      />
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
      </div>
    </div>
  );
}

export default function DoubleElimination({ matches, playerMap, userId, tournamentId }: Props) {
  const wbMatches: Record<number, MatchData[]> = {};
  const lbMatches: Record<number, MatchData[]> = {};
  const gfMatches: MatchData[] = [];

  for (const m of matches) {
    if (m.bracket === "WINNERS") {
      if (!wbMatches[m.round]) wbMatches[m.round] = [];
      wbMatches[m.round].push(m);
    } else if (m.bracket === "LOSERS") {
      if (!lbMatches[m.round]) lbMatches[m.round] = [];
      lbMatches[m.round].push(m);
    } else if (m.bracket === "GRAND_FINALS") {
      gfMatches.push(m);
    }
  }

  const wbRounds = Object.keys(wbMatches).map(Number).sort((a, b) => a - b);
  const lbRounds = Object.keys(lbMatches).map(Number).sort((a, b) => a - b);

  const champion = gfMatches[0]?.winnerId
    ? playerMap[gfMatches[0].winnerId]
    : null;

  return (
    <div>
      {wbRounds.length > 0 && (
        <BracketSection
          title="Winners Bracket"
          color="text-pickle-400"
          rounds={wbRounds}
          matches={wbMatches}
          playerMap={playerMap}
          userId={userId}
          tournamentId={tournamentId}
        />
      )}

      {lbRounds.length > 0 && (
        <BracketSection
          title="Losers Bracket"
          color="text-orange-400"
          rounds={lbRounds}
          matches={lbMatches}
          playerMap={playerMap}
          userId={userId}
          tournamentId={tournamentId}
        />
      )}

      {gfMatches.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-6 text-yellow-400">
            Grand Finals
          </h2>
          <div className="flex gap-4 flex-wrap">
            {gfMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                playerMap={playerMap}
                userId={userId}
                tournamentId={tournamentId}
              />
            ))}
          </div>
        </div>
      )}

      {champion && (
        <div className="mt-4 text-center">
          <div className="inline-flex flex-col items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-8 py-4">
            <span className="text-3xl">🏆</span>
            <span className="text-lg font-bold text-yellow-300">{champion}</span>
            <span className="text-sm text-gray-400">Tournament Champion</span>
          </div>
        </div>
      )}
    </div>
  );
}
