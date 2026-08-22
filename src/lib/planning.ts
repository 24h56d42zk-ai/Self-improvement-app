import type { Domain } from './types'
import { fromKey, startOfWeek, toKey } from './date'

export type Horizon = 'jaar' | 'maand' | 'week'

export interface Goal {
  id: string
  title: string
  horizon: Horizon
  /** '2026' voor een jaar, '2026-09' voor een maand, '2026-W35' voor een week */
  period: string
  domain: Domain
  /** Meetbaar doel; leeg laten voor een doel dat je gewoon afvinkt */
  target: number | null
  unit: string
  progress: number
  done: boolean
  /** Aan welk groter doel dit bijdraagt */
  parentId: string | null
  note: string
  createdAt: string
}

export interface Lesson {
  id: string
  /** 1 = maandag … 7 = zondag */
  weekday: number
  start: string
  end: string
  subjectId: string | null
  room: string
}

/* ── Periodesleutels ────────────────────────────────────────────────────── */

export function yearPeriod(dateKey: string): string {
  return dateKey.slice(0, 4)
}

export function monthPeriod(dateKey: string): string {
  return dateKey.slice(0, 7)
}

/** ISO-weeknummer, zodat een week nooit over twee jaren dubbel telt. */
export function weekPeriod(dateKey: string): string {
  const d = fromKey(startOfWeek(dateKey))
  const thursday = new Date(d)
  thursday.setDate(d.getDate() + 3)
  const year = thursday.getFullYear()
  const firstThursday = new Date(year, 0, 4)
  firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7))
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86_400_000))
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function periodFor(horizon: Horizon, dateKey: string): string {
  if (horizon === 'jaar') return yearPeriod(dateKey)
  if (horizon === 'maand') return monthPeriod(dateKey)
  return weekPeriod(dateKey)
}

const MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']

export function periodLabel(horizon: Horizon, period: string): string {
  if (horizon === 'jaar') return period
  if (horizon === 'maand') {
    const [y, m] = period.split('-')
    return `${MONTHS[Number(m) - 1]} ${y}`
  }
  const [y, w] = period.split('-W')
  return `week ${Number(w)} van ${y}`
}

/** Verschuift een periode n stappen vooruit of achteruit. */
export function shiftPeriod(horizon: Horizon, period: string, delta: number): string {
  if (horizon === 'jaar') return String(Number(period) + delta)
  if (horizon === 'maand') {
    const [y, m] = period.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const [y, w] = period.split('-W').map(Number)
  // Via een echte datum rekenen, zodat jaargrenzen vanzelf goed gaan.
  const jan4 = new Date(y, 0, 4)
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1 + delta) * 7)
  return weekPeriod(toKey(monday))
}

export const HORIZONS: { id: Horizon; label: string }[] = [
  { id: 'jaar',  label: 'Jaar' },
  { id: 'maand', label: 'Maand' },
  { id: 'week',  label: 'Week' },
]

export function goalPercent(goal: Goal): number {
  if (goal.done) return 100
  if (goal.target === null || goal.target <= 0) return 0
  return Math.min(100, Math.round((goal.progress / goal.target) * 100))
}
