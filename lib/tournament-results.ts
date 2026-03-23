import * as fs from "node:fs";
import * as path from "node:path";

import { ROUND_IDS, tournamentResultsFileSchema, type TournamentResultsFile } from "./bracket-types";

export function flattenActualWinners(doc: TournamentResultsFile): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of ROUND_IDS) {
    const slots = doc.actuals[r];
    if (!slots) continue;
    for (const [slotId, row] of Object.entries(slots)) {
      if (row?.winnerTeamId) out[slotId] = row.winnerTeamId;
    }
  }
  return out;
}

export function loadTournamentResultsFile(cwd: string): {
  doc: TournamentResultsFile | null;
  actualBySlot: Record<string, string>;
} {
  const filePath = path.join(cwd, "data", "tournament-results.json");
  if (!fs.existsSync(filePath)) {
    return { doc: null, actualBySlot: {} };
  }
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as unknown;
  const doc = tournamentResultsFileSchema.parse(raw);
  return { doc, actualBySlot: flattenActualWinners(doc) };
}
