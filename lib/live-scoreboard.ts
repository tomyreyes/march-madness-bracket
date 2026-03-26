const DEFAULT_API_BASE = "https://ncaa-api.henrygd.me";

export function getNcaaApiBase(): string {
  const b = process.env.NCAA_API_BASE?.trim();
  return b && b.length > 0 ? b.replace(/\/$/, "") : DEFAULT_API_BASE;
}

export function isScoreboardGameFinal(gameState: string, currentPeriod: string): boolean {
  const gs = String(gameState ?? "").toLowerCase();
  const cp = String(currentPeriod ?? "").toUpperCase();
  return gs === "final" || gs === "f" || cp === "FINAL" || cp.startsWith("FINAL");
}

/** In-progress games suitable for a "live" strip (excludes final and typical pregame). */
export function isScoreboardGameLive(gameState: string, currentPeriod: string): boolean {
  if (isScoreboardGameFinal(gameState, currentPeriod)) return false;
  const gs = String(gameState ?? "").toLowerCase();
  if (gs === "pre" || gs === "preview" || gs === "scheduled" || gs === "postponed") {
    return false;
  }
  const cp = String(currentPeriod ?? "").toUpperCase();
  if (cp === "PREGAME" || cp.includes("COMING")) return false;
  if (gs === "live" || gs === "in_progress") return true;
  if (
    cp === "1ST" ||
    cp === "2ND" ||
    cp.includes("HALF") ||
    cp.includes("OT") ||
    cp.includes("TIMEOUT")
  ) {
    return true;
  }
  return false;
}

export type ScoreboardSide = {
  score: string;
  seo: string;
  short: string;
};

export type ScoreboardGameRow = {
  gameID: string;
  gameState: string;
  currentPeriod: string;
  contestClock: string;
  finalMessage: string;
  bracketId: number | string | null;
  home: ScoreboardSide;
  away: ScoreboardSide;
};

function parseSide(raw: unknown): ScoreboardSide | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const names = o.names as Record<string, unknown> | undefined;
  const seo = names?.seo != null ? String(names.seo) : "";
  const short = names?.short != null ? String(names.short) : seo;
  const score = o.score != null ? String(o.score) : "";
  if (!seo) return null;
  return { score, seo, short };
}

export function parseScoreboardGames(body: unknown): ScoreboardGameRow[] {
  if (!body || typeof body !== "object") return [];
  const games = (body as { games?: unknown }).games;
  if (!Array.isArray(games)) return [];

  const out: ScoreboardGameRow[] = [];
  for (const item of games) {
    const wrap = item as { game?: unknown };
    const g = wrap?.game;
    if (!g || typeof g !== "object") continue;
    const o = g as Record<string, unknown>;
    const home = parseSide(o.home);
    const away = parseSide(o.away);
    if (!home || !away) continue;
    const gameID = String(o.gameID ?? "");
    if (!gameID) continue;
    out.push({
      gameID,
      gameState: String(o.gameState ?? ""),
      currentPeriod: String(o.currentPeriod ?? ""),
      contestClock: String(o.contestClock ?? ""),
      finalMessage: String(o.finalMessage ?? ""),
      bracketId:
        o.bracketId != null && o.bracketId !== "" ? Number(o.bracketId) : null,
      home,
      away,
    });
  }
  return out;
}

export async function fetchMenD1Scoreboard(
  year: number,
  month: string,
  day: string,
): Promise<{ games: ScoreboardGameRow[]; sourceUrl: string }> {
  const base = getNcaaApiBase();
  const url = `${base}/scoreboard/basketball-men/d1/${year}/${month}/${day}/all-conf`;
  const res = await fetch(url, { next: { revalidate: 15 } });
  if (!res.ok) {
    throw new Error(`Scoreboard ${res.status}: ${url}`);
  }
  const body: unknown = await res.json();
  return { games: parseScoreboardGames(body), sourceUrl: url };
}
