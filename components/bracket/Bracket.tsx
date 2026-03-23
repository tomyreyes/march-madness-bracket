import type { GameNode, Participant, Team } from "@/lib/bracket-types";
import { MatchupCard } from "./MatchupCard";

const REGIONS = ["east", "south", "west", "midwest"] as const;
const REGION_ROUNDS: Array<GameNode["round"]> = ["r64", "r32", "s16", "e8"];

type Props = {
  games: GameNode[];
  viewParticipant: Participant;
  pinnedParticipant: Participant | null;
  allParticipants: Participant[];
  teamsById: Record<string, Team>;
  gamesBySlot: Record<string, GameNode>;
  diffEnabled: boolean;
  actualBySlot: Record<string, string>;
};

function sortBySlotId(list: GameNode[]): GameNode[] {
  return [...list].sort((a, b) => a.slotId.localeCompare(b.slotId));
}

export function Bracket({
  games,
  viewParticipant,
  pinnedParticipant,
  allParticipants,
  teamsById,
  gamesBySlot,
  diffEnabled,
  actualBySlot,
}: Props) {
  const firstFour = sortBySlotId(games.filter((g) => g.round === "first_four"));
  const f4 = sortBySlotId(games.filter((g) => g.round === "f4"));
  const ncg = games.filter((g) => g.round === "ncg");

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          First Four
        </h2>
        <div className="flex flex-wrap gap-2">
          {firstFour.map((g) => (
            <MatchupCard
              key={g.slotId}
              game={g}
              viewParticipant={viewParticipant}
              pinnedParticipant={pinnedParticipant}
              allParticipants={allParticipants}
              teamsById={teamsById}
              gamesBySlot={gamesBySlot}
              diffEnabled={diffEnabled}
              actualBySlot={actualBySlot}
            />
          ))}
        </div>
      </section>

      <section className="overflow-x-auto">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Regionals
        </h2>
        <div className="grid min-w-[56rem] grid-cols-4 gap-3">
          {REGIONS.map((region) => (
            <div key={region} className="flex flex-col gap-4">
              <div className="text-center text-xs font-semibold uppercase text-zinc-300">
                {region}
              </div>
              {REGION_ROUNDS.map((round) => {
                const roundGames = sortBySlotId(
                  games.filter((g) => g.region === region && g.round === round),
                );
                if (roundGames.length === 0) {
                  return null;
                }
                return (
                  <div key={`${region}-${round}`} className="flex flex-col gap-2">
                    <div className="text-[10px] font-medium uppercase text-zinc-500">{round}</div>
                    <div className="flex flex-col gap-2">
                      {roundGames.map((g) => (
                        <MatchupCard
                          key={g.slotId}
                          game={g}
                          viewParticipant={viewParticipant}
                          pinnedParticipant={pinnedParticipant}
                          allParticipants={allParticipants}
                          teamsById={teamsById}
                          gamesBySlot={gamesBySlot}
                          diffEnabled={diffEnabled}
                          actualBySlot={actualBySlot}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Final Four & Championship
        </h2>
        <div className="flex flex-wrap gap-2">
          {f4.map((g) => (
            <MatchupCard
              key={g.slotId}
              game={g}
              viewParticipant={viewParticipant}
              pinnedParticipant={pinnedParticipant}
              allParticipants={allParticipants}
              teamsById={teamsById}
              gamesBySlot={gamesBySlot}
              diffEnabled={diffEnabled}
              actualBySlot={actualBySlot}
            />
          ))}
          {ncg.map((g) => (
            <MatchupCard
              key={g.slotId}
              game={g}
              viewParticipant={viewParticipant}
              pinnedParticipant={pinnedParticipant}
              allParticipants={allParticipants}
              teamsById={teamsById}
              gamesBySlot={gamesBySlot}
              diffEnabled={diffEnabled}
              actualBySlot={actualBySlot}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
