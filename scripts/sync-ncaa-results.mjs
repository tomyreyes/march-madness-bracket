/**
 * Pull final scores from henrygd NCAA API (brackets JSON) and merge into
 * data/tournament-results.json. Idempotent: same contestId overwrites; new finals append.
 *
 * Usage:
 *   node scripts/sync-ncaa-results.mjs [--dry-run] [--year 2026]
 *
 * Env:
 *   NCAA_API_BASE — default https://ncaa-api.henrygd.me
 *   TOURNAMENT_YEAR — season year for API path (if no --year flag)
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { projectRoot } from "./lib/project-root.mjs";
import { bracketPositionToOurSlot } from "./lib/ncaa-bracket-slots.mjs";
import { loadSeoResolver } from "./lib/ncaa-resolve-team-id.mjs";

const DEFAULT_BASE = "https://ncaa-api.henrygd.me";

function parseArgs(argv) {
  const dry = argv.includes("--dry-run");
  let year = new Date().getUTCFullYear();
  const yi = argv.indexOf("--year");
  if (yi >= 0 && argv[yi + 1]) {
    year = Number(argv[yi + 1]);
  } else if (process.env.TOURNAMENT_YEAR?.trim()) {
    year = Number(process.env.TOURNAMENT_YEAR.trim());
  }
  return { dry, year };
}

function isFinalGameState(state) {
  const s = String(state ?? "").toUpperCase();
  return s === "F" || s === "FINAL";
}

function winnerSeoFromGame(game) {
  const teams = game.teams;
  if (!Array.isArray(teams) || teams.length < 2) return null;
  const w = teams.find((t) => t.isWinner === true);
  if (!w || !w.seoname) return null;
  return String(w.seoname).toLowerCase();
}

async function fetchBrackets(base, year) {
  const url = `${base.replace(/\/$/, "")}/brackets/basketball-men/d1/${year}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Brackets fetch ${res.status}: ${url}`);
  }
  return res.json();
}

function loadOrCreateResults(outPath) {
  try {
    return JSON.parse(fs.readFileSync(outPath, "utf8"));
  } catch {
    return {
      schemaVersion: 1,
      seasonYear: null,
      apiBase: DEFAULT_BASE,
      lastSyncedAt: null,
      actuals: {},
      syncNotes: [],
    };
  }
}

function ensureRound(doc, round) {
  if (!doc.actuals[round]) doc.actuals[round] = {};
}

function main() {
  return (async () => {
    const root = projectRoot(import.meta.url);
    const { dry, year } = parseArgs(process.argv.slice(2));
    const base = process.env.NCAA_API_BASE?.trim() || DEFAULT_BASE;
    const resolveId = loadSeoResolver(root);
    const outPath = path.join(root, "data", "tournament-results.json");

    const body = await fetchBrackets(base, year);
    const champs = body.championships;
    if (!Array.isArray(champs) || champs.length === 0) {
      console.error(
        JSON.stringify(
          { warning: "No championships in brackets response; exiting without write", year },
          null,
          2,
        ),
      );
      process.exit(0);
      return;
    }
    const games = champs[0].games;
    if (!Array.isArray(games)) {
      console.error(
        JSON.stringify(
          { warning: "No games array in first championship; exiting without write", year },
          null,
          2,
        ),
      );
      process.exit(0);
      return;
    }

    const doc = loadOrCreateResults(outPath);
    doc.schemaVersion = 1;
    doc.seasonYear = year;
    doc.apiBase = base;
    const notes = [];
    let added = 0;
    let updated = 0;
    let nonFinal = 0;

    if (!doc.actuals || typeof doc.actuals !== "object") doc.actuals = {};

    for (const g of games) {
      if (!isFinalGameState(g.gameState)) {
        nonFinal++;
        continue;
      }
      const bp = g.bracketPositionId;
      const slot = bracketPositionToOurSlot(bp);
      if (!slot) {
        notes.push(`skip_bp_${bp}_contest_${g.contestId}`);
        continue;
      }

      const wSeo = winnerSeoFromGame(g);
      if (!wSeo) {
        notes.push(`no_winner_bp_${bp}_contest_${g.contestId}`);
        continue;
      }

      const winnerTeamId = resolveId(wSeo);
      if (!winnerTeamId) {
        notes.push(`UNRESOLVED_SEO ${wSeo} bp=${bp} contest=${g.contestId} slot=${slot.slotId}`);
        continue;
      }

      const contestId = String(g.contestId);
      const prev = doc.actuals[slot.round]?.[slot.slotId];
      const entry = {
        contestId,
        winnerTeamId,
        winnerSeo: wSeo,
        updatedAt: new Date().toISOString(),
      };

      ensureRound(doc, slot.round);
      const existed = prev != null;
      const changed =
        !existed ||
        prev.contestId !== contestId ||
        prev.winnerTeamId !== winnerTeamId;
      if (changed) {
        doc.actuals[slot.round][slot.slotId] = entry;
        if (existed) updated++;
        else added++;
      }
    }

    doc.lastSyncedAt = new Date().toISOString();
    doc.syncNotes = notes.slice(-200);

    console.error(
      JSON.stringify(
        {
          year,
          added,
          updated,
          nonFinalGames: nonFinal,
          unresolvedOrNotes: notes.filter((n) => n.startsWith("UNRESOLVED")).length,
          totalNotes: notes.length,
        },
        null,
        2,
      ),
    );

    if (notes.some((n) => n.startsWith("UNRESOLVED_SEO"))) {
      console.error("--- fix data/ncaa-seo-overrides.json for ---");
      for (const n of notes.filter((x) => x.startsWith("UNRESOLVED_SEO"))) {
        console.error(n);
      }
    }

    if (dry) {
      console.error("dry-run: not writing", path.relative(root, outPath));
      return;
    }

    fs.writeFileSync(outPath, JSON.stringify(doc, null, 2) + "\n", "utf8");
    console.error("wrote", path.relative(root, outPath));
  })();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
