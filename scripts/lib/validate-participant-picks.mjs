/**
 * Validate parsed or hand-built participant picks against data/teams.json and
 * structural template from the reference participant (Tomy).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { projectRoot } from "./project-root.mjs";

const REGIONS = new Set(["east", "south", "west", "midwest"]);

/** @param {Record<string, unknown>} obj @param {string} prefix */
function collectLeafPaths(obj, prefix = "") {
  /** @type {string[]} */
  const out = [];
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      out.push(...collectLeafPaths(v, p));
    } else {
      out.push(p);
    }
  }
  return out.sort();
}

/**
 * @param {string} slotPath e.g. east_r64_1
 * @returns {string | null}
 */
function regionFromSlotPath(slotPath) {
  const m = /^(east|south|west|midwest)_(r64|r32|s16|e8)_/.exec(slotPath);
  return m ? m[1] : null;
}

/**
 * @param {import('node:fs').PathLike} teamsPath
 * @returns {Map<string, { id: string, region: string }>}
 */
export function loadTeamsById(teamsPath) {
  const raw = JSON.parse(fs.readFileSync(teamsPath, "utf8"));
  const map = new Map();
  for (const t of raw.teams) {
    map.set(t.id, t);
  }
  return map;
}

/**
 * @param {string} root
 * @param {string} [referenceId]
 */
export function loadReferencePickPaths(root, referenceId = "tomy") {
  const baselinePath = path.join(root, "data", "tournament-baseline.json");
  let id = referenceId;
  if (fs.existsSync(baselinePath)) {
    const b = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    if (b.referenceParticipantId) id = b.referenceParticipantId;
  }
  const refPath = path.join(root, "data", "participants", `${id}.json`);
  if (!fs.existsSync(refPath)) {
    throw new Error(`Reference participant not found: ${refPath}`);
  }
  const ref = JSON.parse(fs.readFileSync(refPath, "utf8"));
  if (!ref.picks) throw new Error(`Reference ${id}.json missing picks`);
  return { referenceId: id, paths: new Set(collectLeafPaths(ref.picks)) };
}

const FF_RE = /^ff_[1-4][ab]$/;

/**
 * @param {Record<string, unknown>} picks
 * @param {Map<string, { id: string, region: string }>} teamsById
 * @param {{ referencePaths?: Set<string>, label?: string }} [opts]
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateParticipantPicks(picks, teamsById, opts = {}) {
  const errors = [];
  const warnings = [];
  const label = opts.label ?? "picks";

  const incomingPaths = collectLeafPaths(picks);
  const ref = opts.referencePaths;
  const incomingSet = new Set(incomingPaths);
  if (ref) {
    for (const p of ref) {
      if (!incomingSet.has(p)) {
        errors.push(`${label}: missing slot ${p} (expected from reference bracket)`);
      }
    }
    for (const p of incomingPaths) {
      if (!ref.has(p)) {
        warnings.push(`${label}: unexpected slot ${p} (not in reference template)`);
      }
    }
  }

  for (const dotPath of incomingPaths) {
    const parts = dotPath.split(".");
    const slotKey = parts[parts.length - 1];
    /** @type {unknown} */
    let cur = picks;
    for (const part of parts) {
      if (cur === null || typeof cur !== "object") break;
      cur = /** @type {Record<string, unknown>} */ (cur)[part];
    }
    const value = typeof cur === "string" ? cur : null;
    if (value === null || value === "") {
      errors.push(`${label}: ${dotPath} is missing or not a string`);
      continue;
    }

    if (dotPath.startsWith("first_four.")) {
      if (!FF_RE.test(value)) {
        errors.push(`${label}: ${dotPath}="${value}" must be ff_[1-4]a or ff_[1-4]b`);
      }
      const team = teamsById.get(value);
      if (!team || team.region !== "first_four") {
        errors.push(`${label}: ${dotPath} unknown First Four id "${value}"`);
      }
      continue;
    }

    const team = teamsById.get(value);
    if (!team) {
      errors.push(`${label}: ${dotPath} unknown team id "${value}" (not in teams.json)`);
      continue;
    }

    const reg = regionFromSlotPath(slotKey);
    if (reg && REGIONS.has(reg)) {
      if (team.region !== reg) {
        errors.push(
          `${label}: ${dotPath} team "${value}" has region "${team.region}" in teams.json but slot is ${reg} (possible PDF column/region mix-up)`,
        );
      }
    }

    if (dotPath.startsWith("f4.") || dotPath.startsWith("ncg.")) {
      if (!REGIONS.has(/** @type {string} */ (team.region))) {
        errors.push(
          `${label}: ${dotPath} national rounds must pick a regional team id, got region "${team.region}"`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * CLI helper: validate one participant file.
 * @param {string} [participantPath]
 */
export function mainCli(participantPath) {
  const root = projectRoot(import.meta.url);
  const teamsPath = path.join(root, "data", "teams.json");
  const teamsById = loadTeamsById(teamsPath);
  const { referenceId, paths } = loadReferencePickPaths(root);
  const target =
    participantPath ?? path.join(root, "data", "participants", `${referenceId}.json`);
  const body = JSON.parse(fs.readFileSync(target, "utf8"));
  const { ok, errors, warnings } = validateParticipantPicks(body.picks, teamsById, {
    referencePaths: paths,
    label: body.id ?? path.basename(target),
  });
  for (const w of warnings) console.error("WARN", w);
  for (const e of errors) console.error("ERR ", e);
  if (!ok) process.exit(1);
  console.error("OK", target, `(${referenceId} template)`);
}
