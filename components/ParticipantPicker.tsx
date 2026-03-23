"use client";

import { Pin, PinOff, Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Participant } from "@/lib/bracket-types";

type Props = {
  participants: Participant[];
  selectedId: string;
  pinnedId: string | null;
  onSelect: (id: string) => void;
  onPin: () => void;
  onUnpin: () => void;
};

export function ParticipantPicker({
  participants,
  selectedId,
  pinnedId,
  onSelect,
  onPin,
  onUnpin,
}: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) {
      return participants;
    }
    return participants.filter(
      (p) =>
        p.displayName.toLowerCase().includes(s) || p.id.toLowerCase().includes(s),
    );
  }, [participants, q]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <label className="text-xs font-medium uppercase tracking-wide text-zinc-400" htmlFor="participant-search">
          Bracket
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="participant-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or id…"
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 py-2 pl-8 pr-2 text-base text-zinc-100 placeholder:text-zinc-600 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 md:text-sm"
          />
        </div>
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 py-2 text-base text-zinc-100 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 md:text-sm"
        >
          {filtered.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName} ({p.id})
            </option>
          ))}
        </select>
        {filtered.length === 0 ? (
          <p className="text-xs text-amber-200/90">No matches — clear search.</p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          onClick={onPin}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          <Pin className="h-4 w-4" />
          Pin me
        </button>
        <button
          type="button"
          onClick={onUnpin}
          className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-800"
        >
          <PinOff className="h-4 w-4" />
          Unpin
        </button>
        <div className="w-full text-xs text-zinc-500 sm:w-auto sm:self-center">
          Pinned:{" "}
          <span className="text-zinc-200">
            {pinnedId ? participants.find((p) => p.id === pinnedId)?.displayName ?? pinnedId : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
