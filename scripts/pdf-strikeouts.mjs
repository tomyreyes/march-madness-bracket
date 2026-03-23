/**
 * List StrikeOut/StrikeThru text per PDF column (debug strikeout import).
 *
 * Usage: node scripts/pdf-strikeouts.mjs path/to/bracket.pdf
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { extractStruckNormsByPdfColumn } from "./lib/pdf-strikeout-hints.mjs";

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error(
    "Usage: node",
    path.relative(process.cwd(), fileURLToPath(import.meta.url)),
    "<file.pdf>",
  );
  process.exit(1);
}

const buf = fs.readFileSync(pdfPath);
const cols = await extractStruckNormsByPdfColumn(buf);
const names = ["East", "South", "West", "Midwest"];
for (let i = 0; i < 4; i++) {
  const list = [...cols[i]].sort((a, b) => a.localeCompare(b));
  console.log(`${names[i]}: ${list.length ? list.join(", ") : "(none)"}`);
}
