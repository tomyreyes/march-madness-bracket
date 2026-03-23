"use client";

import { GitCompare } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bracket } from "@/components/bracket/Bracket";
import { ParticipantPicker } from "@/components/ParticipantPicker";
import type { GameNode, Meta, Participant, Team } from "@/lib/bracket-types";
import { PINNED_PARTICIPANT_STORAGE_KEY } from "@/lib/constants";

export type BracketAppPayload = {
  teamsById: Record<string, Team>;
  gamesBySlot: Record<string, GameNode>;
  games: GameNode[];
  meta: Meta;
  participants: Participant[];
  actualBySlot: Record<string, string>;
  tournamentSyncedAt: string | null;
};

function buildUrl(pathname: string, participant: string, diff: boolean): string {
  const p = new URLSearchParams();
  p.set("participant", participant);
  p.set("diff", diff ? "1" : "0");
  return `${pathname}?${p.toString()}`;
}

export function BracketApp({
  teamsById,
  gamesBySlot,
  games,
  meta,
  participants,
  actualBySlot,
  tournamentSyncedAt,
}: BracketAppPayload) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const fallbackId = meta.fallbackParticipantId ?? participants[0]?.id ?? "";

  const [selectedId, setSelectedId] = useState<string>(fallbackId);
  const [diffOn, setDiffOn] = useState<boolean>(searchParams.get("diff") === "1");
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const validId = useCallback(
    (id: string | null): id is string => Boolean(id && participants.some((p) => p.id === id)),
    [participants],
  );

  useEffect(() => {
    setPinnedId(localStorage.getItem(PINNED_PARTICIPANT_STORAGE_KEY));
  }, []);

  useEffect(() => {
    const q = searchParams.get("participant");
    const d = searchParams.get("diff") === "1";
    setDiffOn(d);

    if (validId(q)) {
      setSelectedId(q);
      return;
    }

    const pin = localStorage.getItem(PINNED_PARTICIPANT_STORAGE_KEY);
    const pick = validId(pin) ? pin : fallbackId;
    setSelectedId(pick);
    router.replace(buildUrl(pathname, pick, d));
  }, [searchParams, router, pathname, validId, fallbackId]);

  const viewParticipant = useMemo(
    () => participants.find((p) => p.id === selectedId) ?? participants[0],
    [participants, selectedId],
  );

  const pinnedParticipant = useMemo(
    () => (pinnedId ? participants.find((p) => p.id === pinnedId) ?? null : null),
    [participants, pinnedId],
  );

  const pushParticipant = (id: string) => {
    setSelectedId(id);
    router.replace(buildUrl(pathname, id, diffOn));
  };

  const toggleDiff = (next: boolean) => {
    setDiffOn(next);
    router.replace(buildUrl(pathname, selectedId, next));
  };

  const onPin = () => {
    localStorage.setItem(PINNED_PARTICIPANT_STORAGE_KEY, selectedId);
    setPinnedId(selectedId);
  };

  const onUnpin = () => {
    localStorage.removeItem(PINNED_PARTICIPANT_STORAGE_KEY);
    setPinnedId(null);
  };

  if (!viewParticipant) {
    return <div className="p-6 text-sm text-zinc-300">No participants loaded.</div>;
  }

  const officialCount = Object.keys(actualBySlot).length;

  return (
    <div className="mx-auto max-w-[120rem] space-y-6 px-4 pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{meta.tournamentLabel}</h1>
        <p className="text-sm leading-relaxed text-zinc-400 md:leading-normal">
          Pick a bracket, pin yourself for comparisons, and toggle Diff to see how picks line up with yours.
        </p>
        {officialCount > 0 ? (
          <p className="text-xs text-sky-200/90">
            Official results loaded ({officialCount} games)
            {tournamentSyncedAt ? ` — last sync ${tournamentSyncedAt}` : null}. Cards show whether your pick
            matches the winner.
          </p>
        ) : null}
      </header>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <ParticipantPicker
            participants={participants}
            selectedId={selectedId}
            pinnedId={pinnedId}
            onSelect={pushParticipant}
            onPin={onPin}
            onUnpin={onUnpin}
          />
        </div>
        <div className="flex min-h-[44px] items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 sm:py-3">
          <GitCompare className="h-5 w-5 shrink-0 text-zinc-400" />
          <div className="flex flex-col justify-center">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Diff</span>
            <button
              type="button"
              role="switch"
              aria-checked={diffOn}
              onClick={() => toggleDiff(!diffOn)}
              className={[
                "relative mt-1 h-11 w-[4.25rem] rounded-full transition-colors",
                diffOn ? "bg-emerald-600" : "bg-zinc-700",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-1 h-9 w-9 rounded-full bg-white shadow transition-transform",
                  diffOn ? "left-[calc(100%-2.25rem-0.25rem)]" : "left-1",
                ].join(" ")}
              />
            </button>
          </div>
        </div>
      </div>

      {diffOn && !pinnedParticipant ? (
        <p className="rounded-md border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
          Diff needs a pinned profile. Choose your bracket above and tap <strong>Pin me</strong>.
        </p>
      ) : null}

      <Bracket
        games={games}
        viewParticipant={viewParticipant}
        pinnedParticipant={pinnedParticipant}
        allParticipants={participants}
        teamsById={teamsById}
        gamesBySlot={gamesBySlot}
        diffEnabled={diffOn}
        actualBySlot={actualBySlot}
      />
    </div>
  );
}
