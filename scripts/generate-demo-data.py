#!/usr/bin/env python3
"""Emit data/teams.json, data/meta.json, data/participants/*.json (chalk + variants)."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

REGIONS = ["west", "east", "south", "midwest"]
R64A = [1, 8, 5, 4, 6, 3, 7, 2]
R64B = [16, 9, 12, 13, 11, 14, 10, 15]
Side = Tuple[str, str]  # ("team"|"winner", ref)


@dataclass
class Game:
    slot_id: str
    round: str
    region: Optional[str]
    side_a: Side
    side_b: Side


def build_games() -> List[Game]:
    games: List[Game] = []
    for i in range(4):
        k = i + 1
        games.append(
            Game(
                f"ff_{k}",
                "first_four",
                None,
                ("team", f"ff_{k}a"),
                ("team", f"ff_{k}b"),
            )
        )

    ff_by_region = {"west": "ff_1", "east": "ff_2", "south": "ff_3", "midwest": "ff_4"}

    for region in REGIONS:
        for g in range(8):
            sa, sb = R64A[g], R64B[g]
            if sa == 1 and sb == 16:
                side_b: Side = ("winner", ff_by_region[region])
            else:
                side_b = ("team", f"{region}-{sb}")
            games.append(
                Game(
                    f"{region}_r64_{g+1}",
                    "r64",
                    region,
                    ("team", f"{region}-{sa}"),
                    side_b,
                )
            )

    for region in REGIONS:
        for g in range(4):
            games.append(
                Game(
                    f"{region}_r32_{g+1}",
                    "r32",
                    region,
                    ("winner", f"{region}_r64_{g*2+1}"),
                    ("winner", f"{region}_r64_{g*2+2}"),
                )
            )

    for region in REGIONS:
        for g in range(2):
            games.append(
                Game(
                    f"{region}_s16_{g+1}",
                    "s16",
                    region,
                    ("winner", f"{region}_r32_{g*2+1}"),
                    ("winner", f"{region}_r32_{g*2+2}"),
                )
            )

    for region in REGIONS:
        games.append(
            Game(
                f"{region}_e8_1",
                "e8",
                region,
                ("winner", f"{region}_s16_1"),
                ("winner", f"{region}_s16_2"),
            )
        )

    games.extend(
        [
            Game("f4_1", "f4", None, ("winner", "west_e8_1"), ("winner", "east_e8_1")),
            Game("f4_2", "f4", None, ("winner", "south_e8_1"), ("winner", "midwest_e8_1")),
            Game("ncg", "ncg", None, ("winner", "f4_1"), ("winner", "f4_2")),
        ]
    )
    return games


def build_teams() -> List[dict]:
    teams: List[dict] = []
    for r in REGIONS:
        for s in range(1, 17):
            teams.append(
                {
                    "id": f"{r}-{s}",
                    "name": f"{r.title()} #{s}",
                    "seed": s,
                    "region": r,
                }
            )
    for k in range(1, 5):
        for suffix in ("a", "b"):
            fid = f"ff_{k}{suffix}"
            teams.append(
                {
                    "id": fid,
                    "name": fid.replace("_", " ").title(),
                    "seed": 16,
                    "region": "first_four",
                }
            )
    return teams


def seed_map(teams: List[dict]) -> Dict[str, int]:
    return {t["id"]: int(t["seed"]) for t in teams}


def resolve_side(
    side: Side, winners: Dict[str, str], games_by_slot: Dict[str, Game]
) -> Optional[str]:
    kind, ref = side
    if kind == "team":
        return ref
    slot = ref
    if slot in winners:
        return winners[slot]
    g = games_by_slot.get(slot)
    if not g:
        return None
    a = resolve_side(g.side_a, winners, games_by_slot)
    b = resolve_side(g.side_b, winners, games_by_slot)
    if not a or not b:
        return None
    return None


def pick_bracket(games: List[Game], teams: List[dict], bias: str) -> Dict[str, Dict[str, str]]:
    """bias: 'chalk' | 'zig' | 'zag' — small deviations for demo."""
    sm = seed_map(teams)
    games_by_slot = {g.slot_id: g for g in games}
    order = []
    rnds = ["first_four", "r64", "r32", "s16", "e8", "f4", "ncg"]
    for rnd in rnds:
        order.extend([g for g in games if g.round == rnd])
    winners: Dict[str, str] = {}
    for idx, g in enumerate(order):
        a = resolve_side(g.side_a, winners, games_by_slot)
        b = resolve_side(g.side_b, winners, games_by_slot)
        if not a or not b:
            raise RuntimeError(f"Cannot resolve {g.slot_id}")
        flip = False
        if bias == "zig" and idx % 11 == 3:
            flip = True
        if bias == "zag" and idx % 7 == 2:
            flip = True
        wa, wb = sm.get(a, 99), sm.get(b, 99)
        pick = a if wa < wb else b
        if wa == wb:
            pick = a if a < b else b
        if flip:
            pick = b if pick == a else a
        winners[g.slot_id] = pick

    nested: Dict[str, Dict[str, str]] = {}
    for g in games:
        nested.setdefault(g.round, {})[g.slot_id] = winners[g.slot_id]
    return nested


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    data = root / "data"
    data.mkdir(parents=True, exist_ok=True)
    teams = build_teams()
    games = build_games()
    (data / "teams.json").write_text(json.dumps({"teams": teams}, indent=2) + "\n", encoding="utf-8")
    meta = {
        "tournamentLabel": "Demo NCAA-style bracket (sample data)",
        "participantIds": ["alice", "bob", "casey"],
        "fallbackParticipantId": "alice",
    }
    (data / "meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")

    participants = data / "participants"
    participants.mkdir(parents=True, exist_ok=True)

    for pid, bias, name in [
        ("alice", "chalk", "Alice"),
        ("bob", "zig", "Bob"),
        ("casey", "zag", "Casey"),
    ]:
        picks = pick_bracket(games, teams, bias)
        doc = {"id": pid, "displayName": name, "picks": picks}
        (participants / f"{pid}.json").write_text(json.dumps(doc, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
