import type { GameNode, Participant, Team } from "@/lib/bracket-types";
import {
  getDisplayRoundOrder,
  isRegionalDisplayRound,
  NCAA_REGIONS,
  roundSectionHeading,
  type DisplayRoundId,
  type RoundDisplayPhase,
} from "@/lib/bracket-display-order";
import { MatchupCard } from "./MatchupCard";

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

type CardListProps = Pick<
  Props,
  | "viewParticipant"
  | "pinnedParticipant"
  | "allParticipants"
  | "teamsById"
  | "gamesBySlot"
  | "diffEnabled"
  | "actualBySlot"
>;

function sortBySlotId(list: GameNode[]): GameNode[] {
  return [...list].sort((a, b) => a.slotId.localeCompare(b.slotId));
}

function MatchupCardList({
  games: gameList,
  ...cardProps
}: CardListProps & { games: GameNode[] }) {
  return (
    <>
      {gameList.map((g) => (
        <MatchupCard
          key={g.slotId}
          game={g}
          viewParticipant={cardProps.viewParticipant}
          pinnedParticipant={cardProps.pinnedParticipant}
          allParticipants={cardProps.allParticipants}
          teamsById={cardProps.teamsById}
          gamesBySlot={cardProps.gamesBySlot}
          diffEnabled={cardProps.diffEnabled}
          actualBySlot={cardProps.actualBySlot}
        />
      ))}
    </>
  );
}

function RegionalRoundSection({
  round,
  phase,
  games,
  ...cardProps
}: CardListProps & { round: DisplayRoundId; phase: RoundDisplayPhase; games: GameNode[] }) {
  const title = roundSectionHeading(round, phase);

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>

      <div className="flex flex-col gap-8 md:hidden">
        {NCAA_REGIONS.map((region) => {
          const roundGames = sortBySlotId(
            games.filter((g) => g.region === region && g.round === round),
          );
          if (roundGames.length === 0) {
            return null;
          }
          return (
            <div
              key={region}
              className="border-b border-zinc-800 pb-6 last:border-b-0 last:pb-0"
            >
              <div className="mb-3 text-center text-sm font-semibold uppercase text-zinc-300">
                {region}
              </div>
              <div className="flex flex-wrap gap-2">
                <MatchupCardList games={roundGames} {...cardProps} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden md:grid md:grid-cols-4 md:gap-3">
        {NCAA_REGIONS.map((region) => {
          const roundGames = sortBySlotId(
            games.filter((g) => g.region === region && g.round === round),
          );
          return (
            <div key={region} className="flex min-w-0 flex-col gap-2">
              <div className="text-center text-xs font-semibold uppercase text-zinc-300">{region}</div>
              <div className="flex flex-col gap-2">
                <MatchupCardList games={roundGames} {...cardProps} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function NationalRoundSection({
  round,
  phase,
  games,
  ...cardProps
}: CardListProps & { round: DisplayRoundId; phase: RoundDisplayPhase; games: GameNode[] }) {
  const title = roundSectionHeading(round, phase);
  const roundGames = sortBySlotId(games.filter((g) => g.round === round));

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
      <div className="flex flex-wrap gap-2">
        <MatchupCardList games={roundGames} {...cardProps} />
      </div>
    </section>
  );
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
  const ordered = getDisplayRoundOrder(games, actualBySlot);
  const cardProps: CardListProps = {
    viewParticipant,
    pinnedParticipant,
    allParticipants,
    teamsById,
    gamesBySlot,
    diffEnabled,
    actualBySlot,
  };

  return (
    <div className="space-y-8">
      {ordered.map(({ round, phase }) =>
        isRegionalDisplayRound(round) ? (
          <RegionalRoundSection key={round} round={round} phase={phase} games={games} {...cardProps} />
        ) : (
          <NationalRoundSection key={round} round={round} phase={phase} games={games} {...cardProps} />
        ),
      )}
    </div>
  );
}
