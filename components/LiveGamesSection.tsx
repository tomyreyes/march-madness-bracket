"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameNode, Participant, Team } from "@/lib/bracket-types";
import type { LiveGamesApiPayload } from "@/lib/live-game-types";
import { LiveMatchupCard } from "@/components/LiveMatchupCard";

type Props = {
  viewParticipant: Participant;
  teamsById: Record<string, Team>;
  gamesBySlot: Record<string, GameNode>;
};

const POLL_MS = 30_000;

export function LiveGamesSection({
  viewParticipant,
  teamsById,
  gamesBySlot,
}: Props) {
  const [payload, setPayload] = useState<LiveGamesApiPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const u = new URL("/api/live-games", window.location.origin);
      const res = await fetch(u.toString());
      const json = (await res.json()) as LiveGamesApiPayload;
      setPayload(json);
      setLoadError(json.error ?? null);
    } catch {
      setPayload({
        games: [],
        dateKey: "",
        updatedAt: new Date().toISOString(),
        error: "Could not load live games.",
      });
      setLoadError("Could not load live games.");
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  if (!payload && !loadError) {
    return (
      <section aria-busy="true">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Live games</h2>
        <p className="text-sm text-zinc-500">Checking for games in progress…</p>
      </section>
    );
  }

  const games = payload?.games ?? [];
  if (games.length === 0) {
    if (loadError) {
      return (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">Live games</h2>
          <p className="text-xs text-amber-200/90">{loadError}</p>
          {payload?.errorDetail ? (
            <p className="mt-1 max-w-xl break-words font-mono text-[10px] text-zinc-500">{payload.errorDetail}</p>
          ) : null}
        </section>
      );
    }
    return null;
  }

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">Live games</h2>
        {payload?.updatedAt ? (
          <span className="text-[10px] text-zinc-600">
            Updated {new Date(payload.updatedAt).toLocaleTimeString()}
          </span>
        ) : null}
      </div>
      {loadError ? <p className="mb-2 text-xs text-amber-200/90">{loadError}</p> : null}
      <div className="flex flex-wrap gap-2">
        {games.map((live) => {
          const game = gamesBySlot[live.slotId] as GameNode | undefined;
          if (!game) return null;
          return (
            <LiveMatchupCard
              key={live.contestId}
              live={live}
              game={game}
              viewParticipant={viewParticipant}
              teamsById={teamsById}
            />
          );
        })}
      </div>
    </section>
  );
}
