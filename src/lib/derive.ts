import type { Database, DayLog } from './types'
import { HARD75_LENGTH, HARD75_RULES, emptyDay } from './types'
import { addDays, daysBetween, todayKey, weekKeys } from './date'
import { SESSIONS_PER_WEEK, sessionsFor } from './schedule'

export function hard75Count(day: DayLog): number {
  return HARD75_RULES.filter((r) => day.hard75[r.key]).length
}

export function hard75Complete(day: DayLog): boolean {
  return hard75Count(day) === HARD75_RULES.length
}

export interface Hard75State {
  started: boolean
  /** 1-gebaseerde dag van de challenge; 0 als hij nog niet loopt */
  dayIndex: number
  /** Aantal volledig afgewerkte dagen sinds de start */
  completed: number
  /** Aaneengesloten volle dagen tot en met gisteren (vandaag telt pas mee als hij af is) */
  streak: number
  todayCount: number
  todayComplete: boolean
  /** Eerste dag in het verleden die niet compleet is: de challenge is dan gebroken */
  brokenOn: string | null
  daysLeft: number
  /** Alle dagsleutels van dag 1 tot dag 75 */
  grid: { key: string; index: number; complete: boolean; partial: number; future: boolean; isToday: boolean }[]
}

export function hard75State(db: Database, today = todayKey()): Hard75State {
  const start = db.settings.hard75Start
  const empty: Hard75State = {
    started: false, dayIndex: 0, completed: 0, streak: 0,
    todayCount: 0, todayComplete: false, brokenOn: null,
    daysLeft: HARD75_LENGTH, grid: [],
  }
  if (!start) return empty

  const offset = daysBetween(start, today)
  if (offset < 0) return { ...empty, started: true }

  const dayIndex = Math.min(offset + 1, HARD75_LENGTH)
  const grid = Array.from({ length: HARD75_LENGTH }, (_, i) => {
    const key = addDays(start, i)
    const log = db.days[key] ?? emptyDay(key)
    const partial = hard75Count(log)
    return {
      key,
      index: i + 1,
      complete: partial === HARD75_RULES.length,
      partial,
      future: daysBetween(today, key) > 0,
      isToday: key === today,
    }
  })

  const past = grid.filter((g) => !g.future && !g.isToday)
  const brokenOn = past.find((g) => !g.complete)?.key ?? null
  const completed = grid.filter((g) => g.complete).length

  let streak = 0
  for (let i = past.length - 1; i >= 0; i--) {
    if (past[i].complete) streak++
    else break
  }
  const todayCell = grid.find((g) => g.isToday)
  const todayCount = todayCell?.partial ?? 0
  const todayComplete = todayCell?.complete ?? false
  if (todayComplete) streak++

  return {
    started: true,
    dayIndex,
    completed,
    streak,
    todayCount,
    todayComplete,
    brokenOn,
    daysLeft: Math.max(0, HARD75_LENGTH - dayIndex + (todayComplete ? 0 : 1)),
    grid,
  }
}

export interface SessionProgress { done: number; planned: number }

export function sessionsOnDay(db: Database, dateKey: string): SessionProgress {
  const planned = sessionsFor(dateKey)
  const log = db.days[dateKey]
  const done = planned.filter((s) => log?.sessions[s.id]).length + (log?.extra ?? 0)
  return { done, planned: planned.length }
}

export function sessionsThisWeek(db: Database, dateKey = todayKey()): SessionProgress {
  return weekKeys(dateKey).reduce<SessionProgress>(
    (acc, key) => {
      const d = sessionsOnDay(db, key)
      return { done: acc.done + d.done, planned: acc.planned + d.planned }
    },
    { done: 0, planned: 0 },
  )
}

export interface TaskProgress { done: number; total: number }

export function tasksOnDay(db: Database, dateKey: string): TaskProgress {
  const list = db.tasks.filter((t) => t.date === dateKey)
  return { done: list.filter((t) => t.done).length, total: list.length }
}

/**
 * Dagscore uit vier bronnen. Wat er niet gepland stond telt als in orde,
 * anders zou een rustdag je score altijd omlaag trekken.
 */
export function dayScore(db: Database, dateKey: string): number {
  const log = db.days[dateKey] ?? emptyDay(dateKey)
  const hard = hard75Count(log) / HARD75_RULES.length
  const s = sessionsOnDay(db, dateKey)
  const training = s.planned === 0 ? 1 : Math.min(1, s.done / s.planned)
  const t = tasksOnDay(db, dateKey)
  const tasks = t.total === 0 ? 1 : t.done / t.total
  const food = log.ateHealthy === true ? 1 : log.ateHealthy === false ? 0 : 0.5
  return Math.round(hard * 45 + training * 30 + tasks * 15 + food * 10)
}

/** Heeft de dag überhaupt data? Voor het jaargrid: lege dagen blijven leeg. */
export function dayHasData(db: Database, dateKey: string): boolean {
  const log = db.days[dateKey]
  if (!log) return false
  return (
    hard75Count(log) > 0 ||
    Object.values(log.sessions).some(Boolean) ||
    log.extra > 0 ||
    log.ateHealthy !== null ||
    log.note.trim() !== ''
  )
}

export interface NetWorth { cash: number; inventory: number; total: number; date: string | null }

export function latestNetWorth(db: Database): NetWorth {
  const sorted = [...db.netWorth].sort((a, b) => a.date.localeCompare(b.date))
  const last = sorted[sorted.length - 1]
  if (!last) return { cash: 0, inventory: 0, total: 0, date: null }
  return { cash: last.cash, inventory: last.inventory, total: last.cash + last.inventory, date: last.date }
}

export function netWorthSeries(db: Database) {
  return [...db.netWorth]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ date: s.date, cash: s.cash, inventory: s.inventory, total: s.cash + s.inventory }))
}

export const WEEK_TARGET = SESSIONS_PER_WEEK
