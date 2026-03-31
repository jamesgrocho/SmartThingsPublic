"use client";
import { useState, useEffect, useRef } from "react";

interface CREvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface CRRegistrant {
  firstName: string;
  lastName: string;
  email: string;
  memberNumber: string;
}

interface Props {
  onClose: () => void;
  onImport: (players: { firstName: string; lastName: string; duprId: string }[]) => void;
}

function fmtDate(iso: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return iso; }
}

export default function ImportFromEventModal({ onClose, onImport }: Props) {
  const [events, setEvents] = useState<CREvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [search, setSearch] = useState("");

  const [selectedEvent, setSelectedEvent] = useState<CREvent | null>(null);
  const [registrants, setRegistrants] = useState<CRRegistrant[]>([]);
  const [loadingReg, setLoadingReg] = useState(false);
  const [regError, setRegError] = useState("");

  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { searchRef.current?.focus(); }, []);

  function handleSearchChange(val: string) {
    setSearch(val);
    setEventsError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val || val.length < 2) { setEvents([]); setLoadingEvents(false); return; }
    setLoadingEvents(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/courtreserve/events?q=${encodeURIComponent(val)}`)
        .then((r) => r.json())
        .then((d) => {
          if (Array.isArray(d)) setEvents(d);
          else setEventsError(d.error ?? "Failed to load events");
        })
        .catch(() => setEventsError("Failed to load events"))
        .finally(() => setLoadingEvents(false));
    }, 350);
  }

  async function selectEvent(ev: CREvent) {
    setSelectedEvent(ev);
    setRegistrants([]);
    setRegError("");
    setLoadingReg(true);

    // Use the event's date range (same day window if same day event)
    const from = ev.startDate.split("T")[0];
    const to   = (ev.endDate || ev.startDate).split("T")[0];

    try {
      const res = await fetch(
        `/api/courtreserve/events/registrations?eventDateFrom=${from}&eventDateTo=${to}&eventId=${encodeURIComponent(ev.id)}&eventName=${encodeURIComponent(ev.name)}`
      );
      const data = await res.json();
      if (Array.isArray(data)) setRegistrants(data);
      else setRegError(data.error ?? "Failed to load registrations");
    } catch {
      setRegError("Failed to load registrations");
    } finally {
      setLoadingReg(false);
    }
  }

  function handleImport() {
    onImport(registrants.map((r) => ({ firstName: r.firstName, lastName: r.lastName, duprId: "" })));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gg-card border border-gg-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gg-border">
          <div>
            <h2 className="font-semibold text-white">Import from CourtReserve Event</h2>
            <p className="text-xs text-gg-muted mt-0.5">Search and select an event to pull registered players</p>
          </div>
          <button onClick={onClose} className="text-gg-muted hover:text-white text-2xl leading-none">×</button>
        </div>

        {!selectedEvent ? (
          /* Event search */
          <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3">
            <input
              ref={searchRef}
              className="input text-sm"
              placeholder="Type event name to search…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <div className="flex-1 overflow-y-auto space-y-1">
              {loadingEvents && (
                <div className="flex items-center justify-center py-10 text-gg-muted text-sm gap-2">
                  <div className="w-4 h-4 border-2 border-gg-green/40 border-t-gg-green rounded-full animate-spin" />
                  Loading events…
                </div>
              )}
              {eventsError && <p className="text-red-400 text-sm text-center py-6">{eventsError}</p>}
              {!loadingEvents && !eventsError && search.length < 2 && (
                <p className="text-gg-muted text-sm text-center py-10">Start typing to search events</p>
              )}
              {!loadingEvents && !eventsError && search.length >= 2 && events.length === 0 && (
                <p className="text-gg-muted text-sm text-center py-6">No events found for &quot;{search}&quot;</p>
              )}
              {events.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => selectEvent(ev)}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-gg-card-2 border border-transparent hover:border-gg-border transition-colors group"
                >
                  <div className="text-sm font-medium text-white group-hover:text-gg-green transition-colors">
                    {ev.name}
                  </div>
                  <div className="text-xs text-gg-muted mt-0.5">{fmtDate(ev.startDate)}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Registrants preview */
          <div className="flex flex-col flex-1 overflow-hidden p-4 gap-3">
            <button
              onClick={() => setSelectedEvent(null)}
              className="text-xs text-gg-muted hover:text-white flex items-center gap-1 w-fit"
            >
              ← Back to events
            </button>
            <div className="bg-gg-card-2 rounded-xl px-4 py-3 border border-gg-border">
              <div className="text-sm font-medium text-white">{selectedEvent.name}</div>
              <div className="text-xs text-gg-muted">{fmtDate(selectedEvent.startDate)}</div>
            </div>

            {loadingReg && (
              <div className="flex items-center justify-center py-8 text-gg-muted text-sm gap-2">
                <div className="w-4 h-4 border-2 border-gg-green/40 border-t-gg-green rounded-full animate-spin" />
                Loading registrations…
              </div>
            )}
            {regError && <p className="text-red-400 text-sm text-center py-4">{regError}</p>}

            {!loadingReg && !regError && registrants.length > 0 && (
              <>
                <p className="text-xs text-gg-muted">
                  <span className="text-gg-green font-semibold">{registrants.length}</span> registered players
                </p>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {registrants.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gg-card-2">
                      <div className="w-6 h-6 rounded-full bg-gg-green/10 border border-gg-green/20 flex items-center justify-center text-gg-green text-xs font-bold flex-none">
                        {r.firstName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{r.firstName} {r.lastName}</div>
                        {r.email && <div className="text-xs text-gg-muted truncate">{r.email}</div>}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleImport} className="btn-primary w-full">
                  Import {registrants.length} Players
                </button>
              </>
            )}

            {!loadingReg && !regError && registrants.length === 0 && (
              <p className="text-gg-muted text-sm text-center py-6">No registered players found for this event</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
