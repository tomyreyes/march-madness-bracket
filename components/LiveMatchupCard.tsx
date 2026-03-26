"use client";

import { useMemo } from "react";
import type { GameNode, Participant, Team } from "@/lib/bracket-types";
import type { LiveGameResponseItem } from "@/lib/live-game-types";
import { resolveMatchupTeams, seedForTeam, teamLabel } from "@/lib/resolver";

function teamNameClass(active: boolean, isOpponentPick: boolean): string {
  if (active) return "truncate font-medium text-emerald-50";
  if (isOpponentPick) return "truncate font-medium text-orange-400";
  return "truncate font-medium text-zinc-100";
}

function formatClockLine(period: string, clock: string): string {
  const p = period.trim();
  const c = clock.trim();
  if (p && c) return `${p} · ${c}`;
  if (p) return p;
  if (c) return c;
  return "Live";
}

function PicksColumn({
  names,
  highlightName,
}: {
  names: string[];
  highlightName: string | null;
}) {
  if (names.length === 0) {
    return <span className="text-zinc-600">—</span>;
  }
  return (
    <ul className="list-inside list-disc text-zinc-400">
      {names.map((n) => (
        <li
          key={n}
          className={highlightName && n === highlightName ? "font-semibold text-emerald-200" : undefined}
        >
          {n}
        </li>
      ))}
    </ul>
  );
}

type Props = {
  live: LiveGameResponseItem;
  game: GameNode;
  viewParticipant: Participant;
  teamsById: Record<string, Team>;
  gamesBySlot: Record<string, GameNode>;
};

export function LiveMatchupCard({ live, game, viewParticipant, teamsById, gamesBySlot }: Props) {
  const map = useMemo(() => new Map(Object.entries(teamsById)), [teamsById]);
  const slotMap = useMemo(
    () => new Map(Object.entries(gamesBySlot).map(([k, v]) => [k, v as GameNode])),
    [gamesBySlot],
  );

  const { teamAId, teamBId } = useMemo(
    () => resolveMatchupTeams(game, viewParticipant, slotMap),
    [game, viewParticipant, slotMap],
  );

  let topId = teamAId;
  let botId = teamBId;
  if (!topId || !botId) {
    topId = live.homeTeamId;
    botId = live.awayTeamId;
  }

  const topScore = topId === live.homeTeamId ? live.homeScore : live.awayScore;
  const botScore = botId === live.homeTeamId ? live.homeScore : live.awayScore;
  const topNames = topId === live.homeTeamId ? live.picksHomeNames : live.picksAwayNames;
  const botNames = botId === live.homeTeamId ? live.picksHomeNames : live.picksAwayNames;

  const predicted = viewParticipant.picks[game.round]?.[game.slotId];
  const hasPick = Boolean(predicted && (predicted === topId || predicted === botId));
  const topIsPick = predicted === topId;
  const botIsPick = predicted === botId;
  const topIsOpponent = hasPick && !topIsPick;
  const botIsOpponent = hasPick && !botIsPick;

  return (
    <div
      className={[
        "w-full min-w-0 rounded-lg border border-sky-600/50 bg-zinc-900/80 p-3 shadow-sm md:min-w-[11rem]",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-300/90">Live</span>
      </div>

      <div className="mb-3 text-center">
        <div className="flex items-end justify-center gap-4 sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
            <span className={teamNameClass(topIsPick, topIsOpponent)}>{teamLabel(map, topId)}</span>
            {seedForTeam(map, topId) != null ? (
              <span
                className={[
                  "text-[10px] tabular-nums",
                  topIsOpponent ? "text-orange-400/80" : topIsPick ? "text-emerald-200/70" : "text-zinc-500",
                ].join(" ")}
              >
                ({seedForTeam(map, topId)})
              </span>
            ) : null}
            <span
              className={[
                "mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl",
                topIsPick ? "text-emerald-200" : topIsOpponent ? "text-orange-300" : "text-zinc-50",
              ].join(" ")}
            >
              {topScore}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
            <span className={teamNameClass(botIsPick, botIsOpponent)}>{teamLabel(map, botId)}</span>
            {seedForTeam(map, botId) != null ? (
              <span
                className={[
                  "text-[10px] tabular-nums",
                  botIsOpponent ? "text-orange-400/80" : botIsPick ? "text-emerald-200/70" : "text-zinc-500",
                ].join(" ")}
              >
                ({seedForTeam(map, botId)})
              </span>
            ) : null}
            <span
              className={[
                "mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl",
                botIsPick ? "text-emerald-200" : botIsOpponent ? "text-orange-300" : "text-zinc-50",
              ].join(" ")}
            >
              {botScore}
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm font-semibold tabular-nums text-sky-200 sm:text-base">
          {formatClockLine(live.currentPeriod, live.contestClock)}
        </p>
      </div>

      <div className="mt-3 border-t border-zinc-800 pt-3">
        <div className="mb-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Participant picks</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div
              className={[
                "mb-0.5 text-[11px] font-medium",
                !hasPick
                  ? "text-zinc-400"
                  : topIsOpponent
                    ? "text-orange-400/95"
                    : "text-emerald-300/90",
              ].join(" ")}
            >
              {teamLabel(map, topId)}
            </div>
            <PicksColumn names={topNames} highlightName={viewParticipant.displayName} />
          </div>
          <div>
            <div
              className={[
                "mb-0.5 text-[11px] font-medium",
                !hasPick
                  ? "text-zinc-400"
                  : botIsOpponent
                    ? "text-orange-400/95"
                    : "text-emerald-300/90",
              ].join(" ")}
            >
              {teamLabel(map, botId)}
            </div>
            <PicksColumn names={botNames} highlightName={viewParticipant.displayName} />
          </div>
        </div>
      </div>
    </div>
  );
}
