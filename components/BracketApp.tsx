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
};

function buildUrl(pathname: string, participant: string, diff: boolean): string {
  const p = new URLSearchParams();
  p.set("participant", participant);
  p.set("diff", diff ? "1" : "0");
  return `${pathname}?${p.toString()}`;
}

export function BracketApp({ teamsById, gamesBySlot, games, meta, participants }: BracketAppPayload) {
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

  return (
    <div className="mx-auto max-w-[120rem] space-y-6 px-4 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{meta.tournamentLabel}</h1>
        <p className="text-sm text-zinc-400">
          Pick a bracket, pin yourself for comparisons, and toggle Diff to see how picks line up with yours.
        </p>
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
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-3">
          <GitCompare className="h-5 w-5 text-zinc-400" />
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Diff</span>
            <button
              type="button"
              role="switch"
              aria-checked={diffOn}
              onClick={() => toggleDiff(!diffOn)}
              className={[
                "relative mt-1 h-7 w-12 rounded-full transition-colors",
                diffOn ? "bg-emerald-600" : "bg-zinc-700",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute top-0.5 h-6 w-6 rounded-full bg-white transition-transform",
                  diffOn ? "left-5" : "left-0.5",
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
      />
    </div>
  );
}
