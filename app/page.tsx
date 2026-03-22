import { Suspense } from "react";
import { BracketApp } from "@/components/BracketApp";
import { loadBracketData } from "@/lib/load-data";

export default function HomePage() {
  const data = loadBracketData();
  const payload = {
    teamsById: Object.fromEntries(data.teamsById),
    gamesBySlot: Object.fromEntries(data.gamesBySlot),
    games: data.games,
    meta: data.meta,
    participants: data.participants,
  };

  return (
    <Suspense
      fallback={<div className="p-6 text-sm text-zinc-300">Loading bracket…</div>}
    >
      <BracketApp {...payload} />
    </Suspense>
  );
}
