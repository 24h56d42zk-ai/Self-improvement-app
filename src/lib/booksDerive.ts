import type { Database } from './types'
import type { Book } from './books'
import { progressPercent } from './books'
import { addDays, daysBetween, formatShort, startOfWeek, todayKey, weekKeys } from './date'
import { coverColor } from './books'

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

/* ── Leestempo en vooruitzicht ──────────────────────────────────────────── */

/** Pagina's per week over de laatste weken. */
export function pagesByWeek(db: Database, weeks = 12, today = todayKey()) {
  const thisWeek = startOfWeek(today)
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisWeek, (i - weeks + 1) * 7)
    const keys = weekKeys(start)
    const list = db.reading.filter((r) => keys.includes(r.date))
    return {
      label: formatShort(start),
      pagina: list.reduce((n, r) => n + r.pages, 0),
      minuten: list.reduce((n, r) => n + r.minutes, 0),
    }
  })
}

/** Gemiddeld aantal pagina's per leesdag over een venster. */
export function readingPace(db: Database, days = 30, today = todayKey()): number | null {
  const since = addDays(today, -days)
  const list = db.reading.filter((r) => r.date > since)
  if (list.length === 0) return null
  const activeDays = new Set(list.map((r) => r.date)).size
  return Math.round(list.reduce((n, r) => n + r.pages, 0) / Math.max(1, activeDays))
}

/** Hoeveel dagen op rij je gelezen hebt, tot en met vandaag of gisteren. */
export function readingStreak(db: Database, today = todayKey()): number {
  const dates = new Set(db.reading.map((r) => r.date))
  let streak = 0
  let cursor = dates.has(today) ? today : addDays(today, -1)
  while (dates.has(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
  }
  return streak
}

/** Wanneer je een boek uit hebt als je in dit tempo doorgaat. */
export function estimatedFinish(book: Book, pace: number | null, today = todayKey()): string | null {
  if (!book.pages || pace === null || pace <= 0) return null
  const left = book.pages - book.currentPage
  if (left <= 0) return null
  return addDays(today, Math.ceil(left / pace))
}

/** Boeken uitgelezen per maand van dit jaar. */
export function finishedByMonth(db: Database, today = todayKey()) {
  const year = today.slice(0, 4)
  const short = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']
  return short.map((label, i) => ({
    label,
    boeken: db.books.filter(
      (b) => b.status === 'gelezen' && (b.finished ?? '').startsWith(`${year}-${String(i + 1).padStart(2, '0')}`),
    ).length,
  }))
}

/** Verdeling over categorieën, op aantal gelezen boeken. */
export function booksByCategory(db: Database) {
  const map = new Map<string, number>()
  for (const b of db.books) {
    const key = b.category.trim() || 'zonder categorie'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value, color: coverColor(label) }))
    .sort((a, b) => b.value - a.value)
}

/** Hoe je je boeken beoordeelt. */
export function ratingSpread(db: Database) {
  return [1, 2, 3, 4, 5].map((n) => ({
    label: '★'.repeat(n),
    value: db.books.filter((b) => b.rating === n).length,
  }))
}
