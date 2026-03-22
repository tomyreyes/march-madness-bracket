# Implementation plan — March Madness Bracket

## Location

- Project root: `march_madness_bracket/` (Next.js App Router).

## Requirements

- **Node.js**: `>= 18.17.0` (Next.js 14). Older Node versions will fail install/build. On Intel Macs, use `nvm`, `fnm`, or a Homebrew Node 20 LTS.
- **Telemetry**: optional `NEXT_TELEMETRY_DISABLED=1` for local builds (see `.env.example`).

## Folder structure

```text
app/
  layout.tsx, page.tsx, globals.css
components/
  BracketApp.tsx          # URL + pin + diff toggle shell (client)
  ParticipantPicker.tsx   # search + select + pin / unpin (client)
  bracket/
    Bracket.tsx           # layout sections: First Four, regionals, F4/NC
    MatchupCard.tsx       # matchup + diff bar + expandable names (client)
data/
  teams.json              # canonical teams (ids, names, seeds, region)
  meta.json               # tournament label, participant id list, fallback id
  participants/*.json     # one file per person: nested picks by round
lib/
  bracket-types.ts        # Zod schemas + TS types
  bracket-tree.ts         # builds 67-game tree (First Four + 63 main)
  resolver.ts             # resolves visible teams from picks
  diff.ts                 # same vs different tallies vs pinned viewer
  load-data.ts            # parse JSON, validate, build games
  constants.ts            # localStorage key for pin
scripts/
  generate-demo-data.py   # regenerates teams + sample participants
  ingest-csv.ts           # CSV → participant JSON (outline)
```

## Data schema

### `data/teams.json`

```json
{
  "teams": [
    { "id": "west-1", "name": "West #1", "seed": 1, "region": "west" },
    { "id": "ff_1a", "name": "Ff 1a", "seed": 16, "region": "first_four" }
  ]
}
```

- **Regions**: `west | east | south | midwest` plus eight `first_four` teams (`ff_1a` … `ff_4b`).
- Team ids are referenced by participant picks.

### `data/meta.json`

- `tournamentLabel`: string shown in header.
- `participantIds`: array of ids; each must have `data/participants/<id>.json`.
- `fallbackParticipantId`: used when URL has no `participant` and nothing valid is pinned.

### `data/participants/<id>.json`

```json
{
  "id": "alice",
  "displayName": "Alice",
  "picks": {
    "first_four": { "ff_1": "ff_1a" },
    "r64": { "west_r64_1": "west-1" },
    "r32": {},
    "s16": {},
    "e8": {},
    "f4": {},
    "ncg": {}
  }
}
```

**Rounds** (keys in `picks`):

- `first_four`, `r64`, `r32`, `s16`, `e8`, `f4`, `ncg`

**Slot ids** (examples):

- First Four: `ff_1` … `ff_4`
- Regional: `{region}_{round}_{index}` — e.g. `west_r64_3`, `east_s16_2`, `midwest_e8_1`
- Finals: `f4_1`, `f4_2`, `ncg`

**First Four wiring (demo)**: each region’s `1 vs 16` Round-of-64 game takes the **16-line** from the winner of one First Four game (`ff_1`→West, `ff_2`→East, `ff_3`→South, `ff_4`→Midwest).

## URL state & pin behavior

- Query params: `?participant=<id>&diff=0|1`
- **Precedence** for which bracket is shown when `participant` is missing or invalid:
  1. Valid `participant` query param
  2. Else `localStorage` key `march_madness_pinned_participant_id`
  3. Else `meta.fallbackParticipantId`
- **Diff baseline**: comparisons use the **pinned** participant’s winner per slot. If Diff is on and nothing is pinned, the UI prompts you to pin.

## Ingestion

1. **Regenerate demo data** (Python 3.7+ on this machine):

   ```bash
   python3 scripts/generate-demo-data.py
   ```

2. **PDFs**: Drop exports under **`data/pdfs/`** (same source export → consistent layout). **Filename = person’s name** (e.g. `Jamie Lee.pdf`). Use the basename (no `.pdf`) for **`displayName`** in JSON and a URL-safe **`id`** slug (`jamie-lee`) for `data/participants/<id>.json` and `meta.participantIds`.

   Extract text for mapping (order may not match visual bracket — verify by slot):

   ```bash
   npm run pdf:text -- data/pdfs/"Jamie Lee.pdf" data/pdfs/jamie-lee.extracted.txt
   ```

   Or use **Preview** copy/paste / **`pdftotext`** (Poppler). Then fill **`participant_id,round,slot_id,team_id`** in a sheet or edit JSON directly.

3. **CSV → JSON** (Node 18+):

   ```bash
   npm run ingest -- ./path/to/picks.csv
   ```

   Columns: `participant_id,round,slot_id,team_id`

4. **Adding a participant**:

   - Add `data/participants/<id>.json` (validated by Zod at load).
   - Append **`id`** to `meta.participantIds` in `data/meta.json`.
   - No code change: `lib/load-data.ts` reads participant files from disk by id.

## Vercel

- Connect the Git repo; framework preset **Next.js**.
- No server secrets required (static JSON at build time).

## Diff rules

- For slot `S` in round `R`, let `W` be the pinned viewer’s picked winner.
- **Same**: other participants with a pick for `(R,S)` equal to `W` (pinned excluded from lists).
- **Different**: other participants with a defined pick not equal to `W`.
- Missing picks are ignored in tallies.
