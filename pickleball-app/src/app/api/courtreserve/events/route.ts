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
    const res = await fetch(
      `https://api.courtreserve.com/api/v1/eventcalendar/eventlist?orgId=${ORG_ID}&startDate=${fmt(from)}&endDate=${fmt(to)}`,
      {
        headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "CourtReserve API error" }, { status: 502 });
    }

    const data = await res.json();
    const raw: Record<string, unknown>[] = Array.isArray(data?.Data) ? data.Data : [];

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

    return NextResponse.json(events);
  } catch (err) {
    console.error("CourtReserve events fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach CourtReserve" }, { status: 502 });
  }
}
