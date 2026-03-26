import type { GameNode } from "@/lib/bracket-types";

/** NCAA region column order (east → south → west → midwest). */
export const NCAA_REGIONS = ["east", "south", "west", "midwest"] as const;

export type NcaaRegion = (typeof NCAA_REGIONS)[number];

/** Rounds shown in the bracket UI (excludes first_four). */
export const DISPLAY_ROUNDS = ["r64", "r32", "s16", "e8", "f4", "ncg"] as const;

export type DisplayRoundId = (typeof DISPLAY_ROUNDS)[number];

export type RoundDisplayPhase = "live" | "upcoming" | "complete";

export type OrderedRoundSection = {
  round: DisplayRoundId;
  phase: RoundDisplayPhase;
};

const ROUND_SECTION_TITLES: Record<DisplayRoundId, string> = {
  r64: "First round",
  r32: "Round of 32",
  s16: "Sweet 16",
  e8: "Elite Eight",
  f4: "Final Four",
  ncg: "Championship",
};

export function roundSectionTitle(round: DisplayRoundId): string {
  return ROUND_SECTION_TITLES[round];
}

const PHASE_BADGE_LABELS: Record<RoundDisplayPhase, string> = {
  live: "Current round",
  upcoming: "Upcoming",
  complete: "Complete",
};

export function phaseBadgeLabel(phase: RoundDisplayPhase): string {
  return PHASE_BADGE_LABELS[phase];
}

function gamesInRound(games: GameNode[], round: DisplayRoundId): GameNode[] {
  return games.filter((g) => g.round === round);
}

/**
 * Earliest display round (bracket order) that has at least one game without an official winner.
 * Only considers rounds that exist in `games`. Returns null if every such game has a result.
 */
export function findLiveDisplayRound(
  games: GameNode[],
  actualBySlot: Record<string, string>,
): DisplayRoundId | null {
  for (const round of DISPLAY_ROUNDS) {
    const list = gamesInRound(games, round);
    if (list.length === 0) {
      continue;
    }
    if (list.some((g) => !actualBySlot[g.slotId])) {
      return round;
    }
  }
  return null;
}

/**
 * Order: live round → later rounds (upcoming) → earlier rounds (complete), most recent complete first within the complete block.
 */
export function getDisplayRoundOrder(
  games: GameNode[],
  actualBySlot: Record<string, string>,
): OrderedRoundSection[] {
  const live = findLiveDisplayRound(games, actualBySlot);
  const roundsWithGames = DISPLAY_ROUNDS.filter((r) => gamesInRound(games, r).length > 0);

  if (live === null) {
    return [...roundsWithGames].reverse().map((round) => ({ round, phase: "complete" as const }));
  }

  const liveIdx = DISPLAY_ROUNDS.indexOf(live);
  const upcoming = DISPLAY_ROUNDS.filter(
    (r, i) => i > liveIdx && gamesInRound(games, r).length > 0,
  ).map((round) => ({ round, phase: "upcoming" as const }));

  const completeDescending = DISPLAY_ROUNDS.filter(
    (r, i) => i < liveIdx && gamesInRound(games, r).length > 0,
  )
    .slice()
    .reverse();

  const completeSections = completeDescending.map((round) => ({
    round,
    phase: "complete" as const,
  }));

  return [{ round: live, phase: "live" }, ...upcoming, ...completeSections];
}

export function isRegionalDisplayRound(round: DisplayRoundId): boolean {
  return round === "r64" || round === "r32" || round === "s16" || round === "e8";
}
