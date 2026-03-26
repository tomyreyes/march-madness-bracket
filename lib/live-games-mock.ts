import type { LiveGamesApiPayload } from "@/lib/live-game-types";

/**
 * Dev-only payload matching `GET /api/live-games` JSON shape.
 * Enable with `MOCK_LIVE_GAMES=1` (e.g. in `.env.local`) when upstream TLS/network blocks fetches.
 *
 * Team ids and slot ids must exist in `data/teams.json` and bracket tree (`east_s16_*`).
 * Display names align with `data/participants/*.json` picks for those slots where noted.
 */
export function buildMockLiveGamesPayload(): LiveGamesApiPayload {
  const now = new Date().toISOString();
  return {
    games: [
      {
        contestId: "mock-east-s16-2",
        slotId: "east_s16_2",
        round: "s16",
        currentPeriod: "2ND",
        contestClock: "4:42",
        homeTeamId: "michst",
        awayTeamId: "uconn",
        homeScore: "58",
        awayScore: "61",
        picksHomeNames: ["Tomy", "Brennan", "Eric", "Zach", "Levi", "Megan", "Derek", "Alex-1", "Keith"],
        picksAwayNames: ["Brett", "Jonny", "Jeff", "Casandra", "Shu", "Pau", "Michael", "Ty-2", "Sam"],
      },
      {
        contestId: "mock-east-s16-1",
        slotId: "east_s16_1",
        round: "s16",
        currentPeriod: "1ST",
        contestClock: "7:15",
        homeTeamId: "duke",
        awayTeamId: "kansas",
        homeScore: "34",
        awayScore: "31",
        picksHomeNames: ["Tomy", "Eric", "Quinn", "Miranda", "Rob", "Herman", "Laura-2", "Aaron"],
        picksAwayNames: ["Haydn", "Ty-2"],
      },
    ],
    dateKey: "mock",
    sourceUrl: "mock://live-games",
    updatedAt: now,
  };
}
