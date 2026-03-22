import type { Participant, RoundId } from "./bracket-types";

export type DiffStats = {
  sameCount: number;
  differentCount: number;
  sameNames: string[];
  differentNames: string[];
};

function pickForSlot(p: Participant, round: RoundId, slotId: string): string | undefined {
  return p.picks[round]?.[slotId];
}

/**
 * Compares all participants' picks for one game to the pinned viewer's winner.
 * Excludes the pinned participant from name lists.
 */
export function computeDiffStats(
  slotId: string,
  round: RoundId,
  pinned: Participant | null,
  everyone: Participant[],
): DiffStats | null {
  if (!pinned) {
    return null;
  }
  const pinnedWinner = pickForSlot(pinned, round, slotId);
  if (!pinnedWinner) {
    return null;
  }

  const sameNames: string[] = [];
  const differentNames: string[] = [];

  for (const p of everyone) {
    if (p.id === pinned.id) {
      continue;
    }
    const choice = pickForSlot(p, round, slotId);
    if (!choice) {
      continue;
    }
    if (choice === pinnedWinner) {
      sameNames.push(p.displayName);
    } else {
      differentNames.push(p.displayName);
    }
  }

  sameNames.sort((a, b) => a.localeCompare(b));
  differentNames.sort((a, b) => a.localeCompare(b));

  return {
    sameCount: sameNames.length,
    differentCount: differentNames.length,
    sameNames,
    differentNames,
  };
}
