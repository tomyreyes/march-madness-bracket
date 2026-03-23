/**
 * Map NCAA championship `bracketPositionId` (from henrygd brackets JSON) to our
 * `round` + `slotId` (see lib/bracket-tree.ts).
 *
 * First Four (101–104) is not auto-filled — names vary by year; add manually to
 * tournament-results.json if needed.
 */
export function bracketPositionToOurSlot(bracketPositionId) {
  const bp = Number(bracketPositionId);
  if (!Number.isFinite(bp)) return null;

  if (bp >= 201 && bp <= 208) {
    return { round: "r64", slotId: `east_r64_${bp - 200}` };
  }
  if (bp >= 209 && bp <= 216) {
    return { round: "r64", slotId: `south_r64_${bp - 208}` };
  }
  if (bp >= 217 && bp <= 224) {
    return { round: "r64", slotId: `west_r64_${bp - 216}` };
  }
  if (bp >= 225 && bp <= 232) {
    return { round: "r64", slotId: `midwest_r64_${bp - 224}` };
  }

  if (bp >= 301 && bp <= 304) {
    return { round: "r32", slotId: `east_r32_${bp - 300}` };
  }
  if (bp >= 305 && bp <= 308) {
    return { round: "r32", slotId: `south_r32_${bp - 304}` };
  }
  if (bp >= 309 && bp <= 312) {
    return { round: "r32", slotId: `west_r32_${bp - 308}` };
  }
  if (bp >= 313 && bp <= 316) {
    return { round: "r32", slotId: `midwest_r32_${bp - 312}` };
  }

  if (bp === 401) return { round: "s16", slotId: "east_s16_1" };
  if (bp === 402) return { round: "s16", slotId: "east_s16_2" };
  if (bp === 403) return { round: "s16", slotId: "south_s16_1" };
  if (bp === 404) return { round: "s16", slotId: "south_s16_2" };
  if (bp === 405) return { round: "s16", slotId: "west_s16_1" };
  if (bp === 406) return { round: "s16", slotId: "west_s16_2" };
  if (bp === 407) return { round: "s16", slotId: "midwest_s16_1" };
  if (bp === 408) return { round: "s16", slotId: "midwest_s16_2" };

  if (bp === 501) return { round: "e8", slotId: "east_e8_1" };
  if (bp === 502) return { round: "e8", slotId: "south_e8_1" };
  if (bp === 503) return { round: "e8", slotId: "west_e8_1" };
  if (bp === 504) return { round: "e8", slotId: "midwest_e8_1" };

  if (bp === 601) return { round: "f4", slotId: "f4_1" };
  if (bp === 602) return { round: "f4", slotId: "f4_2" };
  if (bp === 701) return { round: "ncg", slotId: "ncg" };

  return null;
}
