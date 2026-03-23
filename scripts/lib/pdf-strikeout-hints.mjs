/**
 * Detect PDF StrikeOut annotations (crossed-out picks after games are played) and map them
 * to `alwaysPick`-style winners for first-round matchups. Plain `pdf-parse` text has no
 * strikethrough; this uses pdfjs annotation geometry + text positions.
 *
 * Limitations: only standard StrikeOut annotations; vector-only or raster marks are invisible.
 */
import { createRequire } from "node:module";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import { norm } from "../parse-bracket-text.mjs";

const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.mjs");

/** @param {{ x0: number, y0: number, x1: number, y1: number }} a */
function annBounds(ann) {
  const qp = ann.quadPoints;
  if (qp && qp.length >= 8) {
    const xs = [];
    const ys = [];
    for (let i = 0; i < qp.length; i += 2) {
      xs.push(qp[i]);
      ys.push(qp[i + 1]);
    }
    return {
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      y0: Math.min(...ys),
      y1: Math.max(...ys),
    };
  }
  const [x1, y1, x2, y2] = ann.rect || [0, 0, 0, 0];
  return {
    x0: Math.min(x1, x2),
    x1: Math.max(x1, x2),
    y0: Math.min(y1, y2),
    y1: Math.max(y1, y2),
  };
}

/** @param {{ transform: number[], width?: number, height?: number, str: string }} item */
function textItemBounds(item) {
  const t = item.transform;
  const x = t[4];
  const y = t[5];
  const w = item.width ?? 0;
  const h = item.height ?? (Math.abs(t[3]) || 10);
  return { x0: x, x1: x + w, y0: y - h, y1: y };
}

function overlapArea(a, b) {
  const ix0 = Math.max(a.x0, b.x0);
  const iy0 = Math.max(a.y0, b.y0);
  const ix1 = Math.min(a.x1, b.x1);
  const iy1 = Math.min(a.y1, b.y1);
  if (ix0 >= ix1 || iy0 >= iy1) return 0;
  return (ix1 - ix0) * (iy1 - iy0);
}

function itemArea(a) {
  return Math.max(0, a.x1 - a.x0) * Math.max(0, a.y1 - a.y0);
}

/**
 * @param {Buffer | Uint8Array} buffer
 * @returns {Promise<Set<string>[]>} four sets of struck text norms (East, South, West, Midwest PDF columns)
 */
export async function extractStruckNormsByPdfColumn(buffer) {
  /** pdf.js warns on Node `Buffer`; always pass a plain Uint8Array. */
  const data =
    buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : Buffer.isBuffer(buffer) || buffer instanceof Uint8Array
        ? Uint8Array.from(buffer)
        : new Uint8Array(buffer);
  const pdf = await getDocument({ data, disableFontFace: true }).promise;
  /** @type {Set<string>[]} */
  const perCol = [new Set(), new Set(), new Set(), new Set()];

  for (let pi = 0; pi < pdf.numPages; pi++) {
    const page = await pdf.getPage(pi + 1);
    const view = page.view;
    const pageW = view[2] - view[0];
    const pageX0 = view[0];
    if (pageW <= 0) continue;

    const [annotations, textContent] = await Promise.all([
      page.getAnnotations({ intent: "display" }),
      page.getTextContent({ disableNormalization: false }),
    ]);

    const items = textContent.items.filter((it) => "str" in it && it.str?.trim());

    for (const ann of annotations) {
      const st = String(ann.subtype || "");
      if (st !== "StrikeOut" && st !== "StrikeThru") continue;

      const ab = annBounds(ann);
      const hits = [];
      for (const it of items) {
        const tb = textItemBounds(it);
        const o = overlapArea(ab, tb);
        if (o <= 0) continue;
        const ia = itemArea(tb);
        if (ia > 0 && o / ia < 0.15) continue;
        hits.push({ it, x: tb.x0 });
      }
      if (hits.length === 0) continue;

      hits.sort((a, b) => a.x - b.x);
      const raw = hits.map((h) => h.it.str).join("");
      const n = norm(raw);
      if (!n) continue;

      const cx = (ab.x0 + ab.x1) / 2;
      const col = Math.min(3, Math.max(0, Math.floor(((cx - pageX0) / pageW) * 4)));
      perCol[col].add(n);
    }
  }

  return perCol;
}

/**
 * @param {{ ta: string, tb: string }[]} games
 * @param {Set<string>} struckNorms
 * @returns {Record<string, string>} canonical tieKey → winner norm
 */
export function strikeoutAlwaysPickForRegion(games, struckNorms) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const { ta, tb } of games) {
    const na = norm(ta);
    const nb = norm(tb);
    const aStruck = struckNorms.has(na);
    const bStruck = struckNorms.has(nb);
    if (aStruck === bStruck) continue;
    const winnerN = aStruck ? nb : na;
    const tieKey = [na, nb].sort((a, b) => a.localeCompare(b)).join("|");
    out[tieKey] = winnerN;
  }
  return out;
}

/**
 * @param {Buffer} buffer
 * @param {ReturnType<typeof import("../parse-bracket-text.mjs").extractR64GamesForStrikeout>} r64ByRegion
 * @returns {Promise<Record<string, string>>} merged-style alwaysPick entries (keys canonical)
 */
export async function buildStrikeoutAlwaysPickFromPdf(buffer, r64ByRegion) {
  const [r64E, r64S, r64W, r64M] = r64ByRegion;
  const cols = await extractStruckNormsByPdfColumn(buffer);
  return {
    ...strikeoutAlwaysPickForRegion(r64E, cols[0]),
    ...strikeoutAlwaysPickForRegion(r64S, cols[1]),
    ...strikeoutAlwaysPickForRegion(r64W, cols[2]),
    ...strikeoutAlwaysPickForRegion(r64M, cols[3]),
  };
}
