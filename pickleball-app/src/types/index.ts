export interface UserPublic {
  id: string;
  name: string;
  email: string;
}

export interface TournamentPlayer {
  id: string;
  userId: string;
  seed: number | null;
  user: UserPublic;
}

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  format: "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "ROUND_ROBIN";
  status: "REGISTRATION" | "IN_PROGRESS" | "COMPLETED";
  maxPlayers: number;
  createdAt: string;
  createdBy: UserPublic;
  players: TournamentPlayer[];
  _count?: { players: number; matches: number };
}

export interface Match {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  bracket: string;
  player1Id: string | null;
  player2Id: string | null;
  player1Score: number | null;
  player2Score: number | null;
  winnerId: string | null;
  nextMatchId: string | null;
  nextMatchSlot: number | null;
  loserNextMatchId: string | null;
  isBye: boolean;
  completedAt: string | null;
  reportedById: string | null;
}

export type TournamentFormat =
  | "SINGLE_ELIMINATION"
  | "DOUBLE_ELIMINATION"
  | "ROUND_ROBIN";
