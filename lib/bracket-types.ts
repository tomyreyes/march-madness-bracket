import { z } from "zod";

export const ROUND_IDS = [
  "first_four",
  "r64",
  "r32",
  "s16",
  "e8",
  "f4",
  "ncg",
] as const;

export type RoundId = (typeof ROUND_IDS)[number];

export const roundIdSchema = z.enum(ROUND_IDS);

export const participantSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  year: z.number().int().optional(),
  picks: z.record(roundIdSchema, z.record(z.string(), z.string())),
});

export type Participant = z.infer<typeof participantSchema>;

export const teamSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  seed: z.number().int().min(1).max(16).optional(),
  region: z.string().optional(),
});

export type Team = z.infer<typeof teamSchema>;

export const teamsFileSchema = z.object({
  teams: z.array(teamSchema),
});

export const metaSchema = z.object({
  tournamentLabel: z.string(),
  participantIds: z.array(z.string()),
  fallbackParticipantId: z.string().optional(),
});

export type Meta = z.infer<typeof metaSchema>;

export const actualGameResultSchema = z.object({
  contestId: z.string(),
  winnerTeamId: z.string(),
  winnerSeo: z.string().optional(),
  updatedAt: z.string(),
});

export const tournamentResultsFileSchema = z
  .object({
    schemaVersion: z.number().optional(),
    seasonYear: z.number().nullable().optional(),
    apiBase: z.string().optional(),
    lastSyncedAt: z.string().nullable().optional(),
    actuals: z
      .record(roundIdSchema, z.record(z.string(), actualGameResultSchema))
      .default({}),
    syncNotes: z.array(z.string()).optional(),
  })
  .passthrough();

export type TournamentResultsFile = z.infer<typeof tournamentResultsFileSchema>;
export type ActualGameResult = z.infer<typeof actualGameResultSchema>;

export type Side =
  | { kind: "team"; teamId: string }
  | { kind: "winner"; slotId: string };

export type GameNode = {
  slotId: string;
  round: RoundId;
  region: string | null;
  sideA: Side;
  sideB: Side;
};
