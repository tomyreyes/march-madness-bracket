import { NextResponse } from "next/server";

import { bracketPositionToOurSlot } from "@/lib/ncaa-bracket-slots";
import { getEasternYmdParts } from "@/lib/eastern-date";
import { fetchMenD1Scoreboard, isScoreboardGameLive } from "@/lib/live-scoreboard";
import { splitParticipantPicksForLiveGame } from "@/lib/live-participant-picks";
import { loadBracketData } from "@/lib/load-data";
import { buildSeoResolver } from "@/lib/seo-team-resolve";

import type { LiveGameResponseItem } from "@/lib/live-game-types";
import { buildMockLiveGamesPayload } from "@/lib/live-games-mock";

export const revalidate = 15;

export async function GET(req: Request) {
  if (process.env.MOCK_LIVE_GAMES === "1") {
    return NextResponse.json(buildMockLiveGamesPayload());
  }

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");

  let yPart: string;
  let mPart: string;
  let dPart: string;
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const [y, m, d] = dateParam.split("-");
    yPart = y;
    mPart = m;
    dPart = d;
  } else {
    const e = getEasternYmdParts();
    yPart = e.y;
    mPart = e.m;
    dPart = e.day;
  }

  const scoreboardSeasonYear = Number(yPart);
  if (!Number.isFinite(scoreboardSeasonYear)) {
    return NextResponse.json({ error: "Invalid date year" }, { status: 400 });
  }

  const cwd = process.cwd();
  let data;
  try {
    data = loadBracketData();
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load bracket data" }, { status: 500 });
  }

  const resolveSeo = buildSeoResolver(cwd, data.teams);
  const gamesBySlot = data.gamesBySlot;

  let scoreboard;
  try {
    scoreboard = await fetchMenD1Scoreboard(scoreboardSeasonYear, mPart, dPart);
  } catch (e) {
    console.error(e);
    const hint =
      e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
    return NextResponse.json(
      {
        error: "Scoreboard fetch failed",
        errorDetail: hint,
        games: [],
        dateKey: `${scoreboardSeasonYear}-${mPart}-${dPart}`,
        updatedAt: new Date().toISOString(),
      },
      { status: 200 },
    );
  }

  const items: LiveGameResponseItem[] = [];

  for (const row of scoreboard.games) {
    if (!isScoreboardGameLive(row.gameState, row.currentPeriod)) continue;
    if (row.bracketId == null || !Number.isFinite(Number(row.bracketId))) continue;

    const mapped = bracketPositionToOurSlot(row.bracketId);
    if (!mapped) continue;

    const game = gamesBySlot.get(mapped.slotId);
    if (!game) continue;

    const homeId = resolveSeo(row.home.seo);
    const awayId = resolveSeo(row.away.seo);
    if (!homeId || !awayId) continue;

    const { picksHomeNames, picksAwayNames, bystanderNames } = splitParticipantPicksForLiveGame(
      game,
      data.participants,
      gamesBySlot,
      data.actualBySlot,
      homeId,
      awayId,
    );

    items.push({
      contestId: row.gameID,
      slotId: mapped.slotId,
      round: mapped.round,
      currentPeriod: row.currentPeriod,
      contestClock: row.contestClock,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: row.home.score,
      awayScore: row.away.score,
      picksHomeNames,
      picksAwayNames,
      bystanderNames,
    });
  }

  return NextResponse.json({
    games: items,
    dateKey: `${scoreboardSeasonYear}-${mPart}-${dPart}`,
    sourceUrl: scoreboard.sourceUrl,
    updatedAt: new Date().toISOString(),
  });
}
