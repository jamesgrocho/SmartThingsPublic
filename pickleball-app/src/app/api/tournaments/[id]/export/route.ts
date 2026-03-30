import { NextRequest, NextResponse } from "next/server";
import { auth, getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(d: Date | string | null): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function csvRow(cells: (string | number | null | undefined)[]): string {
  return cells
    .map((c) => {
      const v = c == null ? "" : String(c);
      return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    })
    .join(",");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const user = getSessionUser(session as { user?: unknown });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      players: true,
      matches: {
        where: { completedAt: { not: null }, isBye: false },
        orderBy: [{ round: "asc" }, { position: "asc" }],
      },
    },
  });

  if (!tournament) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const playerMap = Object.fromEntries(tournament.players.map((p) => [p.id, p]));

  const headers = [
    "matchType",
    "scoreType",
    "event",
    "date",
    "playerA1",
    "playerA1DuprId",
    "playerA2",
    "playerA2DuprId",
    "playerB1",
    "playerB1DuprId",
    "playerB2",
    "playerB2DuprId",
    "teamAGame1",
    "teamBGame1",
    "teamAGame2",
    "teamBGame2",
    "teamAGame3",
    "teamBGame3",
    "teamAGame4",
    "teamBGame4",
    "teamAGame5",
    "teamBGame5",
  ];

  const rows: string[] = [csvRow(headers)];

  for (const match of tournament.matches) {
    if (!match.player1Id || !match.player2Id || !match.winnerId) continue;

    const p1 = playerMap[match.player1Id];
    const p2 = playerMap[match.player2Id];
    if (!p1 || !p2) continue;

    // DUPR: Team A = player1, Team B = player2
    const matchType = tournament.matchType; // "S" or "D"
    const scoreType = tournament.scoreType;
    const event = `${tournament.name}`;
    const date = formatDate(match.completedAt);

    const p1FullName = `${p1.firstName} ${p1.lastName}`;
    const p2FullName = `${p2.firstName} ${p2.lastName}`;

    const games = [
      { a: match.game1P1, b: match.game1P2 },
      { a: match.game2P1, b: match.game2P2 },
      { a: match.game3P1, b: match.game3P2 },
      { a: match.game4P1, b: match.game4P2 },
      { a: match.game5P1, b: match.game5P2 },
    ];

    rows.push(
      csvRow([
        matchType,
        scoreType,
        event,
        date,
        // Singles: playerA1 + playerB1 filled; A2/B2 empty
        p1FullName,          // playerA1
        p1.duprId ?? "",     // playerA1DuprId
        matchType === "D" ? "" : "", // playerA2 (doubles only)
        "",                  // playerA2DuprId
        p2FullName,          // playerB1
        p2.duprId ?? "",     // playerB1DuprId
        "",                  // playerB2 (doubles only)
        "",                  // playerB2DuprId
        // Games
        games[0].a ?? "",
        games[0].b ?? "",
        games[1].a ?? "",
        games[1].b ?? "",
        games[2].a ?? "",
        games[2].b ?? "",
        games[3].a ?? "",
        games[3].b ?? "",
        games[4].a ?? "",
        games[4].b ?? "",
      ])
    );
  }

  const csv = rows.join("\r\n");
  const filename = `${tournament.name.replace(/[^a-z0-9]/gi, "_")}_dupr.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
