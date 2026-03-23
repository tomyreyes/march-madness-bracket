/**
 * Emit teams.json + participants/tomy.json from Tomy bracket (see data/pdfs/tomy.extracted.txt).
 * Run: node scripts/build-tomy-data.mjs
 */
import * as fs from "node:fs";
import * as path from "node:path";

const root = path.join(import.meta.dirname, "..");

/**
 * NCAA regions (official assignment). Sites: East — Washington, D.C.; South — Houston;
 * West — San Jose; Midwest — Chicago. PDF column order ≠ header text; parser maps
 * columns → these keys (see parse-bracket-text.mjs).
 */
const byRegion = {
  east: [
    [1, "duke", "Duke"],
    [16, "east-s16-ph", "16 seed"],
    [8, "ohio-st", "Ohio St."],
    [9, "tcu", "TCU"],
    [5, "st-johns", "St. John's"],
    [12, "n-iowa", "N. Iowa"],
    [4, "kansas", "Kansas"],
    [13, "cal-baptist", "Cal Baptist"],
    [6, "louisville", "Louisville"],
    [11, "sfla", "South Florida"],
    [3, "michst", "Michigan State"],
    [14, "ndakst", "North Dakota State"],
    [7, "ucla", "UCLA"],
    [10, "ucf", "UCF"],
    [2, "uconn", "UConn"],
    [15, "furman", "Furman"],
  ],
  south: [
    [1, "florida", "Florida"],
    [16, "south-s16-ph", "16 seed"],
    [8, "clemson", "Clemson"],
    [9, "iowa", "Iowa"],
    [5, "vanderbilt", "Vanderbilt"],
    [12, "mcneese", "McNeese"],
    [4, "nebraska", "Nebraska"],
    [13, "troy", "Troy"],
    [6, "n-carolina", "North Carolina"],
    [11, "vcu", "VCU"],
    [3, "illinois", "Illinois"],
    [14, "penn", "Penn"],
    [7, "saint-marys", "Saint Mary's"],
    [10, "texas-am", "Texas A&M"],
    [2, "houston", "Houston"],
    [15, "idaho", "Idaho"],
  ],
  west: [
    [1, "arizona", "Arizona"],
    [16, "west-s16-ph", "16 seed"],
    [8, "villanova", "Villanova"],
    [9, "utah-st", "Utah St."],
    [5, "wisconsin", "Wisconsin"],
    [12, "high-point", "High Point"],
    [4, "arkansas", "Arkansas"],
    [13, "hawaii", "Hawaii"],
    [6, "byu", "BYU"],
    [11, "texas", "Texas"],
    [3, "gonzaga", "Gonzaga"],
    [14, "kensaw", "Kennesaw State"],
    [7, "miami", "Miami (FL)"],
    [10, "missouri", "Missouri"],
    [2, "purdue", "Purdue"],
    [15, "queens", "Queens (NC)"],
  ],
  midwest: [
    [1, "michigan", "Michigan"],
    [16, "mw-s16-ph", "16 seed"],
    [8, "georgia", "Georgia"],
    [9, "saint-louis", "Saint Louis"],
    [5, "texas-tech", "Texas Tech"],
    [12, "akron", "Akron"],
    [4, "alabama", "Alabama"],
    [13, "hofstra", "Hofstra"],
    [6, "tennessee", "Tennessee"],
    [11, "miaoh", "Miami (OH)"],
    [3, "virginia", "Virginia"],
    [14, "wright-st", "Wright St."],
    [7, "kentucky", "Kentucky"],
    [10, "santa-clara", "Santa Clara"],
    [2, "iowa-st", "Iowa St."],
    [15, "tenn-state", "Tennessee State"],
  ],
};

const ffTeams = [
  { id: "ff_1a", name: "Fairfield", seed: 16, region: "first_four" },
  { id: "ff_1b", name: "Siena", seed: 16, region: "first_four" },
  { id: "ff_2a", name: "Play-in E1", seed: 16, region: "first_four" },
  { id: "ff_2b", name: "Prairie View A&M / Lehigh", seed: 16, region: "first_four" },
  { id: "ff_3a", name: "Play-in S1", seed: 16, region: "first_four" },
  { id: "ff_3b", name: "LIU", seed: 16, region: "first_four" },
  { id: "ff_4a", name: "Play-in MW1", seed: 16, region: "first_four" },
  { id: "ff_4b", name: "Howard / UMBC", seed: 16, region: "first_four" },
];

const teams = [];
for (const [reg, rows] of Object.entries(byRegion)) {
  for (const [seed, id, name] of rows) {
    teams.push({ id, name, seed, region: reg });
  }
}
teams.push(...ffTeams);

const picks = {
  first_four: {
    ff_1: "ff_1b",
    ff_2: "ff_2b",
    ff_3: "ff_3b",
    ff_4: "ff_4b",
  },
  r64: {
    east_r64_1: "duke",
    east_r64_2: "tcu",
    east_r64_3: "st-johns",
    east_r64_4: "kansas",
    east_r64_5: "louisville",
    east_r64_6: "michst",
    east_r64_7: "ucla",
    east_r64_8: "uconn",
    south_r64_1: "florida",
    south_r64_2: "iowa",
    south_r64_3: "vanderbilt",
    south_r64_4: "nebraska",
    south_r64_5: "vcu",
    south_r64_6: "illinois",
    south_r64_7: "texas-am",
    south_r64_8: "houston",
    west_r64_1: "arizona",
    west_r64_2: "utah-st",
    west_r64_3: "wisconsin",
    west_r64_4: "arkansas",
    west_r64_5: "texas",
    west_r64_6: "gonzaga",
    west_r64_7: "miami",
    west_r64_8: "purdue",
    midwest_r64_1: "michigan",
    midwest_r64_2: "georgia",
    midwest_r64_3: "texas-tech",
    midwest_r64_4: "alabama",
    midwest_r64_5: "tennessee",
    midwest_r64_6: "virginia",
    midwest_r64_7: "kentucky",
    midwest_r64_8: "iowa-st",
  },
  r32: {
    east_r32_1: "duke",
    east_r32_2: "kansas",
    east_r32_3: "michst",
    east_r32_4: "uconn",
    south_r32_1: "florida",
    south_r32_2: "vanderbilt",
    south_r32_3: "illinois",
    south_r32_4: "houston",
    west_r32_1: "arizona",
    west_r32_2: "wisconsin",
    west_r32_3: "gonzaga",
    west_r32_4: "purdue",
    midwest_r32_1: "michigan",
    midwest_r32_2: "alabama",
    midwest_r32_3: "tennessee",
    midwest_r32_4: "iowa-st",
  },
  s16: {
    east_s16_1: "duke",
    east_s16_2: "michst",
    south_s16_1: "florida",
    south_s16_2: "houston",
    west_s16_1: "arizona",
    west_s16_2: "gonzaga",
    midwest_s16_1: "michigan",
    midwest_s16_2: "iowa-st",
  },
  e8: {
    east_e8_1: "duke",
    south_e8_1: "houston",
    west_e8_1: "gonzaga",
    midwest_e8_1: "iowa-st",
  },
  f4: {
    f4_1: "duke",
    f4_2: "iowa-st",
  },
  ncg: {
    ncg: "duke",
  },
};

fs.writeFileSync(
  path.join(root, "data", "teams.json"),
  JSON.stringify({ teams }, null, 2) + "\n",
);

fs.mkdirSync(path.join(root, "data", "participants"), { recursive: true });
fs.writeFileSync(
  path.join(root, "data", "participants", "tomy.json"),
  JSON.stringify(
    { id: "tomy", displayName: "Tomy Reyes", picks },
    null,
    2,
  ) + "\n",
);

fs.writeFileSync(
  path.join(root, "data", "meta.json"),
  JSON.stringify(
    {
      tournamentLabel: "NCAA Bracket 2026",
      participantIds: ["tomy"],
      fallbackParticipantId: "tomy",
    },
    null,
    2,
  ) + "\n",
);

console.log("Wrote data/teams.json, data/participants/tomy.json, data/meta.json");
