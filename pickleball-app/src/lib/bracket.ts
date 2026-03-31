export interface MatchInput {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  bracket: string;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  nextMatchId: string | null;
  nextMatchSlot: number | null;
  loserNextMatchId: string | null;
  loserNextMatchSlot: number | null;
  isBye: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function nextPow2(n: number) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function wbId(tid: string, round: number, pos: number) {
  return `${tid}-wb-r${round}-p${pos}`;
}
function lbId(tid: string, round: number, pos: number) {
  return `${tid}-lb-r${round}-p${pos}`;
}
function gfId(tid: string) {
  return `${tid}-gf`;
}
function rrId(tid: string, round: number, pos: number) {
  return `${tid}-rr-r${round}-p${pos}`;
}

// ─── Single Elimination ────────────────────────────────────────────────────

export function generateSingleElim(
  tournamentId: string,
  playerIds: string[]
): MatchInput[] {
  const n = playerIds.length;
  if (n < 2) throw new Error("Need at least 2 players");

  const rounds = Math.ceil(Math.log2(n));
  const size = nextPow2(n);

  // Seed slots — fill extra with null (byes at the end)
  const seeds: (string | null)[] = [...playerIds];
  while (seeds.length < size) seeds.push(null);

  const matches: MatchInput[] = [];

  // Round 1
  for (let p = 1; p <= size / 2; p++) {
    const p1 = seeds[(p - 1) * 2];
    const p2 = seeds[(p - 1) * 2 + 1];
    const isBye = (p1 !== null) !== (p2 !== null); // exactly one is null
    const winnerId = isBye ? (p1 ?? p2) : null;

    const nextRound = rounds > 1 ? 2 : null;
    const nextPos = nextRound ? Math.ceil(p / 2) : null;
    const nextSlot = nextRound ? (p % 2 === 1 ? 1 : 2) : null;

    matches.push({
      id: wbId(tournamentId, 1, p),
      tournamentId,
      round: 1,
      position: p,
      bracket: "WINNERS",
      player1Id: p1,
      player2Id: p2,
      winnerId,
      nextMatchId:
        nextRound && nextPos ? wbId(tournamentId, nextRound, nextPos) : null,
      nextMatchSlot: nextSlot,
      loserNextMatchId: null,
      loserNextMatchSlot: null,
      isBye,
    });
  }

  // Remaining rounds (placeholders)
  for (let r = 2; r <= rounds; r++) {
    const count = size / Math.pow(2, r);
    for (let p = 1; p <= count; p++) {
      const nextRound = r < rounds ? r + 1 : null;
      const nextPos = nextRound ? Math.ceil(p / 2) : null;
      const nextSlot = nextRound ? (p % 2 === 1 ? 1 : 2) : null;

      matches.push({
        id: wbId(tournamentId, r, p),
        tournamentId,
        round: r,
        position: p,
        bracket: "WINNERS",
        player1Id: null,
        player2Id: null,
        winnerId: null,
        nextMatchId:
          nextRound && nextPos ? wbId(tournamentId, nextRound, nextPos) : null,
        nextMatchSlot: nextSlot,
        loserNextMatchId: null,
        loserNextMatchSlot: null,
        isBye: false,
      });
    }
  }

  return matches;
}

// ─── Double Elimination ────────────────────────────────────────────────────
//
// WB: k rounds  (k = ceil(log2(n)), size = 2^k)
// LB: 2*(k-1) rounds
//   LBR(2j-1): "fight" round — LB players only         — size/2^(j+1) matches
//   LBR(2j)  : "drop"  round — WB loser drops in       — size/2^(j+1) matches
// GF: 1 match
//
// WBR1 losers  → LBR1 (paired up: pos 2p-1 & 2p → LBR1 pos p)
// WBRr losers  → LBR(2r-2) slot 2  (r ≥ 2)
// LBR(2j-1) winner p → LBR(2j) pos p slot 1
// LBR(2j) winner 2p-1 & 2p → LBR(2j+1) pos p (fight round)
// WBRk winner → GF slot 1
// LBR(2k-2) winner → GF slot 2

export function generateDoubleElim(
  tournamentId: string,
  playerIds: string[]
): MatchInput[] {
  const n = playerIds.length;
  if (n < 2) throw new Error("Need at least 2 players");

  const k = Math.ceil(Math.log2(n));
  const size = nextPow2(n);

  const seeds: (string | null)[] = [...playerIds];
  while (seeds.length < size) seeds.push(null);

  const matches: MatchInput[] = [];

  // ── Winners Bracket ──────────────────────────────────────────────────────

  // WBR1
  for (let p = 1; p <= size / 2; p++) {
    const p1 = seeds[(p - 1) * 2];
    const p2 = seeds[(p - 1) * 2 + 1];
    const isBye = (p1 !== null) !== (p2 !== null);
    const winnerId = isBye ? (p1 ?? p2) : null;

    // WBR1 loser goes to LBR1 pos ceil(p/2), slot based on p odd/even
    const lbPos = Math.ceil(p / 2);
    const lbSlot = p % 2 === 1 ? 1 : 2;

    matches.push({
      id: wbId(tournamentId, 1, p),
      tournamentId,
      round: 1,
      position: p,
      bracket: "WINNERS",
      player1Id: p1,
      player2Id: p2,
      winnerId,
      nextMatchId: k > 1 ? wbId(tournamentId, 2, Math.ceil(p / 2)) : gfId(tournamentId),
      nextMatchSlot: p % 2 === 1 ? 1 : 2,
      loserNextMatchId: k > 1 ? lbId(tournamentId, 1, lbPos) : null,
      loserNextMatchSlot: k > 1 ? lbSlot : null,
      isBye,
    });
  }

  // WBR2..WBRk
  for (let r = 2; r <= k; r++) {
    const count = size / Math.pow(2, r);
    for (let p = 1; p <= count; p++) {
      const isWBFinals = r === k;
      const nextMId = isWBFinals
        ? gfId(tournamentId)
        : wbId(tournamentId, r + 1, Math.ceil(p / 2));
      const nextSlot = isWBFinals ? 1 : p % 2 === 1 ? 1 : 2;

      // WBRr loser → LBR(2r-2) pos p, slot 2
      const lbRound = 2 * r - 2;
      const loserNext = lbId(tournamentId, lbRound, p);

      matches.push({
        id: wbId(tournamentId, r, p),
        tournamentId,
        round: r,
        position: p,
        bracket: "WINNERS",
        player1Id: null,
        player2Id: null,
        winnerId: null,
        nextMatchId: nextMId,
        nextMatchSlot: nextSlot,
        loserNextMatchId: loserNext,
        loserNextMatchSlot: 2,
        isBye: false,
      });
    }
  }

  // ── Losers Bracket ───────────────────────────────────────────────────────

  const totalLBRounds = 2 * (k - 1);

  for (let lbr = 1; lbr <= totalLBRounds; lbr++) {
    // Determine match count for this LB round
    const j = Math.ceil(lbr / 2);
    const count = size / Math.pow(2, j + 1);

    const isFightRound = lbr % 2 === 1; // odd LB rounds = fight
    const isLastLBRound = lbr === totalLBRounds;

    for (let p = 1; p <= count; p++) {
      let nextMId: string;
      let nextSlot: number;

      if (isLastLBRound) {
        nextMId = gfId(tournamentId);
        nextSlot = 2;
      } else if (isFightRound) {
        // fight round winner → next drop round, same position
        nextMId = lbId(tournamentId, lbr + 1, p);
        nextSlot = 1;
      } else {
        // drop round winner → next fight round, paired position
        nextMId = lbId(tournamentId, lbr + 1, Math.ceil(p / 2));
        nextSlot = p % 2 === 1 ? 1 : 2;
      }

      matches.push({
        id: lbId(tournamentId, lbr, p),
        tournamentId,
        round: lbr,
        position: p,
        bracket: "LOSERS",
        player1Id: null,
        player2Id: null,
        winnerId: null,
        nextMatchId: nextMId,
        nextMatchSlot: nextSlot,
        loserNextMatchId: null,
        loserNextMatchSlot: null,
        isBye: false,
      });
    }
  }

  // ── Grand Finals ─────────────────────────────────────────────────────────
  matches.push({
    id: gfId(tournamentId),
    tournamentId,
    round: 1,
    position: 1,
    bracket: "GRAND_FINALS",
    player1Id: null,
    player2Id: null,
    winnerId: null,
    nextMatchId: null,
    nextMatchSlot: null,
    loserNextMatchId: null,
    loserNextMatchSlot: null,
    isBye: false,
  });

  return matches;
}

// ─── Round Robin ──────────────────────────────────────────────────────────
// Uses the polygon (circle) algorithm for schedule generation.

export function generateRoundRobin(
  tournamentId: string,
  playerIds: string[]
): MatchInput[] {
  const players = [...playerIds];
  // If odd number, add a "bye" player
  const hasBye = players.length % 2 !== 0;
  if (hasBye) players.push("BYE");

  const n = players.length;
  const rounds = n - 1;
  const matchesPerRound = n / 2;
  const allMatches: MatchInput[] = [];

  for (let r = 0; r < rounds; r++) {
    for (let m = 0; m < matchesPerRound; m++) {
      const p1 = players[m === 0 ? 0 : (r + m) % (n - 1) + 1];
      const p2 = players[m === 0 ? (r % (n - 1)) + 1 : (r + n - 1 - m) % (n - 1) + 1];

      const isBye = p1 === "BYE" || p2 === "BYE";

      allMatches.push({
        id: rrId(tournamentId, r + 1, m + 1),
        tournamentId,
        round: r + 1,
        position: m + 1,
        bracket: "WINNERS",
        player1Id: isBye ? null : p1 === "BYE" ? null : p1,
        player2Id: isBye ? null : p2 === "BYE" ? null : p2,
        winnerId: null,
        nextMatchId: null,
        nextMatchSlot: null,
        loserNextMatchId: null,
        loserNextMatchSlot: null,
        isBye,
      });
    }
  }

  return allMatches.filter((m) => !m.isBye);
}
