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
  duprId: string;
}

function extractDupr(m: Record<string, unknown>): string {
  // Check top-level DuprId field
  if (m.DuprId && String(m.DuprId).trim()) return String(m.DuprId).trim();

  // Check UserDefinedFields array: [{Label: "DUPR ID", Value: "V760R7"}, ...]
  const udf = m.UserDefinedFields;
  if (Array.isArray(udf)) {
    for (const f of udf as Record<string, unknown>[]) {
      const label = String(f.Label ?? f.Name ?? "").toLowerCase();
      if (label.includes("dupr") && f.Value && String(f.Value).trim()) {
        return String(f.Value).trim();
      }
    }
  }

  // Check Ratings array for DUPR ID
  const ratings = m.Ratings;
  if (Array.isArray(ratings)) {
    for (const r of ratings as Record<string, unknown>[]) {
      const label = String(r.Label ?? r.RatingType ?? r.Name ?? "").toLowerCase();
      if (label.includes("dupr") && label.includes("id") && r.Value) {
        return String(r.Value).trim();
      }
    }
  }

  return "";
}

async function fetchPage(credentials: string, page: number, q: string) {
  // Try with name search param — CourtReserve may support it
  const url = new URL(`https://api.courtreserve.com/api/v1/member/get`);
  url.searchParams.set("orgId", ORG_ID);
  url.searchParams.set("pageNumber", String(page));
  url.searchParams.set("pageSize", "100");
  // Try common search param names
  url.searchParams.set("name", q);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = getSessionUser(session as { user?: unknown });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q || q.length < 2) return NextResponse.json([]);

  const credentials = Buffer.from(`${CR_USER}:${CR_PASS}`).toString("base64");
  const qLower = q.toLowerCase();

  try {
    // Fetch page 1 with name filter — if CourtReserve supports it we'll get targeted results
    const data = await fetchPage(credentials, 1, q);
    if (!data) return NextResponse.json({ error: "CourtReserve API error" }, { status: 502 });

    const members: Record<string, unknown>[] = data?.Data?.Members ?? [];
    const totalPages: number = data?.Data?.TotalPages ?? 1;

    let filtered = members.filter((m) => {
      const first = String(m.FirstName ?? "").toLowerCase();
      const last = String(m.LastName ?? "").toLowerCase();
      return first.includes(qLower) || last.includes(qLower) || `${first} ${last}`.includes(qLower);
    });

    // If page 1 has no matches, CourtReserve likely ignored our name param —
    // fetch a few more pages to widen the search (up to 5 pages)
    if (filtered.length === 0 && totalPages > 1) {
      const extraPages = Math.min(totalPages, 5);
      for (let p = 2; p <= extraPages; p++) {
        const pageData = await fetchPage(credentials, p, q);
        const pageMembers: Record<string, unknown>[] = pageData?.Data?.Members ?? [];
        const pageMatches = pageMembers.filter((m) => {
          const first = String(m.FirstName ?? "").toLowerCase();
          const last = String(m.LastName ?? "").toLowerCase();
          return first.includes(qLower) || last.includes(qLower) || `${first} ${last}`.includes(qLower);
        });
        filtered = [...filtered, ...pageMatches];
        if (filtered.length >= 10) break;
      }
    }

    // Log a matched member with DUPR to verify field mapping
    const withDupr = filtered.find((m) => extractDupr(m));
    if (withDupr) console.log("Member with DUPR:", JSON.stringify(withDupr));
    else if (filtered.length > 0) console.log("Sample member (no DUPR):", JSON.stringify(filtered[0]));

    const results: CRMember[] = filtered.slice(0, 10).map((m) => ({
      id: String(m.OrganizationMemberId ?? ""),
      firstName: String(m.FirstName ?? ""),
      lastName: String(m.LastName ?? ""),
      email: String(m.Email ?? ""),
      duprId: extractDupr(m),
    }));

    return NextResponse.json(results);
  } catch (err) {
    console.error("CourtReserve fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach CourtReserve" }, { status: 502 });
  }
}
