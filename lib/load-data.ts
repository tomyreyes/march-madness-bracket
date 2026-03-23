import * as fs from "node:fs";
import * as path from "node:path";

import { buildBracketGames } from "./bracket-tree";
import type { GameNode, Meta, Participant, Team, TournamentResultsFile } from "./bracket-types";
import { metaSchema, participantSchema, teamsFileSchema } from "./bracket-types";
import { loadTournamentResultsFile } from "./tournament-results";

function readJsonFile<T>(absolutePath: string): T {
  const raw = fs.readFileSync(absolutePath, "utf8");
  return JSON.parse(raw) as T;
}

function dataPath(...segments: string[]): string {
  return path.join(process.cwd(), "data", ...segments);
}

export type LoadedData = {
  teams: Team[];
  teamsById: Map<string, Team>;
  meta: Meta;
  participants: Participant[];
  games: GameNode[];
  gamesBySlot: Map<string, GameNode>;
  tournamentResults: TournamentResultsFile | null;
  /** slotId → official winner team id (when synced) */
  actualBySlot: Record<string, string>;
};

export function loadBracketData(): LoadedData {
  const cwd = process.cwd();
  const teamsParsed = teamsFileSchema.parse(readJsonFile(dataPath("teams.json")));
  const meta = metaSchema.parse(readJsonFile(dataPath("meta.json")));
  const { doc: tournamentResults, actualBySlot } = loadTournamentResultsFile(cwd);

  const participants: Participant[] = meta.participantIds.map((id) => {
    const filePath = dataPath("participants", `${id}.json`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing participant file: ${filePath}`);
    }
    return participantSchema.parse(readJsonFile(filePath));
  });

  const teamsById = new Map(teamsParsed.teams.map((t) => [t.id, t]));
  const games = buildBracketGames(teamsParsed.teams);
  const gamesBySlot = new Map(games.map((g) => [g.slotId, g]));

  return {
    teams: teamsParsed.teams,
    teamsById,
    meta,
    participants,
    games,
    gamesBySlot,
    tournamentResults,
    actualBySlot,
  };
}
