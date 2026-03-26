import type { GameNode, Participant, Side } from "./bracket-types";

function childGame(side: Side, gamesBySlot: Map<string, GameNode>): GameNode | null {
  if (side.kind !== "winner") return null;
  return gamesBySlot.get(side.slotId) ?? null;
}

/**
 * Slots in `game`'s subtree where this participant picked `teamId` to advance
 * (the branch from this game down to R64 for that team only).
 */
function collectAncestorSlotsForTeamInGame(
  game: GameNode,
  teamId: string,
  participant: Participant,
  gamesBySlot: Map<string, GameNode>,
): Set<string> {
  const ca = childGame(game.sideA, gamesBySlot);
  const cb = childGame(game.sideB, gamesBySlot);
  if (!ca || !cb) {
    return new Set([game.slotId]);
  }

  const out = new Set<string>();
  const wa = participant.picks[ca.round]?.[ca.slotId];
  const wb = participant.picks[cb.round]?.[cb.slotId];

  if (wa === teamId) {
    out.add(ca.slotId);
    collectAncestorSlotsForTeamInGame(ca, teamId, participant, gamesBySlot).forEach((s) =>
      out.add(s),
    );
  }
  if (wb === teamId) {
    out.add(cb.slotId);
    collectAncestorSlotsForTeamInGame(cb, teamId, participant, gamesBySlot).forEach((s) =>
      out.add(s),
    );
  }

  return out;
}

/**
 * Union of paths for both teams shown in this game — excludes the other half
 * of the region (e.g. wrong west_r64_3 does not flag Arizona's Final Four path).
 */
export function collectRelevantActualCheckSlots(
  game: GameNode,
  teamAId: string | undefined,
  teamBId: string | undefined,
  participant: Participant,
  gamesBySlot: Map<string, GameNode>,
): Set<string> {
  const out = new Set<string>();
  if (teamAId) {
    collectAncestorSlotsForTeamInGame(game, teamAId, participant, gamesBySlot).forEach((s) =>
      out.add(s),
    );
  }
  if (teamBId) {
    collectAncestorSlotsForTeamInGame(game, teamBId, participant, gamesBySlot).forEach((s) =>
      out.add(s),
    );
  }
  return out;
}

export type CardDirectResult = "correct" | "wrong" | null;

export type CardResultState = {
  pathBroken: boolean;
  /** Team the participant picked to advance at the first contradicting feeder; they lost per official result. */
  pathBrokenEliminatedPickTeamId: string | null;
  direct: CardDirectResult;
};

export function getCardResultState({
  game,
  participant,
  gamesBySlot,
  actualBySlot,
  teamAId,
  teamBId,
}: {
  game: GameNode;
  participant: Participant;
  gamesBySlot: Map<string, GameNode>;
  actualBySlot: Record<string, string>;
  teamAId?: string;
  teamBId?: string;
}): CardResultState {
  const relevant = collectRelevantActualCheckSlots(
    game,
    teamAId,
    teamBId,
    participant,
    gamesBySlot,
  );

  let pathBroken = false;
  let pathBrokenEliminatedPickTeamId: string | null = null;
  for (const feederId of Array.from(relevant)) {
    const actual = actualBySlot[feederId];
    if (!actual) continue;
    const feederGame = gamesBySlot.get(feederId);
    if (!feederGame) continue;
    const pick = participant.picks[feederGame.round]?.[feederId];
    if (pick != null && pick !== actual) {
      pathBroken = true;
      pathBrokenEliminatedPickTeamId = pick;
      break;
    }
  }

  const official = actualBySlot[game.slotId];
  const predicted = participant.picks[game.round]?.[game.slotId];
  let direct: CardDirectResult = null;
  if (official != null && official !== "") {
    if (predicted != null) {
      direct = predicted === official ? "correct" : "wrong";
    }
  }

  return { pathBroken, pathBrokenEliminatedPickTeamId, direct };
}
