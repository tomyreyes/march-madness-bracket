/**
 * Validate a participant JSON (default: reference from tournament-baseline.json).
 *
 * Usage: node scripts/validate-picks.mjs [path/to/participant.json]
 */
import * as path from "node:path";
import { projectRoot } from "./lib/project-root.mjs";
import { mainCli } from "./lib/validate-participant-picks.mjs";

const root = projectRoot(import.meta.url);
const arg = process.argv[2];
const target = arg ? path.resolve(arg) : null;
mainCli(target ?? undefined);
