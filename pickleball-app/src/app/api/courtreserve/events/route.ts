import { NextResponse } from "next/server";
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

export async function GET() {
  const session = await auth();
  const user = getSessionUser(session as { user?: unknown });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const credentials = Buffer.from(`${CR_USER}:${CR_PASS}`).toString("base64");

  // Fetch events from 60 days ago to 60 days ahead
  const from = new Date();
  from.setDate(from.getDate() - 60);
  const to = new Date();
  to.setDate(to.getDate() + 60);

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
      const text = await res.text();
      console.error("CourtReserve events error:", res.status, text);
      return NextResponse.json({ error: "CourtReserve API error" }, { status: 502 });
    }

    const data = await res.json();
    console.log("Events response keys:", Object.keys(data ?? {}));
    console.log("Events sample:", JSON.stringify(data).slice(0, 600));

    const raw: Record<string, unknown>[] = data?.Data ?? data?.Events ?? data?.data ?? (Array.isArray(data) ? data : []);

    const events: CREvent[] = raw.map((e) => ({
      id: String(e.Id ?? e.EventId ?? e.id ?? ""),
      name: String(e.Name ?? e.EventName ?? e.Title ?? ""),
      startDate: String(e.StartDate ?? e.EventDate ?? e.Start ?? ""),
      endDate: String(e.EndDate ?? e.End ?? e.StartDate ?? ""),
    })).filter((e) => e.id && e.name);

    return NextResponse.json(events);
  } catch (err) {
    console.error("CourtReserve events fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach CourtReserve" }, { status: 502 });
  }
}
