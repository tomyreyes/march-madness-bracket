import * as fs from "node:fs";
import * as path from "node:path";

function slugName(name) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * @param {string} root - project root
 * @returns {(seo: string) => string | null}
 */
export function loadSeoResolver(root) {
  const teamsPath = path.join(root, "data", "teams.json");
  const raw = JSON.parse(fs.readFileSync(teamsPath, "utf8"));
  const teams = raw.teams ?? [];

  const overridesPath = path.join(root, "data", "ncaa-seo-overrides.json");
  let overrides = {};
  try {
    const o = JSON.parse(fs.readFileSync(overridesPath, "utf8"));
    for (const [k, v] of Object.entries(o)) {
      if (!k.startsWith("$") && typeof v === "string") overrides[k.toLowerCase()] = v;
    }
  } catch {
    /* optional */
  }

  const bySeo = new Map();
  for (const t of teams) {
    bySeo.set(t.id.toLowerCase(), t.id);
    const sn = slugName(t.name);
    if (sn) bySeo.set(sn, t.id);
  }
  for (const [seo, id] of Object.entries(overrides)) {
    bySeo.set(seo.toLowerCase(), id);
  }

  return function resolveTeamId(seo) {
    if (!seo || typeof seo !== "string") return null;
    const key = seo.trim().toLowerCase();
    return bySeo.get(key) ?? null;
  };
}
