import * as path from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root: works from scripts/*.mjs or scripts/lib/*.mjs */
export function projectRoot(fromImportMetaUrl) {
  const dir = path.dirname(fileURLToPath(fromImportMetaUrl));
  return path.basename(dir) === "lib"
    ? path.resolve(dir, "..", "..")
    : path.resolve(dir, "..");
}
