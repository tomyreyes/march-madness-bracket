import * as fs from "node:fs";
import * as path from "node:path";

import type { Team } from "@/lib/bracket-types";

function slugName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Resolve NCAA `seoname` from scoreboard/brackets JSON to our `teams.json` id.
 */
export function buildSeoResolver(cwd: string, teams: Team[]): (seo: string) => string | null {
  const bySeo = new Map<string, string>();
  for (const t of teams) {
    bySeo.set(t.id.toLowerCase(), t.id);
    const sn = slugName(t.name);
    if (sn) bySeo.set(sn, t.id);
  }

  const overridesPath = path.join(cwd, "data", "ncaa-seo-overrides.json");
  try {
    const raw = fs.readFileSync(overridesPath, "utf8");
    const o = JSON.parse(raw) as Record<string, string>;
    for (const [k, v] of Object.entries(o)) {
      if (!k.startsWith("$") && typeof v === "string") {
        bySeo.set(k.toLowerCase(), v);
      }
    }
  } catch {
    /* optional file */
  }

  return (seo: string) => {
    if (!seo || typeof seo !== "string") return null;
    return bySeo.get(seo.trim().toLowerCase()) ?? null;
  };
}
