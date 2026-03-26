import { getCardResultState } from "@/lib/bracket-actuals";
import type { GameNode, Participant } from "@/lib/bracket-types";

export type LivePickSplit = {
  picksHomeNames: string[];
  picksAwayNames: string[];
};

/**
 * Participants who picked home or away for this slot, excluding:
 * - missing pick for this game
 * - pick not exactly one of the two teams playing (scoreboard)
 * - path broken vs official results on the branch for those two teams
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

  for (const p of participants) {
    const pick = p.picks[game.round]?.[game.slotId];
    if (!pick) continue;
    if (pick !== homeTeamId && pick !== awayTeamId) continue;

    const { pathBroken } = getCardResultState({
      game,
      participant: p,
      gamesBySlot,
      actualBySlot,
      teamAId: homeTeamId,
      teamBId: awayTeamId,
    });

    if (pathBroken) continue;

    if (pick === homeTeamId) picksHomeNames.push(p.displayName);
    else picksAwayNames.push(p.displayName);
  }

  picksHomeNames.sort((a, b) => a.localeCompare(b));
  picksAwayNames.sort((a, b) => a.localeCompare(b));
  return { picksHomeNames, picksAwayNames };
}
