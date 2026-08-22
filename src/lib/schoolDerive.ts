import type { Database } from './types'
import type { Card, Grade, Project } from './school'
import { addDays, daysBetween, todayKey } from './date'

/* ── Spaced repetition ──────────────────────────────────────────────────── */

const MIN_EASE = 1.3
const MAX_INTERVAL = 365

export function newCard(deckId: string, front: string, back: string, today = todayKey()): Card {
  return {
    id: crypto.randomUUID(),
    deckId,
    front,
    back,
    ease: 2.5,
    interval: 0,
    due: today,
    reps: 0,
    lapses: 0,
    lastReview: null,
  }
}

/**
 * Vereenvoudigde SM-2. Wat je goed kent komt steeds later terug, wat je mist
 * meteen weer — zo besteed je je tijd aan wat je nog niet kunt.
 */
export function schedule(card: Card, grade: Grade, today = todayKey()): Card {
  let { ease, interval, reps, lapses } = card

  if (grade === 'again') {
    ease = Math.max(MIN_EASE, ease - 0.2)
    interval = 0
    lapses += 1
  } else if (grade === 'hard') {
    ease = Math.max(MIN_EASE, ease - 0.15)
    interval = interval === 0 ? 1 : Math.max(1, Math.round(interval * 1.2))
  } else if (grade === 'good') {
    interval = reps === 0 ? 1 : reps === 1 ? 6 : Math.round(interval * ease)
  } else {
    ease = ease + 0.15
    interval = reps === 0 ? 3 : Math.round(interval * ease * 1.3)
  }

  interval = Math.min(MAX_INTERVAL, interval)
  reps = grade === 'again' ? 0 : reps + 1

  return {
    ...card,
    ease,
    interval,
    reps,
    lapses,
    // Interval 0 betekent: nog vandaag opnieuw.
    due: interval === 0 ? today : addDays(today, interval),
    lastReview: today,
  }
}

export interface DeckStats {
  total: number
  due: number
  fresh: number
  learning: number
  mature: number
}

export function deckStats(cards: Card[], today = todayKey()): DeckStats {
  return {
    total: cards.length,
    due: cards.filter((c) => daysBetween(c.due, today) >= 0).length,
    fresh: cards.filter((c) => c.reps === 0).length,
    learning: cards.filter((c) => c.reps > 0 && c.interval < 21).length,
    mature: cards.filter((c) => c.interval >= 21).length,
  }
}

export function dueCards(db: Database, deckId?: string, today = todayKey()): Card[] {
  return db.cards
    .filter((c) => (!deckId || c.deckId === deckId) && daysBetween(c.due, today) >= 0)
    // Kaarten die je vaak mist eerst; daarna de oudste.
    .sort((a, b) => b.lapses - a.lapses || a.due.localeCompare(b.due))
}

/** Hoeveel kaarten er de komende dagen aankomen — handig vlak voor een toets. */
export function upcomingReviews(db: Database, days = 14, today = todayKey()) {
  return Array.from({ length: days }, (_, i) => {
    const key = addDays(today, i)
    const count = db.cards.filter((c) => (i === 0 ? daysBetween(c.due, today) >= 0 : c.due === key)).length
    return { key, count }
  })
}

/* ── Projecten ──────────────────────────────────────────────────────────── */

export interface ProjectStatus {
  done: number
  total: number
  percent: number
  daysLeft: number | null
  nextPhase: { name: string; due: string | null } | null
  minutesLogged: number
  /** Loop je achter op het tempo dat je deadline vraagt? */
  behind: boolean
}

export function projectStatus(project: Project, today = todayKey()): ProjectStatus {
  const total = project.phases.length
  const done = project.phases.filter((p) => p.done).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const daysLeft = project.deadline ? daysBetween(today, project.deadline) : null
  const next = project.phases.find((p) => !p.done) ?? null
  const minutesLogged = project.log.reduce((n, l) => n + l.minutes, 0)

  // Een fase met een verstreken deadline, of minder ver dan de tijd verstreken is.
  const overdue = project.phases.some((p) => !p.done && p.due && daysBetween(p.due, today) > 0)
  let behind = overdue
  if (!behind && project.deadline && total > 0) {
    const start = project.createdAt.slice(0, 10)
    const span = daysBetween(start, project.deadline)
    const gone = daysBetween(start, today)
    if (span > 0 && gone > 0) behind = percent < Math.round((gone / span) * 100) - 15
  }

  return {
    done, total, percent, daysLeft,
    nextPhase: next ? { name: next.name, due: next.due } : null,
    minutesLogged,
    behind,
  }
}

export function subjectName(db: Database, id: string | null): string {
  if (!id) return 'Algemeen'
  return db.subjects.find((s) => s.id === id)?.name ?? 'Algemeen'
}

export function subjectColor(db: Database, id: string | null): string {
  if (!id) return '#6b8299'
  return db.subjects.find((s) => s.id === id)?.color ?? '#6b8299'
}
