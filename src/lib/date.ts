/** Datumhelpers. Alles werkt op lokale tijd met sleutels in YYYY-MM-DD. */

export const DAY_MS = 86_400_000

export function toKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return toKey(new Date())
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

/** Hele dagen tussen twee sleutels (b - a). Immuun voor zomertijd. */
export function daysBetween(a: string, b: string): number {
  const da = fromKey(a)
  const db = fromKey(b)
  da.setHours(12, 0, 0, 0)
  db.setHours(12, 0, 0, 0)
  return Math.round((db.getTime() - da.getTime()) / DAY_MS)
}

/** 1 = maandag ... 7 = zondag */
export function isoWeekday(key: string): number {
  const wd = fromKey(key).getDay()
  return wd === 0 ? 7 : wd
}

export function startOfWeek(key: string): string {
  return addDays(key, -(isoWeekday(key) - 1))
}

export function weekKeys(key: string): string[] {
  const start = startOfWeek(key)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

const DAY_NAMES = ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag']
const DAY_SHORT = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO']
const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']

export function dayName(key: string): string {
  return DAY_NAMES[isoWeekday(key) - 1]
}

export function dayShort(key: string): string {
  return DAY_SHORT[isoWeekday(key) - 1]
}

export function formatLong(key: string): string {
  const d = fromKey(key)
  return `${dayName(key)} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function formatShort(key: string): string {
  const d = fromKey(key)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function monthName(index: number): string {
  return MONTHS[index]
}

/** Alle dagsleutels van een kalenderjaar. */
export function yearKeys(year: number): string[] {
  const out: string[] = []
  let cur = `${year}-01-01`
  while (fromKey(cur).getFullYear() === year) {
    out.push(cur)
    cur = addDays(cur, 1)
  }
  return out
}

/** Uren tot middernacht, om 's avonds te kunnen waarschuwen. */
export function hoursLeftToday(now = new Date()): number {
  const end = new Date(now)
  end.setHours(24, 0, 0, 0)
  return (end.getTime() - now.getTime()) / 3_600_000
}
