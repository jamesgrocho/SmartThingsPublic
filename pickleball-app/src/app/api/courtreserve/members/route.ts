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

// In-memory cache — survives across requests in the same server process
let memberCache: Record<string, unknown>[] = [];
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function extractDupr(m: Record<string, unknown>): string {
  // Top-level field (only present when set)
  if (m.DuprId && String(m.DuprId).trim()) return String(m.DuprId).trim();

  // UserDefinedFields: [{Label: "DUPR ID", Value: "V760R7"}, ...]
  const udf = m.UserDefinedFields;
  if (Array.isArray(udf)) {
    for (const f of udf as Record<string, unknown>[]) {
      const label = String(f.Label ?? f.Name ?? "").toLowerCase();
      if (label.includes("dupr") && f.Value && String(f.Value).trim()) {
        return String(f.Value).trim();
      }
    }
  }

  // Ratings array
  const ratings = m.Ratings;
  if (Array.isArray(ratings)) {
    for (const r of ratings as Record<string, unknown>[]) {
      const label = String(r.Label ?? r.RatingType ?? r.Name ?? "").toLowerCase();
      if (label.includes("dupr") && (label.includes("id") || label.includes("number")) && r.Value) {
        return String(r.Value).trim();
      }
    }
  }

  return "";
}

async function loadAllMembers(credentials: string): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];

  // Fetch first page to find total pages
  const firstRes = await fetch(
    `https://api.courtreserve.com/api/v1/member/get?orgId=${ORG_ID}&pageNumber=1&pageSize=100`,
    { headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" } }
  );
  if (!firstRes.ok) return [];
  const firstData = await firstRes.json();
  const totalPages: number = firstData?.Data?.TotalPages ?? 1;
  all.push(...(firstData?.Data?.Members ?? []));

  console.log(`CourtReserve: loading ${totalPages} pages of members...`);

  // Fetch remaining pages in parallel batches of 10
  for (let batch = 1; batch < totalPages; batch += 10) {
    const end = Math.min(batch + 10, totalPages);
    const fetches = [];
    for (let p = batch + 1; p <= end; p++) {
      fetches.push(
        fetch(
          `https://api.courtreserve.com/api/v1/member/get?orgId=${ORG_ID}&pageNumber=${p}&pageSize=100`,
          { headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" } }
        ).then((r) => r.json()).then((d) => d?.Data?.Members ?? [])
      );
    }
    const results = await Promise.all(fetches);
    for (const page of results) all.push(...page);
  }

  console.log(`CourtReserve: loaded ${all.length} members total`);
  return all;
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

  // Refresh cache if stale
  if (memberCache.length === 0 || Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
    memberCache = await loadAllMembers(credentials);
    cacheLoadedAt = Date.now();
  }

  const qLower = q.toLowerCase();
  const filtered = memberCache
    .filter((m) => {
      const first = String(m.FirstName ?? "").toLowerCase();
      const last = String(m.LastName ?? "").toLowerCase();
      return first.startsWith(qLower) || last.startsWith(qLower) ||
             `${first} ${last}`.includes(qLower);
    })
    .slice(0, 10)
    .map((m) => {
      const duprId = extractDupr(m);
      // Log members with DUPR so we can verify field mapping
      if (duprId) console.log("Member with DUPR:", m.FirstName, m.LastName, "->", duprId);
      return {
        id: String(m.OrganizationMemberId ?? ""),
        firstName: String(m.FirstName ?? ""),
        lastName: String(m.LastName ?? ""),
        email: String(m.Email ?? ""),
        duprId,
      } as CRMember;
    });

  return NextResponse.json(filtered);
}
