import { NextRequest, NextResponse } from "next/server";
import { auth, getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface GameScore { p1: number; p2: number }

function computeWinner(
  games: GameScore[],
  player1Id: string,
  player2Id: string
): string {
  let p1Wins = 0;
  let p2Wins = 0;
  for (const g of games) {
    if (g.p1 > g.p2) p1Wins++;
    else p2Wins++;
  }
  return p1Wins >= p2Wins ? player1Id : player2Id;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  // games: [{p1: number, p2: number}, ...] — at least 1, up to 5
  const { games, reporterName } = body as { games: GameScore[]; reporterName?: string };

  if (!Array.isArray(games) || games.length === 0 || games.length > 5) {
    return NextResponse.json({ error: "Provide 1–5 game scores" }, { status: 400 });
  }
  for (const g of games) {
    if (typeof g.p1 !== "number" || typeof g.p2 !== "number") {
      return NextResponse.json({ error: "Each game needs p1 and p2 scores" }, { status: 400 });
    }
    if (g.p1 < 0 || g.p2 < 0) {
      return NextResponse.json({ error: "Scores cannot be negative" }, { status: 400 });
    }
    if (g.p1 === g.p2) {
      return NextResponse.json({ error: "A game cannot end in a tie" }, { status: 400 });
    }
  }

  const match = await prisma.match.findUnique({
    where: { id },
    include: { scoreHistory: true },
  });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });
  if (!match.player1Id || !match.player2Id) {
    return NextResponse.json({ error: "Both players must be assigned" }, { status: 400 });
  }

  // Determine reporter
  const session = await auth();
  const sessionUser = getSessionUser(session as { user?: unknown });

  let resolvedReporterName: string;
  let reporterType: string;

  if (sessionUser?.isAdmin) {
    resolvedReporterName = sessionUser.name ?? "Admin";
    reporterType = "admin";
  } else if (reporterName?.trim()) {
    resolvedReporterName = reporterName.trim();
    reporterType = "player";
  } else {
    return NextResponse.json({ error: "Reporter name required" }, { status: 400 });
  }

  const isEdit = !!match.completedAt;
  const action = isEdit ? "edited" : "submitted";

  const winnerId = computeWinner(games, match.player1Id, match.player2Id);
  const loserNextMatchId = match.loserNextMatchId;

  // Build game score fields
  const gameData: Record<string, number | null> = {
    game1P1: games[0]?.p1 ?? null, game1P2: games[0]?.p2 ?? null,
    game2P1: games[1]?.p1 ?? null, game2P2: games[1]?.p2 ?? null,
    game3P1: games[2]?.p1 ?? null, game3P2: games[2]?.p2 ?? null,
    game4P1: games[3]?.p1 ?? null, game4P2: games[3]?.p2 ?? null,
    game5P1: games[4]?.p1 ?? null, game5P2: games[4]?.p2 ?? null,
  };

  const prevWinnerId = match.winnerId;

  await prisma.$transaction(async (tx) => {
    // Update match
    await tx.match.update({
      where: { id },
      data: {
        ...gameData,
        winnerId,
        completedAt: new Date(),
      },
    });

    // Score history entry
    await tx.scoreHistory.create({
      data: {
        matchId: id,
        reporterName: resolvedReporterName,
        reporterType,
        action,
        scoreData: JSON.stringify(games),
      },
    });

    // Advance winner to next match (only if winner changed or first time)
    if (match.nextMatchId && match.nextMatchSlot && winnerId !== prevWinnerId) {
      if (prevWinnerId && match.nextMatchId) {
        // Clear old winner from next match
        const clearField = match.nextMatchSlot === 1 ? { player1Id: null } : { player2Id: null };
        await tx.match.update({ where: { id: match.nextMatchId }, data: clearField });
      }
      const winUpdate = match.nextMatchSlot === 1 ? { player1Id: winnerId } : { player2Id: winnerId };
      await tx.match.update({ where: { id: match.nextMatchId }, data: winUpdate });
    } else if (match.nextMatchId && match.nextMatchSlot && !prevWinnerId) {
      // First time — set winner in next match
      const winUpdate = match.nextMatchSlot === 1 ? { player1Id: winnerId } : { player2Id: winnerId };
      await tx.match.update({ where: { id: match.nextMatchId }, data: winUpdate });
    }

    // Double elim: send loser to losers bracket (only on first completion)
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
    if (!isEdit && loserNextMatchId && match.loserNextMatchSlot) {
      const loseUpdate =
        match.loserNextMatchSlot === 1
          ? { player1Id: loserId }
          : { player2Id: loserId };
      await tx.match.update({ where: { id: loserNextMatchId }, data: loseUpdate });
    }

    // Check if tournament is complete
    const remaining = await tx.match.count({
      where: {
        tournamentId: match.tournamentId,
        completedAt: null,
        isBye: false,
        player1Id: { not: null },
        player2Id: { not: null },
      },
    });
    if (remaining === 0) {
      await tx.tournament.update({
        where: { id: match.tournamentId },
        data: { status: "COMPLETED" },
      });
    }
  });

  const updated = await prisma.match.findUnique({
    where: { id },
    include: { scoreHistory: { orderBy: { createdAt: "desc" } } },
  });
  return NextResponse.json(updated);
}
