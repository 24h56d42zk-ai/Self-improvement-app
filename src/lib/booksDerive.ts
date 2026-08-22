import type { Database } from './types'
import type { Book } from './books'
import { progressPercent } from './books'
import { daysBetween, todayKey } from './date'

export interface BookStats {
  finishedThisYear: number
  goal: number
  reading: number
  wantToRead: number
  pagesThisYear: number
  quotes: number
  /** Boeken per jaar op je huidige tempo */
  pace: number | null
}

export function bookStats(db: Database, today = todayKey()): BookStats {
  const year = today.slice(0, 4)
  const finished = db.books.filter((b) => b.status === 'gelezen' && (b.finished ?? '').startsWith(year))
  const dayOfYear = daysBetween(`${year}-01-01`, today) + 1
  const pagesThisYear = db.reading
    .filter((r) => r.date.startsWith(year))
    .reduce((n, r) => n + r.pages, 0)

  return {
    finishedThisYear: finished.length,
    goal: db.bookGoal,
    reading: db.books.filter((b) => b.status === 'bezig').length,
    wantToRead: db.books.filter((b) => b.status === 'wil-lezen').length,
    pagesThisYear,
    quotes: db.books.reduce((n, b) => n + b.quotes.length, 0),
    pace: dayOfYear > 14 && finished.length > 0
      ? Math.round((finished.length / dayOfYear) * 365 * 10) / 10
      : null,
  }
}

export function readingToday(db: Database, today = todayKey()): number {
  return db.reading.filter((r) => r.date === today).reduce((n, r) => n + r.minutes, 0)
}

/** Boeken waar je in leest, met de verste voortgang eerst. */
export function activeBooks(db: Database): Book[] {
  return db.books
    .filter((b) => b.status === 'bezig')
    .sort((a, b) => progressPercent(b) - progressPercent(a))
}
