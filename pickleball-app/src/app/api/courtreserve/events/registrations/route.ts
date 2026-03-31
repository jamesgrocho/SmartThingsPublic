import { NextRequest, NextResponse } from "next/server";
import { auth, getSessionUser } from "@/lib/auth";

const ORG_ID = process.env.COURTRESERVE_ORG_ID!;
const CR_USER = process.env.COURTRESERVE_USERNAME!;
const CR_PASS = process.env.COURTRESERVE_PASSWORD!;

export interface CRRegistrant {
  firstName: string;
  lastName: string;
  email: string;
  memberNumber: string;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const user = getSessionUser(session as { user?: unknown });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const eventDateFrom = req.nextUrl.searchParams.get("eventDateFrom");
  const eventDateTo   = req.nextUrl.searchParams.get("eventDateTo");
  const eventId       = req.nextUrl.searchParams.get("eventId") ?? "";
  const eventName     = req.nextUrl.searchParams.get("eventName") ?? "";

  if (!eventDateFrom || !eventDateTo) {
    return NextResponse.json({ error: "eventDateFrom and eventDateTo are required" }, { status: 400 });
  }

  const credentials = Buffer.from(`${CR_USER}:${CR_PASS}`).toString("base64");

  try {
    const url = new URL("https://api.courtreserve.com/api/v1/eventregistrationreport/listactive");
    url.searchParams.set("orgId", ORG_ID);
    url.searchParams.set("eventDateFrom", eventDateFrom);
    url.searchParams.set("eventDateTo", eventDateTo);
    url.searchParams.set("includePartnerInfo", "true");
    url.searchParams.set("includeUserDefinedFields", "true");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
    });

    if (!res.ok) {
      console.error("CourtReserve registrations error:", res.status, await res.text());
      return NextResponse.json({ error: "CourtReserve API error" }, { status: 502 });
    }

    const data = await res.json();
    const allRecords: Record<string, unknown>[] = data?.Data ?? data?.data ?? (Array.isArray(data) ? data : []);

    if (allRecords.length > 0) {
      console.log("First registration record:", JSON.stringify(allRecords[0]).slice(0, 500));
    }

    // Filter to only the selected event by ID or name
    const raw = allRecords.filter((r) => {
      if (eventId && (String(r.EventId ?? r.ReservationId ?? "") === eventId)) return true;
      if (eventName && String(r.EventName ?? "").toLowerCase() === eventName.toLowerCase()) return true;
      // If no match possible, include all (fallback)
      return !eventId && !eventName;
    });

    console.log(`Registrations: ${allRecords.length} total on that date, ${raw.length} for this event`);

    // Deduplicate by full name
    const seen = new Set<string>();
    const registrants: CRRegistrant[] = [];

    for (const r of raw) {
      const firstName = String(r.MemberFirstName ?? r.FirstName ?? "").trim();
      const lastName  = String(r.MemberLastName  ?? r.LastName  ?? "").trim();
      if (!firstName || !lastName) continue;

      const status = String(r.RegistrationStatus ?? "").toLowerCase();
      if (status && status !== "registered" && status !== "active") continue;

      const key = `${firstName.toLowerCase()} ${lastName.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      registrants.push({
        firstName,
        lastName,
        email: String(r.MemberEmail ?? r.Email ?? ""),
        memberNumber: String(r.MemberNumber ?? ""),
      });
    }

    return NextResponse.json(registrants);
  } catch (err) {
    console.error("CourtReserve registrations fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach CourtReserve" }, { status: 502 });
  }
}
