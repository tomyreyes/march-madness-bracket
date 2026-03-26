import type { GameNode, Participant, Team } from "@/lib/bracket-types";
import {
  getDisplayRoundOrder,
  isRegionalDisplayRound,
  NCAA_REGIONS,
  phaseBadgeLabel,
  roundSectionTitle,
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

function phaseBadgeClass(phase: RoundDisplayPhase): string {
  const base =
    "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide";
  switch (phase) {
    case "live":
      return `${base} bg-emerald-600/90 text-white shadow-sm shadow-emerald-900/40`;
    case "upcoming":
      return `${base} bg-sky-500/20 text-sky-200 ring-1 ring-inset ring-sky-500/35`;
    case "complete":
      return `${base} bg-zinc-700/70 text-zinc-200 ring-1 ring-inset ring-zinc-500/40`;
    default: {
      const _exhaustive: never = phase;
      return _exhaustive;
    }
  }
}

function RoundSectionHeader({ round, phase }: { round: DisplayRoundId; phase: RoundDisplayPhase }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 gap-y-1">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {roundSectionTitle(round)}
      </h2>
      <span className={phaseBadgeClass(phase)}>{phaseBadgeLabel(phase)}</span>
    </div>
  );
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
  return (
    <section>
      <RoundSectionHeader round={round} phase={phase} />

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
  const roundGames = sortBySlotId(games.filter((g) => g.round === round));

  return (
    <section>
      <RoundSectionHeader round={round} phase={phase} />
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
