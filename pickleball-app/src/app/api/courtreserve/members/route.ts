import { NextRequest, NextResponse } from "next/server";
import { auth, getSessionUser } from "@/lib/auth";

const ORG_ID = process.env.COURTRESERVE_ORG_ID!;
const CR_USER = process.env.COURTRESERVE_USERNAME!;
const CR_PASS = process.env.COURTRESERVE_PASSWORD!;

export interface CRMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = getSessionUser(session as { user?: unknown });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.toLowerCase().trim() ?? "";
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const credentials = Buffer.from(`${CR_USER}:${CR_PASS}`).toString("base64");

  try {
    const res = await fetch(
      `https://api.courtreserve.com/api/v1/member/get?orgId=${ORG_ID}`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          Accept: "application/json",
        },
        // Cache results for 5 minutes to avoid hammering the API
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      console.error("CourtReserve API error:", res.status, await res.text());
      return NextResponse.json({ error: "CourtReserve API error" }, { status: 502 });
    }

    const data = await res.json();
    // CourtReserve wraps results in a Data array
    const members: Record<string, unknown>[] = data?.Data ?? data ?? [];

    // Filter by the search query against first/last name
    const filtered = members
      .filter((m) => {
        const first = String(m.FirstName ?? "").toLowerCase();
        const last = String(m.LastName ?? "").toLowerCase();
        const full = `${first} ${last}`;
        return first.includes(q) || last.includes(q) || full.includes(q);
      })
      .slice(0, 10) // max 10 suggestions
      .map((m) => ({
        id: String(m.Id ?? m.id ?? ""),
        firstName: String(m.FirstName ?? m.firstName ?? ""),
        lastName: String(m.LastName ?? m.lastName ?? ""),
        email: String(m.Email ?? m.email ?? ""),
      }));

    return NextResponse.json(filtered);
  } catch (err) {
    console.error("CourtReserve fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach CourtReserve" }, { status: 502 });
  }
}
