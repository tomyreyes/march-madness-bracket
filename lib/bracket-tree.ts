import type { GameNode, RoundId, Side, Team } from "./bracket-types";

/** Left-to-right same as typical printable bracket (East, South, West, Midwest). */
const REGIONS = ["east", "south", "west", "midwest"] as const;

/** Standard NCAA ordering within a regional: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15 */
const R64_SEED_ORDER_A = [1, 8, 5, 4, 6, 3, 7, 2];
const R64_SEED_ORDER_B = [16, 9, 12, 13, 11, 14, 10, 15];

function teamIdForSeed(region: string, seed: number, teamsByRegion: Map<string, Team[]>): string {
  const list = teamsByRegion.get(region) ?? [];
  const t = list.find((x) => x.seed === seed);
  if (!t) {
    throw new Error(`Missing team for ${region} seed ${seed}`);
  }
  return t.id;
}

function sideTeam(region: string, seed: number, teamsByRegion: Map<string, Team[]>): Side {
  return { kind: "team", teamId: teamIdForSeed(region, seed, teamsByRegion) };
}

function sideWinner(slotId: string): Side {
  return { kind: "winner", slotId };
}

/**
 * First Four winners feed the 1-vs-16 line in each region (demo wiring).
 */
export function buildBracketGames(teams: Team[]): GameNode[] {
  const byRegion = new Map<string, Team[]>();
  for (const r of REGIONS) {
    const list = teams.filter((t) => t.region === r).sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99));
    byRegion.set(r, list);
  }

  const ffTeams = teams
    .filter((t) => t.region === "first_four")
    .sort((a, b) => a.id.localeCompare(b.id));
  if (ffTeams.length < 8) {
    throw new Error("Expected at least 8 teams with region 'first_four'");
  }

  const games: GameNode[] = [];

  for (let i = 0; i < 4; i++) {
    const a = ffTeams[i * 2];
    const b = ffTeams[i * 2 + 1];
    games.push({
      slotId: `ff_${i + 1}`,
      round: "first_four",
      region: null,
      sideA: { kind: "team", teamId: a.id },
      sideB: { kind: "team", teamId: b.id },
    });
  }

  const ffSlotByRegion: Record<(typeof REGIONS)[number], string> = {
    east: "ff_1",
    south: "ff_2",
    west: "ff_3",
    midwest: "ff_4",
  };

  for (const region of REGIONS) {
    for (let g = 0; g < 8; g++) {
      const sa = R64_SEED_ORDER_A[g];
      const sb = R64_SEED_ORDER_B[g];
      const isOneSixteen = sa === 1 && sb === 16;
      const sideB: Side = isOneSixteen
        ? sideWinner(ffSlotByRegion[region])
        : sideTeam(region, sb, byRegion);
      games.push({
        slotId: `${region}_r64_${g + 1}`,
        round: "r64",
        region,
        sideA: sideTeam(region, sa, byRegion),
        sideB,
      });
    }
  }

  for (const region of REGIONS) {
    for (let g = 0; g < 4; g++) {
      games.push({
        slotId: `${region}_r32_${g + 1}`,
        round: "r32",
        region,
        sideA: sideWinner(`${region}_r64_${g * 2 + 1}`),
        sideB: sideWinner(`${region}_r64_${g * 2 + 2}`),
      });
    }
  }

  for (const region of REGIONS) {
    for (let g = 0; g < 2; g++) {
      games.push({
        slotId: `${region}_s16_${g + 1}`,
        round: "s16",
        region,
        sideA: sideWinner(`${region}_r32_${g * 2 + 1}`),
        sideB: sideWinner(`${region}_r32_${g * 2 + 2}`),
      });
    }
  }

  for (const region of REGIONS) {
    games.push({
      slotId: `${region}_e8_1`,
      round: "e8",
      region,
      sideA: sideWinner(`${region}_s16_1`),
      sideB: sideWinner(`${region}_s16_2`),
    });
  }

  games.push(
    {
      slotId: "f4_1",
      round: "f4",
      region: null,
      sideA: sideWinner("east_e8_1"),
      sideB: sideWinner("south_e8_1"),
    },
    {
      slotId: "f4_2",
      round: "f4",
      region: null,
      sideA: sideWinner("west_e8_1"),
      sideB: sideWinner("midwest_e8_1"),
    },
    {
      slotId: "ncg",
      round: "ncg",
      region: null,
      sideA: sideWinner("f4_1"),
      sideB: sideWinner("f4_2"),
    },
  );

  return games;
}

export function gamesByRound(games: GameNode[]): Map<RoundId, GameNode[]> {
  const m = new Map<RoundId, GameNode[]>();
  for (const g of games) {
    const list = m.get(g.round) ?? [];
    list.push(g);
    m.set(g.round, list);
  }
  return m;
}
