"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { getCardResultState } from "@/lib/bracket-actuals";
import type { GameNode, Participant, Team } from "@/lib/bracket-types";
import { type DiffStats, computeDiffStats } from "@/lib/diff";
import { resolveMatchupTeams, seedForTeam, teamLabel } from "@/lib/resolver";

type Props = {
  game: GameNode;
  viewParticipant: Participant;
  pinnedParticipant: Participant | null;
  allParticipants: Participant[];
  teamsById: Record<string, Team>;
  gamesBySlot: Record<string, GameNode>;
  diffEnabled: boolean;
  actualBySlot: Record<string, string>;
};

function rowClass(active: boolean): string {
  return [
    "flex items-center justify-between gap-2 rounded px-2 py-1 text-sm",
    active ? "bg-emerald-900/40 text-emerald-100" : "bg-zinc-800/60 text-zinc-200",
  ].join(" ");
}

export function MatchupCard({
  game,
  viewParticipant,
  pinnedParticipant,
  allParticipants,
  teamsById,
  gamesBySlot,
  diffEnabled,
  actualBySlot,
}: Props) {
  const map = useMemo(() => new Map(Object.entries(teamsById)), [teamsById]);
  const slotMap = useMemo(
    () => new Map(Object.entries(gamesBySlot).map(([k, v]) => [k, v as GameNode])),
    [gamesBySlot],
  );

  const actualWinnerTeamId = actualBySlot[game.slotId] ?? null;

  const { teamAId, teamBId } = useMemo(
    () => resolveMatchupTeams(game, viewParticipant, slotMap),
    [game, viewParticipant, slotMap],
  );

  const { pathBroken, direct } = useMemo(
    () =>
      getCardResultState({
        game,
        participant: viewParticipant,
        gamesBySlot: slotMap,
        actualBySlot,
        teamAId,
        teamBId,
      }),
    [game, viewParticipant, slotMap, actualBySlot, teamAId, teamBId],
  );

  const cardBorderClass = useMemo(() => {
    const wrong = pathBroken || direct === "wrong";
    const right = !pathBroken && direct === "correct";
    if (wrong) return "border-2 border-red-500";
    if (right) return "border-2 border-emerald-500";
    return "border border-zinc-700";
  }, [pathBroken, direct]);
  const predicted = viewParticipant.picks[game.round]?.[game.slotId];
  const pickMatchesOfficial =
    actualWinnerTeamId && predicted ? predicted === actualWinnerTeamId : null;

  const showPathBrokenNote = pathBroken && direct !== "wrong";

  const diffStats: DiffStats | null =
    diffEnabled && pinnedParticipant
      ? computeDiffStats(game.slotId, game.round, pinnedParticipant, allParticipants)
      : null;

  const [open, setOpen] = useState(false);

  const total = diffStats ? diffStats.sameCount + diffStats.differentCount : 0;
  const samePct = total > 0 ? Math.round((diffStats!.sameCount / total) * 100) : 0;

  return (
    <div
      className={[
        "w-full min-w-0 rounded-lg bg-zinc-900/80 p-2 shadow-sm md:min-w-[9.5rem]",
        cardBorderClass,
      ].join(" ")}
    >
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500 md:text-[10px]">
        {game.slotId}
      </div>
      {showPathBrokenNote ? (
        <p className="mb-1.5 text-[11px] font-medium text-amber-300/95 md:text-[10px]">
          Wrong pick earlier on one of these teams&apos; paths — not the other side of the region.
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <div className={rowClass(predicted === teamAId)}>
          <span className="truncate">{teamLabel(map, teamAId)}</span>
          {seedForTeam(map, teamAId) != null ? (
            <span className="shrink-0 text-xs text-zinc-400">({seedForTeam(map, teamAId)})</span>
          ) : null}
        </div>
        <div className={rowClass(predicted === teamBId)}>
          <span className="truncate">{teamLabel(map, teamBId)}</span>
          {seedForTeam(map, teamBId) != null ? (
            <span className="shrink-0 text-xs text-zinc-400">({seedForTeam(map, teamBId)})</span>
          ) : null}
        </div>
      </div>

      {actualWinnerTeamId ? (
        <div className="mt-1.5 text-[11px] leading-snug text-zinc-400 md:text-[10px]">
          <span className="text-sky-300/90">Official:</span> {teamLabel(map, actualWinnerTeamId)}
          {pickMatchesOfficial === true ? (
            <span className="ml-1 text-emerald-400">✓ Your pick</span>
          ) : pickMatchesOfficial === false ? (
            <span className="ml-1 text-rose-300/90">≠ Your pick</span>
          ) : null}
        </div>
      ) : null}

      {diffEnabled ? (
        <div className="mt-2 border-t border-zinc-800 pt-2">
          {!pinnedParticipant ? (
            <p className="text-xs text-amber-200/90">Pin yourself to compare picks.</p>
          ) : !diffStats ? (
            <p className="text-xs text-zinc-500">No pinned pick for this game.</p>
          ) : total === 0 ? (
            <p className="text-xs text-zinc-500">No other picks yet.</p>
          ) : (
            <>
              <div className="mb-1 flex justify-between text-[11px] text-zinc-400">
                <span>Aligned {diffStats.sameCount}</span>
                <span>Other {diffStats.differentCount}</span>
              </div>
              <div className="flex h-2 overflow-hidden rounded bg-zinc-800">
                <div className="bg-emerald-500" style={{ width: `${samePct}%` }} />
                <div className="bg-rose-500/90" style={{ width: `${100 - samePct}%` }} />
              </div>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-2 flex w-full items-center gap-1 text-left text-[11px] text-zinc-300 hover:text-white"
              >
                {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Show who
              </button>
              {open ? (
                <div className="mt-2 grid gap-2 text-[11px] text-zinc-300">
                  <div>
                    <div className="mb-0.5 font-medium text-emerald-300">Same as pinned</div>
                    <ul className="list-inside list-disc text-zinc-400">
                      {diffStats.sameNames.length === 0 ? (
                        <li className="list-none text-zinc-500">—</li>
                      ) : (
                        diffStats.sameNames.map((n) => <li key={n}>{n}</li>)
                      )}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-0.5 font-medium text-rose-300">Different pick</div>
                    <ul className="list-inside list-disc text-zinc-400">
                      {diffStats.differentNames.length === 0 ? (
                        <li className="list-none text-zinc-500">—</li>
                      ) : (
                        diffStats.differentNames.map((n) => <li key={n}>{n}</li>)
                      )}
                    </ul>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
