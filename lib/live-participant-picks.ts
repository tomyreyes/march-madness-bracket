import { getCardResultState } from "@/lib/bracket-actuals";
import type { GameNode, Participant } from "@/lib/bracket-types";

export type LivePickSplit = {
  picksHomeNames: string[];
  picksAwayNames: string[];
  bystanderNames: string[];
};

/**
 * Home/away columns: picked that team for this slot and branch is not path-broken vs `actualBySlot`.
 * Bystanders: path broken on the relevant branch, or slot pick exists but is not home/away (e.g. eliminated team).
 */
export function splitParticipantPicksForLiveGame(
  game: GameNode,
  participants: Participant[],
  gamesBySlot: Map<string, GameNode>,
  actualBySlot: Record<string, string>,
  homeTeamId: string,
  awayTeamId: string,
): LivePickSplit {
  const picksHomeNames: string[] = [];
  const picksAwayNames: string[] = [];
  const bystanderNames: string[] = [];

  for (const p of participants) {
    const { pathBroken } = getCardResultState({
      game,
      participant: p,
      gamesBySlot,
      actualBySlot,
      teamAId: homeTeamId,
      teamBId: awayTeamId,
    });

    if (pathBroken) {
      bystanderNames.push(p.displayName);
      continue;
    }

    const pick = p.picks[game.round]?.[game.slotId];
    if (!pick) continue;
    if (pick === homeTeamId) picksHomeNames.push(p.displayName);
    else if (pick === awayTeamId) picksAwayNames.push(p.displayName);
    else bystanderNames.push(p.displayName);
  }

  picksHomeNames.sort((a, b) => a.localeCompare(b));
  picksAwayNames.sort((a, b) => a.localeCompare(b));
  bystanderNames.sort((a, b) => a.localeCompare(b));
  return { picksHomeNames, picksAwayNames, bystanderNames };
}
