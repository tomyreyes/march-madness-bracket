/**
 * CSV → participant JSON (outline).
 *
 * Expected columns: participant_id, round, slot_id, team_id
 * - round must be one of: first_four | r64 | r32 | s16 | e8 | f4 | ncg
 *
 * Usage (Node 18+): `npm run ingest -- path/to/picks.csv`
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

const rowSchema = z.object({
  participant_id: z.string().min(1),
  round: z.enum([
    "first_four",
    "r64",
    "r32",
    "s16",
    "e8",
    "f4",
    "ncg",
  ]),
  slot_id: z.string().min(1),
  team_id: z.string().min(1),
});

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return [];
  }
  const header = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    header.forEach((key, i) => {
      row[key] = cols[i] ?? "";
    });
    return row;
  });
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npm run ingest -- <path-to.csv>");
    process.exit(1);
  }

  const text = fs.readFileSync(file, "utf8");
  const rows = parseCsv(text);

  const byParticipant = new Map<string, z.infer<typeof rowSchema>[]>();
  for (const raw of rows) {
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn("Skipping invalid row:", raw, parsed.error.flatten());
      continue;
    }
    const list = byParticipant.get(parsed.data.participant_id) ?? [];
    list.push(parsed.data);
    byParticipant.set(parsed.data.participant_id, list);
  }

  const outDir = path.join(process.cwd(), "data", "participants");
  fs.mkdirSync(outDir, { recursive: true });

  for (const [pid, list] of Array.from(byParticipant.entries())) {
    const picks: Record<string, Record<string, string>> = {};
    for (const r of list) {
      picks[r.round] ??= {};
      picks[r.round][r.slot_id] = r.team_id;
    }
    const doc = { id: pid, displayName: pid, picks };
    const target = path.join(outDir, `${pid}.json`);
    fs.writeFileSync(target, JSON.stringify(doc, null, 2) + "\n", "utf8");
    console.log("Wrote", target);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
