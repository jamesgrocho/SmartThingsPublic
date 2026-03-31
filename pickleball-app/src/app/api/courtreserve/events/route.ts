import { NextRequest, NextResponse } from "next/server";
import { auth, getSessionUser } from "@/lib/auth";

const ORG_ID = process.env.COURTRESERVE_ORG_ID!;
const CR_USER = process.env.COURTRESERVE_USERNAME!;
const CR_PASS = process.env.COURTRESERVE_PASSWORD!;

export interface CREvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = getSessionUser(session as { user?: unknown });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.toLowerCase().trim() ?? "";
  if (!q || q.length < 2) return NextResponse.json([]);

  const credentials = Buffer.from(`${CR_USER}:${CR_PASS}`).toString("base64");

  // Fetch events from 90 days ago to 90 days ahead
  const from = new Date();
  from.setDate(from.getDate() - 90);
  const to = new Date();
  to.setDate(to.getDate() + 90);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  try {
    // Try multiple endpoints to find one that returns events
    const endpoints = [
      `https://api.courtreserve.com/api/v1/eventcalendar/eventlist?orgId=${ORG_ID}&startDate=${fmt(from)}&endDate=${fmt(to)}`,
      `https://api.courtreserve.com/api/v1/eventcalendar/eventlist?orgId=${ORG_ID}`,
      `https://api.courtreserve.com/api/v1/publicevent/eventlist?orgId=${ORG_ID}&startDate=${fmt(from)}&endDate=${fmt(to)}`,
      `https://api.courtreserve.com/api/v1/publicevent/eventlist?orgId=${ORG_ID}`,
    ];

    let raw: Record<string, unknown>[] = [];
    for (const url of endpoints) {
      console.log("Trying:", url);
      const r = await fetch(url, { headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" }, cache: "no-store" });
      if (!r.ok) { console.log("  -> HTTP", r.status); continue; }
      const d = await r.json();
      const candidate = Array.isArray(d?.Data) ? d.Data
        : Array.isArray(d?.Data?.Events) ? d.Data.Events
        : Array.isArray(d?.Data?.Data) ? d.Data.Data
        : Array.isArray(d) ? d : null;
      console.log(`  -> Data type: ${typeof d?.Data}, isArray: ${Array.isArray(d?.Data)}, candidate length: ${candidate?.length ?? "null"}`);
      if (candidate && candidate.length > 0) {
        console.log("  -> Found events! First:", JSON.stringify(candidate[0]).slice(0, 200));
        raw = candidate;
        break;
      }
    }
    if (raw.length === 0) {
      console.log("No events found from any endpoint");
    }

    console.log(`CourtReserve events: ${raw.length} total, searching "${q}"`);

    const events: CREvent[] = raw
      .filter((e) => String(e.EventName ?? "").toLowerCase().includes(q))
      .slice(0, 20)
      .map((e) => ({
        id: String(e.EventId ?? ""),
        name: String(e.EventName ?? ""),
        startDate: String(e.StartDateTime ?? ""),
        endDate: String(e.EndDateTime ?? e.StartDateTime ?? ""),
      }))
      .filter((e) => e.id && e.name);

    console.log(`CourtReserve events: ${events.length} matched`);
    if (raw.length > 0 && events.length === 0) {
      // Log first few event names to help debug why nothing matched
      console.log("Sample event names:", raw.slice(0, 5).map((e) => e.EventName));
    }

    return NextResponse.json(events);
  } catch (err) {
    console.error("CourtReserve events fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach CourtReserve" }, { status: 502 });
  }
}
