// Ties are structurally rare here (every game is played to a decision, OT/
// shootout included) — drop the "-0" tie segment when there aren't any, so
// the common case reads as a plain W-L record instead of always showing W-L-T.
export function formatRecord(wins: number, losses: number, ties: number) {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`
}
