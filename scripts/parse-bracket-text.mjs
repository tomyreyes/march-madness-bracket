import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Parse plain text from bracket PDFs (same export layout as Tomy.pdf).
 *
 * PDF columns are left-to-right in print order; printed headers do **not** match NCAA
 * region names. Positional mapping (verified for this export):
 * - Column 1 (before first "East" line) → NCAA **East** (e.g. Duke)
 * - After "East" until "South" → NCAA **South** (e.g. Florida / Houston)
 * - After "South" until "West" → NCAA **West** (e.g. Arizona)
 * - After "West" until "Midwest" → NCAA **Midwest** (e.g. Michigan / Iowa St.)
 *
 * @param {string} text
 * @returns {{ picks: object, warnings: string[] }}
 */
export function norm(s) {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u02BC\uFF07]/g, "'")
    .toLowerCase();
}

function slug(name) {
  return norm(name)
    .replace(/&/g, "")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseScriptsDir() {
  return path.dirname(fileURLToPath(import.meta.url));
}

/** @returns {Map<string, string>} normalized PDF token → teams.json id */
function loadPdfLabelAliases() {
  const root = path.resolve(parseScriptsDir(), "..");
  const file = path.join(root, "data", "pdf-label-aliases.json");
  const fallback = new Map([["maryca", "saint-marys"]]);
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    const m = new Map(fallback);
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith("$") || typeof v !== "string") continue;
      m.set(k, v);
    }
    return m;
  } catch {
    return fallback;
  }
}

const PDF_LABEL_ALIASES = loadPdfLabelAliases();

/** @returns {{ pairs: [string,string][], nextI: number }} */
function parseSeedsTypeA(lines, start) {
  const pairs = [];
  let i = start;
  while (pairs.length < 8 && i + 1 < lines.length) {
    const ma = lines[i].match(/^(\d+)\s+(.+)$/);
    const mb = lines[i + 1].match(/^(\d+)\s+(.+)$/);
    if (ma && mb) {
      pairs.push([ma[2].trim(), mb[2].trim()]);
      i += 2;
    } else {
      i += 1;
    }
  }
  return { pairs, nextI: i };
}

/** Team then seed: "Arizona  1" */
function parseSeedsTypeB(lines, start) {
  const pairs = [];
  let i = start;
  const re = /^(.+?)\s+(\d+)\s*$/;
  while (pairs.length < 8 && i + 1 < lines.length) {
    const ma = lines[i].match(re);
    const mb = lines[i + 1].match(re);
    if (ma && mb) {
      const sa = Number(ma[2]);
      const sb = Number(mb[2]);
      const ta = ma[1].trim();
      const tb = mb[1].trim();
      if (sa < sb) pairs.push([ta, tb]);
      else pairs.push([tb, ta]);
      i += 2;
    } else {
      i += 1;
    }
  }
  return { pairs, nextI: i };
}

/**
 * PDF text sometimes mangles names; keys must match ids in data/teams.json.
 * Aliases: data/pdf-label-aliases.json (normalized token → id).
 */
function canonicalTeamIdFromPdfLabel(displayName) {
  const n = norm(displayName);
  if (PDF_LABEL_ALIASES.has(n)) return PDF_LABEL_ALIASES.get(n);
  const s = slug(displayName);
  if (PDF_LABEL_ALIASES.has(s)) return PDF_LABEL_ALIASES.get(s);
  return s;
}

function buildNameToId(pairs) {
  const m = new Map();
  for (const [a, b] of pairs) {
    m.set(norm(a), canonicalTeamIdFromPdfLabel(a));
    m.set(norm(b), canonicalTeamIdFromPdfLabel(b));
  }
  return m;
}

/** Matchups in hints use the same canonical key as resolve: sort both norms with localeCompare, join with |. */
function normalizeHintPairKeys(raw) {
  if (!raw || typeof raw !== "object") return undefined;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("$")) continue;
    const parts = k
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length !== 2) {
      out[k] = v;
      continue;
    }
    const canon = parts.sort((a, b) => a.localeCompare(b)).join("|");
    out[canon] = v;
  }
  return out;
}

function pickR64Games(pairs, nameToId) {
  return pairs.map(([ta, tb]) => {
    const ida = nameToId.get(norm(ta));
    const idb = nameToId.get(norm(tb));
    if (!ida || !idb) throw new Error(`Unknown R64 team: "${ta}" / "${tb}"`);
    return { ta, tb, ida, idb };
  });
}

function countNormInQueue(queue, nTarget) {
  return queue.reduce((acc, l) => acc + (norm(l) === nTarget ? 1 : 0), 0);
}

/**
 * R64 / noisy columns: winner = team name that appears more often in the full extract (losers often appear once).
 * Tie: use first index of each name in the queue (see branch using ia/ib).
 *
 * @param {{ ta: string, tb: string }[]} games
 * @param {string[]} queue
 * @param {{
 *   tieBreak?: Record<string, string>,
 *   alwaysPick?: Record<string, string>,
 * } | null} [hints] Keys: sorted "na|nb" (localeCompare). alwaysPick wins even when counts disagree (spot-check fixes).
 */
function resolveWinnersByFrequency(games, queue, hints = null) {
  const full = queue.map((l) => l.trim()).filter(Boolean);
  const names = [];
  const loserNorms = new Set();
  for (const { ta, tb } of games) {
    const na = norm(ta);
    const nb = norm(tb);
    const tieKey = [na, nb].sort((a, b) => a.localeCompare(b)).join("|");
    const mustN = hints?.alwaysPick?.[tieKey];
    const ca = countNormInQueue(full, na);
    const cb = countNormInQueue(full, nb);
    let picked;
    let loserN;
    if (mustN === na) {
      picked = ta;
      loserN = nb;
    } else if (mustN === nb) {
      picked = tb;
      loserN = na;
    } else if (ca > cb) {
      picked = ta;
      loserN = nb;
    } else if (cb > ca) {
      picked = tb;
      loserN = na;
    } else {
      const forcedN = hints?.tieBreak?.[tieKey];
      if (forcedN === na) {
        picked = ta;
        loserN = nb;
      } else if (forcedN === nb) {
        picked = tb;
        loserN = na;
      } else {
        const ia = full.findIndex((l) => norm(l) === na);
        const ib = full.findIndex((l) => norm(l) === nb);
        if (ia === -1 || ib === -1) {
          throw new Error(`No line for ${ta} vs ${tb}`);
        }
        /** Same export often lists the advancing team before the eliminated one. */
        if (ia < ib) {
          picked = ta;
          loserN = nb;
        } else {
          picked = tb;
          loserN = na;
        }
      }
    }
    names.push(picked);
    loserNorms.add(loserN);
  }
  return { names, loserNorms };
}

function stripR64Losers(queue, loserNorms) {
  return queue.filter((l) => !loserNorms.has(norm(l)));
}

/**
 * Later rounds: queue is mostly winners; first match + strip all loser lines.
 */
function resolveWinners(games, queue) {
  const q = queue.map((l) => l.trim()).filter(Boolean);
  const names = [];
  for (const { ta, tb } of games) {
    const na = norm(ta);
    const nb = norm(tb);
    const idx = q.findIndex((l) => {
      const n = norm(l);
      return n === na || n === nb;
    });
    if (idx === -1) {
      throw new Error(`No winner line for ${ta} vs ${tb}. Queue head: ${q.slice(0, 15).join(" | ")}`);
    }
    const picked = q[idx];
    const pickedN = norm(picked);
    const loserN = pickedN === na ? nb : na;
    names.push(picked);
    const next = [];
    for (let i = 0; i < q.length; i++) {
      if (i === idx) continue;
      if (norm(q[i]) === loserN) continue;
      next.push(q[i]);
    }
    q.length = 0;
    q.push(...next);
  }
  return { names, rest: q };
}

function toIds(names, nameToId) {
  return names.map((d) => {
    const id = nameToId.get(norm(d));
    if (!id) throw new Error(`Unknown name in advancement: "${d}"`);
    return id;
  });
}

/** First norm key seen per id (for matching PDF lines to slugs). */
function idToNormKey(nameToId) {
  const m = new Map();
  for (const [nkey, id] of nameToId) {
    if (!m.has(id)) m.set(id, nkey);
  }
  return m;
}

function filterQueueByIds(queue, prevWinnerIds, idNorm) {
  const allow = new Set(prevWinnerIds.map((id) => idNorm.get(id)));
  return queue.filter((l) => allow.has(norm(l)));
}

/**
 * @param {string[]} prevIds
 * @param {string[]} rest
 * @param {Map<string,string>} nameToId
 * @param {{ useFrequency?: boolean }} [opts]
 */
function roundFromPrev(prevIds, rest, nameToId, opts = {}) {
  const useFrequency = opts.useFrequency ?? false;
  const freqHints = opts.freqHints ?? null;
  const idNorm = idToNormKey(nameToId);
  const restF = filterQueueByIds(rest, prevIds, idNorm);
  const games = [];
  for (let k = 0; k < prevIds.length; k += 2) {
    const ida = prevIds[k];
    const idb = prevIds[k + 1];
    games.push({
      ta: idNorm.get(ida) ?? ida,
      tb: idNorm.get(idb) ?? idb,
    });
  }
  if (useFrequency) {
    const { names, loserNorms } = resolveWinnersByFrequency(games, restF, freqHints);
    const r = stripR64Losers(restF, loserNorms);
    return { ids: toIds(names, nameToId), rest: r };
  }
  const { names, rest: r } = resolveWinners(games, restF);
  return { ids: toIds(names, nameToId), rest: r };
}

/**
 * Shared layout through R64 seed matchups (used by PDF strikeout import).
 *
 * @param {string} text
 * @param {{
 *   tieBreak?: Record<string, string>,
 *   alwaysPick?: Record<string, string>,
 *   midwestAdvInsertAfterFirst?: Record<string, string>,
 * } | null} [hints]
 */
export function parseBracketLayout(text, hints = null) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  const idxPdfEast = lines.indexOf("East");
  const idxPdfSouth = lines.indexOf("South");
  const idxPdfWest = lines.indexOf("West");
  const idxPdfMidwest = lines.indexOf("Midwest");
  if (idxPdfEast < 0 || idxPdfSouth < 0 || idxPdfWest < 0 || idxPdfMidwest < 0) {
    throw new Error('Need headers: East, South, West, Midwest');
  }

  const startFirst = lines.findIndex((l, i) => i < idxPdfEast && /^\d+\s+.+/.test(l));
  if (startFirst < 0) throw new Error("Could not find first regional seed block.");

  /** NCAA East (PDF col 1; mislabeled in print relative to NCAA). */
  const eastCol = lines.slice(startFirst, idxPdfEast);
  /** NCAA South (under PDF "East"). */
  const southCol = lines.slice(idxPdfEast + 1, idxPdfSouth);
  /** NCAA West (under PDF "South"). */
  const westCol = lines.slice(idxPdfSouth + 1, idxPdfWest);
  /** NCAA Midwest (under PDF "West"). */
  const midwestCol = lines.slice(idxPdfWest + 1, idxPdfMidwest);
  const tailLines = lines.slice(idxPdfMidwest + 1);

  const eSeed = parseSeedsTypeA(eastCol, 0);
  const sSeed = parseSeedsTypeA(southCol, 0);

  const westSeedStart = westCol.findIndex((l) => /^(.+?)\s+(\d+)\s*$/.test(l));
  if (westSeedStart < 0) throw new Error("Could not find West seed block.");
  const wSeed = parseSeedsTypeB(westCol, westSeedStart);
  const mwSeed = parseSeedsTypeB(midwestCol, 0);

  const nameToId = new Map([
    ...buildNameToId(eSeed.pairs),
    ...buildNameToId(sSeed.pairs),
    ...buildNameToId(wSeed.pairs),
    ...buildNameToId(mwSeed.pairs),
  ]);

  const eastAdv = eastCol.slice(eSeed.nextI).filter((l) => l && !/^\d+\s+/.test(l));
  const southAdv = southCol.slice(sSeed.nextI).filter((l) => l && !/^\d+\s+/.test(l));
  const westAdv = westCol.slice(wSeed.nextI).filter((l) => {
    if (!l) return false;
    if (/^\d+\s+/.test(l)) return false;
    if (/^(.+?)\s+\d+\s*$/.test(l)) return false;
    return true;
  });
  const mwAdv = midwestCol.slice(mwSeed.nextI).filter((l) => {
    if (!l) return false;
    if (/^(.+?)\s+\d+\s*$/.test(l)) return false;
    return true;
  });

  if (hints?.midwestAdvInsertAfterFirst) {
    for (const [afterNormKey, insertLine] of Object.entries(hints.midwestAdvInsertAfterFirst)) {
      const wantAfter = norm(afterNormKey);
      const j = mwAdv.findIndex((l) => norm(l) === wantAfter);
      const insertNorm = norm(insertLine);
      if (j >= 0 && !mwAdv.some((l) => norm(l) === insertNorm)) {
        mwAdv.splice(j + 1, 0, insertLine);
      }
    }
  }

  const r64E = pickR64Games(eSeed.pairs, nameToId);
  const r64S = pickR64Games(sSeed.pairs, nameToId);
  const r64W = pickR64Games(wSeed.pairs, nameToId);
  const r64M = pickR64Games(mwSeed.pairs, nameToId);

  return {
    tailLines,
    nameToId,
    eastAdv,
    southAdv,
    westAdv,
    mwAdv,
    r64E,
    r64S,
    r64W,
    r64M,
  };
}

/** R64 `{ ta, tb }[]` per region in PDF column order: East, South, West, Midwest. */
export function extractR64GamesForStrikeout(text, hints = null) {
  const { r64E, r64S, r64W, r64M } = parseBracketLayout(text, hints);
  return [r64E, r64S, r64W, r64M];
}

/**
 * @param {string} text
 * @param {{
 *   tieBreak?: Record<string, string>,
 *   alwaysPick?: Record<string, string>,
 *   midwestAdvInsertAfterFirst?: Record<string, string>,
 * } | null} [hints] Optional per-PDF fixes (see data/pdf-import-hints.json).
 */
export function parseBracketExtract(text, hints = null) {
  const warnings = [];
  const {
    tailLines,
    nameToId,
    eastAdv,
    southAdv,
    westAdv,
    mwAdv,
    r64E,
    r64S,
    r64W,
    r64M,
  } = parseBracketLayout(text, hints);

  const freqHints =
    hints?.tieBreak || hints?.alwaysPick
      ? {
          ...(hints.tieBreak ? { tieBreak: normalizeHintPairKeys(hints.tieBreak) } : {}),
          ...(hints.alwaysPick ? { alwaysPick: normalizeHintPairKeys(hints.alwaysPick) } : {}),
        }
      : null;

  /** East R64: use frequency like other regions — sequential first-match often picked the wrong 8/9, 6/11, 7/10 winner when PDF lists names out of order. */
  const eL = resolveWinnersByFrequency(r64E, eastAdv, freqHints);
  const eastClean = stripR64Losers(eastAdv, eL.loserNorms);
  const sL = resolveWinnersByFrequency(r64S, southAdv, freqHints);
  const southClean = stripR64Losers(southAdv, sL.loserNorms);
  const wL = resolveWinnersByFrequency(r64W, westAdv, freqHints);
  const westClean = stripR64Losers(westAdv, wL.loserNorms);
  const mL = resolveWinnersByFrequency(r64M, mwAdv, freqHints);
  const mwClean = stripR64Losers(mwAdv, mL.loserNorms);

  const e32 = toIds(eL.names, nameToId);
  const s32 = toIds(sL.names, nameToId);
  const w32 = toIds(wL.names, nameToId);
  const m32 = toIds(mL.names, nameToId);

  const e16 = roundFromPrev(e32, [...eastClean], nameToId, { useFrequency: true, freqHints });
  const s16 = roundFromPrev(s32, [...southClean], nameToId, { useFrequency: true, freqHints });
  const w16 = roundFromPrev(w32, [...westClean], nameToId, { useFrequency: true, freqHints });
  const m16 = roundFromPrev(m32, [...mwClean], nameToId, { useFrequency: true, freqHints });

  const e8 = roundFromPrev(e16.ids, e16.rest, nameToId, { useFrequency: true, freqHints });
  const s8 = roundFromPrev(s16.ids, s16.rest, nameToId, { useFrequency: true, freqHints });
  const w8 = roundFromPrev(w16.ids, w16.rest, nameToId, { useFrequency: true, freqHints });
  const m8 = roundFromPrev(m16.ids, m16.rest, nameToId, { useFrequency: true, freqHints });

  const eCh = roundFromPrev(e8.ids, e8.rest, nameToId, { useFrequency: true, freqHints });
  const sCh = roundFromPrev(s8.ids, s8.rest, nameToId, { useFrequency: true, freqHints });
  const wCh = roundFromPrev(w8.ids, w8.rest, nameToId, { useFrequency: true, freqHints });
  const mCh = roundFromPrev(m8.ids, m8.rest, nameToId, { useFrequency: true, freqHints });

  const westChamp = wCh.ids[0];
  const eastChamp = eCh.ids[0];
  const southChamp = sCh.ids[0];
  const mwChamp = mCh.ids[0];

  const finalistsRow = tailLines.find((l) => /\s{2,}/.test(l) && /[A-Za-z]{2,}/.test(l));
  let finalists = [];
  if (finalistsRow) {
    finalists = finalistsRow
      .split(/\s{2,}/)
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const id = nameToId.get(norm(x));
        if (!id) warnings.push(`Finalist not in map: "${x}"`);
        return id;
      })
      .filter(Boolean);
  }

  const f4_1 = [eastChamp, southChamp].find((id) => finalists.includes(id)) ?? eastChamp;
  const f4_2 = [westChamp, mwChamp].find((id) => finalists.includes(id)) ?? mwChamp;

  const champLine = [...tailLines].reverse().find((l) => {
    if (!l || l.length > 35) return false;
    if (/national|championship|indianapolis|april/i.test(l)) return false;
    if (/\s{2,}/.test(l)) return false;
    return nameToId.has(norm(l));
  });
  const ncg = champLine ? nameToId.get(norm(champLine)) : eastChamp;

  const picks = {
    first_four: { ff_1: "ff_1b", ff_2: "ff_2b", ff_3: "ff_3b", ff_4: "ff_4b" },
    r64: {},
    r32: {},
    s16: {},
    e8: {},
    f4: {},
    ncg: {},
  };

  const regs = ["west", "east", "south", "midwest"];
  const r64g = [r64W, r64E, r64S, r64M];
  const r32i = [w32, e32, s32, m32];
  const s16i = [w16.ids, e16.ids, s16.ids, m16.ids];
  const e8i = [w8.ids, e8.ids, s8.ids, m8.ids];
  const ch = [westChamp, eastChamp, southChamp, mwChamp];

  for (let r = 0; r < 4; r++) {
    const p = regs[r];
    for (let j = 0; j < 8; j++) {
      picks.r64[`${p}_r64_${j + 1}`] = r32i[r][j];
    }
    for (let j = 0; j < 4; j++) {
      picks.r32[`${p}_r32_${j + 1}`] = s16i[r][j];
    }
    for (let j = 0; j < 2; j++) {
      picks.s16[`${p}_s16_${j + 1}`] = e8i[r][j];
    }
    picks.e8[`${p}_e8_1`] = ch[r];
  }

  picks.f4.f4_1 = f4_1;
  picks.f4.f4_2 = f4_2;
  picks.ncg.ncg = ncg;

  return { picks, warnings };
}
