/** Today in America/New_York as YYYY + zero-padded MM/DD for scoreboard URLs. */
export function getEasternYmdParts(d = new Date()): { y: string; m: string; day: string } {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m, day] = s.split("-");
  return { y, m, day };
}
