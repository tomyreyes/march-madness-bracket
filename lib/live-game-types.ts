export type LiveGameResponseItem = {
  contestId: string;
  slotId: string;
  round: string;
  currentPeriod: string;
  contestClock: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: string;
  awayScore: string;
  picksHomeNames: string[];
  picksAwayNames: string[];
};

export type LiveGamesApiPayload = {
  games: LiveGameResponseItem[];
  dateKey: string;
  sourceUrl?: string;
  updatedAt: string;
  error?: string;
  /** Present when `error` is set (e.g. upstream fetch failure) for debugging. */
  errorDetail?: string;
};
