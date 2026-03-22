import type { GameNode, Participant, Side, Team } from "./bracket-types";

type PicksFlat = Map<string, string>;

function flattenPicks(p: Participant): PicksFlat {
  const m = new Map<string, string>();
  for (const map of Object.values(p.picks)) {
    for (const [slot, teamId] of Object.entries(map)) {
      m.set(slot, teamId);
    }
  }
  return m;
}

function getPick(slotId: string, picks: PicksFlat): string | undefined {
  return picks.get(slotId);
}

/**
 * Resolves the two teams shown in a matchup for a participant's bracket.
 * Requires picks in earlier rounds to propagate; otherwise returns undefined for that side.
 */
export function resolveMatchupTeams(
  game: GameNode,
  participant: Participant,
  gamesBySlot: Map<string, GameNode>,
): { teamAId?: string; teamBId?: string } {
  const picks = flattenPicks(participant);

  function teamForSide(side: Side): string | undefined {
    if (side.kind === "team") {
      return side.teamId;
    }
    const picked = getPick(side.slotId, picks);
    if (picked) {
      return picked;
    }
    const child = gamesBySlot.get(side.slotId);
    if (!child) {
      return undefined;
    }
    const ca = teamForSide(child.sideA);
    const cb = teamForSide(child.sideB);
    if (!ca || !cb) {
      return undefined;
    }
    return undefined;
  }

  return {
    teamAId: teamForSide(game.sideA),
    teamBId: teamForSide(game.sideB),
  };
}

export function teamLabel(teamsById: Map<string, Team>, id?: string): string {
  if (!id) return "TBD";
  return teamsById.get(id)?.name ?? id;
}

export function seedForTeam(teamsById: Map<string, Team>, id?: string): number | undefined {
  if (!id) return undefined;
  return teamsById.get(id)?.seed;
}
