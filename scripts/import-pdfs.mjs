/**
 * Extract + parse bracket PDFs, validate against teams.json + Tomy template, write participants.
 *
 * Usage: node scripts/import-pdfs.mjs [--force] [--dry-run]
 *
 * Expects PDFs in data/pdfs/*.pdf (gitignored). Uses same text layout as Tomy.pdf.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { projectRoot } from "./lib/project-root.mjs";
import {
  loadTeamsById,
  loadReferencePickPaths,
  validateParticipantPicks,
} from "./lib/validate-participant-picks.mjs";
import { buildStrikeoutAlwaysPickFromPdf } from "./lib/pdf-strikeout-hints.mjs";
import {
  extractR64GamesForStrikeout,
  parseBracketExtract,
} from "./parse-bracket-text.mjs";

function slugFromBasename(name) {
  return name
    .replace(/\.pdf$/i, "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function displayNameFromBasename(name) {
  return name.replace(/\.pdf$/i, "").trim() || "Unknown";
}

function loadPdfImportHints(root) {
  const p = path.join(root, "data", "pdf-import-hints.json");
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf8"));
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!k.startsWith("$") && v && typeof v === "object") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

async function main() {
  const root = projectRoot(import.meta.url);
  const force = process.argv.includes("--force");
  const dry = process.argv.includes("--dry-run");
  const importHints = loadPdfImportHints(root);

  const pdfDir = path.join(root, "data", "pdfs");
  if (!fs.existsSync(pdfDir)) {
    console.error("No data/pdfs directory; create it and add .pdf files.");
    process.exit(1);
  }

  const teamsById = loadTeamsById(path.join(root, "data", "teams.json"));
  const { referenceId, paths: referencePaths } = loadReferencePickPaths(root);

  const pdfParse = (await import("pdf-parse")).default;

  const files = fs
    .readdirSync(pdfDir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .sort();

  if (files.length === 0) {
    console.error("No PDFs in data/pdfs");
    process.exit(0);
  }

  const participantsDir = path.join(root, "data", "participants");
  fs.mkdirSync(participantsDir, { recursive: true });

  const metaPath = path.join(root, "data", "meta.json");
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));

  for (const file of files) {
    const abs = path.join(pdfDir, file);
    const id = slugFromBasename(file);
    const displayName = displayNameFromBasename(file);
    const outPath = path.join(participantsDir, `${id}.json`);

    if (fs.existsSync(outPath) && !force) {
      console.error("skip (exists, use --force):", id);
      continue;
    }

    const buf = fs.readFileSync(abs);
    const { text } = await pdfParse(buf);
    const normalized = text.replace(/\r\n/g, "\n").trim();

    const baseHint = importHints[id] ?? null;
    /** @type {typeof baseHint} */
    let hint = baseHint;
    try {
      const r64 = extractR64GamesForStrikeout(normalized, baseHint);
      const strikePick = await buildStrikeoutAlwaysPickFromPdf(buf, r64);
      if (strikePick && Object.keys(strikePick).length > 0) {
        hint = {
          ...(baseHint ?? {}),
          alwaysPick: {
            ...strikePick,
            ...(baseHint?.alwaysPick ?? {}),
          },
        };
      }
    } catch (e) {
      console.error(
        "WARN strikeout-scan",
        id,
        e instanceof Error ? e.message : e,
      );
    }

    let picks;
    /** @type {string[]} */
    let parseWarnings = [];
    try {
      const parsed = parseBracketExtract(normalized, hint);
      picks = parsed.picks;
      parseWarnings = parsed.warnings ?? [];
    } catch (e) {
      console.error("FAIL parse", id, e instanceof Error ? e.message : e);
      continue;
    }

    for (const w of parseWarnings) console.error("WARN parse", id, w);

    const v = validateParticipantPicks(picks, teamsById, {
      referencePaths,
      label: id,
    });
    for (const w of v.warnings) console.error("WARN validate", id, w);
    if (!v.ok) {
      for (const err of v.errors) console.error("ERR validate", id, err);
      console.error("FAIL", id, "(fix PDF text, aliases in data/pdf-label-aliases.json, or teams.json)");
      continue;
    }

    const doc = {
      id,
      displayName,
      picks,
    };

    if (dry) {
      console.error("dry-run OK", id, displayName);
      continue;
    }

    fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n", "utf8");
    console.error("wrote", path.relative(root, outPath));
  }

  if (!dry) {
    const allIds = fs
      .readdirSync(participantsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    meta.participantIds = allIds;
    if (!meta.fallbackParticipantId) meta.fallbackParticipantId = referenceId;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");
    console.error("meta.json participantIds:", allIds.join(", "));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
