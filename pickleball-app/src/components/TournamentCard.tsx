import Link from "next/link";

interface TournamentCard {
  id: string;
  name: string;
  description?: string | null;
  format: string;
  status: string;
  maxPlayers: number;
  createdBy: { name: string };
  _count: { players: number; matches: number };
}

const FORMAT_SHORT: Record<string, string> = {
  SINGLE_ELIMINATION: "Single Elim",
  DOUBLE_ELIMINATION: "Double Elim",
  ROUND_ROBIN: "Round Robin",
};

const STATUS_COLORS: Record<string, string> = {
  REGISTRATION: "text-pickle-400",
  IN_PROGRESS: "text-yellow-400",
  COMPLETED: "text-gray-500",
};

export default function TournamentCard({ tournament: t }: { tournament: TournamentCard }) {
  return (
    <Link
      href={`/tournaments/${t.id}`}
      className="card hover:border-gray-600 hover:bg-gray-800/50 transition-all block group"
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-xs font-medium ${STATUS_COLORS[t.status]}`}>
          ● {t.status.replace("_", " ")}
        </span>
        <span className="text-xs text-gray-500">{FORMAT_SHORT[t.format]}</span>
      </div>
      <h3 className="font-semibold text-gray-100 group-hover:text-white mb-1 line-clamp-1">
        {t.name}
      </h3>
      {t.description && (
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">{t.description}</p>
      )}
      <div className="flex justify-between items-center text-xs text-gray-500 mt-auto">
        <span>
          👥 {t._count.players} / {t.maxPlayers}
        </span>
        <span>by {t.createdBy.name}</span>
      </div>
    </Link>
  );
}
