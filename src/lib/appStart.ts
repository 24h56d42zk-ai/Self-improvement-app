/**
 * Vanaf hier telt alles mee. Wat ervoor ligt is testdata of leegte en hoort
 * niet in een grafiek: die zou een start vanaf nul als een terugval tonen.
 */
export const APP_START = '2026-08-24'

/** Is deze dag op of na de startdatum? */
export function afterStart(dateKey: string): boolean {
  return dateKey >= APP_START
}

/** Houdt alleen de punten over vanaf de start. */
export function fromStart<T extends { key: string }>(rows: T[]): T[] {
  return rows.filter((r) => afterStart(r.key))
}
