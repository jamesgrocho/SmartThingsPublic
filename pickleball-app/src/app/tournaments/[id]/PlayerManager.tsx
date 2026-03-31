"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  duprId: string | null;
}

interface CRSuggestion {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Props {
  tournamentId: string;
  players: Player[];
  maxPlayers: number;
}

function parseCSV(text: string): { firstName: string; lastName: string; duprId: string }[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const results: { firstName: string; lastName: string; duprId: string }[] = [];
  for (const line of lines) {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.length >= 2 && cols[0] && cols[1]) {
      results.push({ firstName: cols[0], lastName: cols[1], duprId: cols[2] ?? "" });
    }
  }
  return results;
}

export default function PlayerManager({ tournamentId, players: initial, maxPlayers }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [players, setPlayers] = useState<Player[]>(initial);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [duprId, setDuprId] = useState("");
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<CRSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeField, setActiveField] = useState<"first" | "last" | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isFull = players.length >= maxPlayers;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchCR = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/courtreserve/members?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setSuggestions(data);
            setShowDropdown(true);
          } else {
            setSuggestions([]);
            setShowDropdown(false);
          }
        }
      } catch {
        // silently fail — user can still type manually
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  function selectSuggestion(s: CRSuggestion) {
    setFirstName(s.firstName);
    setLastName(s.lastName);
    setShowDropdown(false);
    setSuggestions([]);
    setActiveField(null);
  }

  function handleFirstNameChange(val: string) {
    setFirstName(val);
    setActiveField("first");
    searchCR(val || lastName);
  }

  function handleLastNameChange(val: string) {
    setLastName(val);
    setActiveField("last");
    searchCR(val || firstName);
  }

  async function addOne(fn: string, ln: string, did: string): Promise<Player | null> {
    const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: fn, lastName: ln, duprId: did }),
    });
    if (!res.ok) return null;
    return res.json();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdding(true);
    const player = await addOne(firstName, lastName, duprId);
    setAdding(false);
    if (!player) { setError("Failed to add player"); return; }
    setPlayers((prev) => [...prev, player]);
    setFirstName(""); setLastName(""); setDuprId("");
    setSuggestions([]); setShowDropdown(false);
    router.refresh();
  }

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setError("");
    const text = await file.text();
    const rows = parseCSV(text);
    let added = 0;
    for (const row of rows) {
      if (players.length + added >= maxPlayers) break;
      const player = await addOne(row.firstName, row.lastName, row.duprId);
      if (player) { setPlayers((prev) => [...prev, player]); added++; }
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
    if (added === 0) setError("No valid rows found. Format: FirstName, LastName[, DuprId]");
    router.refresh();
  }

  async function removePlayer(playerId: string) {
    const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); return; }
    setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    router.refresh();
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white">
          Players <span className="text-gg-muted font-normal text-sm">({players.length} / {maxPlayers})</span>
        </h2>
        {!isFull && (
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCSV} />
            <button
              onClick={() => fileRef.current?.click()}
              className="btn-ghost text-xs py-1"
              disabled={importing}
              title="Import CSV: FirstName, LastName[, DuprId]"
            >
              {importing ? "Importing…" : "Import CSV"}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Add player form */}
      {!isFull && (
        <form onSubmit={handleAdd} className="mb-5 space-y-2">
          {/* Name fields with autocomplete */}
          <div className="relative" ref={dropdownRef}>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input
                  className="input text-sm w-full"
                  placeholder="First name *"
                  value={firstName}
                  onChange={(e) => handleFirstNameChange(e.target.value)}
                  onFocus={() => { setActiveField("first"); if (firstName.length >= 2 || lastName.length >= 2) searchCR(firstName || lastName); }}
                  autoComplete="off"
                  required
                />
                {searching && activeField === "first" && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 border-2 border-gg-green/40 border-t-gg-green rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div className="relative">
                <input
                  className="input text-sm w-full"
                  placeholder="Last name *"
                  value={lastName}
                  onChange={(e) => handleLastNameChange(e.target.value)}
                  onFocus={() => { setActiveField("last"); if (lastName.length >= 2 || firstName.length >= 2) searchCR(lastName || firstName); }}
                  autoComplete="off"
                  required
                />
                {searching && activeField === "last" && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="w-3 h-3 border-2 border-gg-green/40 border-t-gg-green rounded-full animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {/* Dropdown suggestions */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-gg-card border border-gg-border-2 rounded-xl shadow-xl overflow-hidden">
                <div className="px-3 py-1.5 text-xs text-gg-muted border-b border-gg-border flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gg-green inline-block" />
                  CourtReserve members
                </div>
                <ul>
                  {suggestions.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-gg-card-2 transition-colors flex items-center gap-3 group"
                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                      >
                        <div className="w-7 h-7 rounded-full bg-gg-green/10 border border-gg-green/20 flex items-center justify-center text-gg-green text-xs font-bold flex-none group-hover:bg-gg-green/20">
                          {s.firstName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">
                            {s.firstName} {s.lastName}
                          </div>
                          {s.email && (
                            <div className="text-xs text-gg-muted truncate">{s.email}</div>
                          )}
                        </div>
                        <span className="text-xs text-gg-green opacity-0 group-hover:opacity-100 flex-none">
                          Select →
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="px-3 py-1.5 text-xs text-gg-muted border-t border-gg-border">
                  Not listed? Type manually and press Add Player.
                </div>
              </div>
            )}
          </div>

          <input
            className="input text-sm font-mono"
            placeholder="DUPR ID (optional)"
            value={duprId}
            onChange={(e) => setDuprId(e.target.value)}
          />
          <button type="submit" className="btn-primary w-full text-sm" disabled={adding}>
            {adding ? "Adding…" : "+ Add Player"}
          </button>
        </form>
      )}

      {isFull && (
        <div className="text-xs text-gg-muted mb-4 text-center">
          Tournament is full ({maxPlayers} players max)
        </div>
      )}

      {/* Player list */}
      {players.length === 0 ? (
        <p className="text-gg-muted text-sm">No players yet. Add them above or import a CSV.</p>
      ) : (
        <ul className="divide-y divide-gg-border">
          {players.map((p, i) => (
            <li key={p.id} className="flex items-center gap-3 py-2.5">
              <span className="w-5 text-xs text-gg-muted text-right flex-none">{i + 1}</span>
              <div className="w-7 h-7 rounded-full bg-gg-green/10 border border-gg-green/20 flex items-center justify-center text-gg-green text-xs font-bold flex-none">
                {p.firstName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{p.firstName} {p.lastName}</div>
                {p.duprId && <div className="text-xs text-gg-muted font-mono">{p.duprId}</div>}
              </div>
              <button
                onClick={() => removePlayer(p.id)}
                className="flex-none text-gg-muted hover:text-red-400 transition-colors text-lg leading-none px-1"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gg-muted mt-4 border-t border-gg-border pt-3">
        CSV format: <span className="font-mono">FirstName, LastName, DuprId</span>
      </p>
    </div>
  );
}
