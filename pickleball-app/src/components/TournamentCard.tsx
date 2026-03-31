import Link from "next/link";

interface TournamentCardProps {
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

const STATUS_DOT: Record<string, string> = {
  REGISTRATION: "bg-gg-green",
  IN_PROGRESS:  "bg-gg-yellow",
  COMPLETED:    "bg-gg-muted",
};

const STATUS_LABEL: Record<string, string> = {
  REGISTRATION: "Open",
  IN_PROGRESS:  "Live",
  COMPLETED:    "Done",
};

export default function TournamentCard({ tournament: t }: { tournament: TournamentCardProps }) {
  return (
    <Link
      href={`/tournaments/${t.id}`}
      className="card-sm hover:border-gg-border-2 hover:bg-gg-card-2/50 transition-all block group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[t.status]}`} />
          <span className="text-xs text-gg-muted">{STATUS_LABEL[t.status]}</span>
        </div>
        <span className="text-xs text-gg-muted">{FORMAT_SHORT[t.format]}</span>
      </div>

      <h3 className="font-semibold text-white group-hover:text-gg-green transition-colors mb-1 line-clamp-1">
        {t.name}
      </h3>
      {t.description && (
        <p className="text-xs text-gg-muted line-clamp-2 mb-3">{t.description}</p>
      )}
      <div className="flex justify-between items-center text-xs text-gg-muted mt-3 pt-3 border-t border-gg-border">
        <span>{t._count.players} / {t.maxPlayers} players</span>
        <span>{t.createdBy.name}</span>
      </div>
    </Link>
  );
}
