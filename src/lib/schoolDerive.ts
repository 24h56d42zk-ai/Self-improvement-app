import type { Database } from './types'
import type { Card, CardGrade, Exam, Grade, Project, StudySession } from './school'
import { gradePercent } from './school'
import { addDays, daysBetween, formatShort, startOfWeek, todayKey, weekKeys } from './date'

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
export function schedule(card: Card, grade: CardGrade, today = todayKey()): Card {
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

/* ── Punten ─────────────────────────────────────────────────────────────── */

export interface SubjectAverage {
  subjectId: string | null
  name: string
  color: string
  average: number | null
  count: number
  /** Verschil met het gemiddelde van de vorige drie punten */
  trend: number | null
  lowest: number | null
  highest: number | null
}

/** Gewogen gemiddelde: een examen telt zwaarder dan een taak. */
export function weightedAverage(grades: Grade[]): number | null {
  const weight = grades.reduce((n, g) => n + g.weight, 0)
  if (weight === 0) return null
  return grades.reduce((n, g) => n + gradePercent(g) * g.weight, 0) / weight
}

export function subjectAverages(db: Database): SubjectAverage[] {
  return db.subjects.map((s) => {
    const list = db.grades
      .filter((g) => g.subjectId === s.id)
      .sort((a, b) => a.date.localeCompare(b.date))
    const percents = list.map(gradePercent)
    const recent = list.slice(-3)
    const earlier = list.slice(0, -3)
    const trend = recent.length > 0 && earlier.length > 0
      ? (weightedAverage(recent) ?? 0) - (weightedAverage(earlier) ?? 0)
      : null
    return {
      subjectId: s.id,
      name: s.name,
      color: s.color,
      average: weightedAverage(list),
      count: list.length,
      trend,
      lowest: percents.length ? Math.min(...percents) : null,
      highest: percents.length ? Math.max(...percents) : null,
    }
  })
}

export function overallAverage(db: Database): number | null {
  return weightedAverage(db.grades)
}

/** Vakken die aandacht vragen: laag gemiddelde of duidelijk dalend. */
export function riskSubjects(db: Database, threshold = 65): SubjectAverage[] {
  return subjectAverages(db)
    .filter((s) => s.count > 0 && ((s.average ?? 100) < threshold || (s.trend ?? 0) < -8))
    .sort((a, b) => (a.average ?? 100) - (b.average ?? 100))
}

/** Verloop van je gemiddelde: elk punt is het gemiddelde tot dan toe. */
export function gradeProgress(db: Database, subjectId?: string | null) {
  const list = db.grades
    .filter((g) => subjectId === undefined || g.subjectId === subjectId)
    .sort((a, b) => a.date.localeCompare(b.date))

  const out: { label: string; punt: number; gemiddelde: number }[] = []
  const seen: Grade[] = []
  for (const g of list) {
    seen.push(g)
    out.push({
      label: formatShort(g.date),
      punt: Math.round(gradePercent(g)),
      gemiddelde: Math.round(weightedAverage(seen) ?? 0),
    })
  }
  return out
}

/* ── Toetsen ────────────────────────────────────────────────────────────── */

export interface ExamView {
  exam: Exam
  daysLeft: number
  subject: string
  color: string
  /** Hoeveel kaarten van dit vak nog een herhaling nodig hebben */
  cardsDue: number
}

export function upcomingExams(db: Database, today = todayKey()): ExamView[] {
  return db.exams
    .filter((e) => daysBetween(today, e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((exam) => {
      const deckIds = db.decks.filter((d) => d.subjectId === exam.subjectId).map((d) => d.id)
      return {
        exam,
        daysLeft: daysBetween(today, exam.date),
        subject: subjectName(db, exam.subjectId),
        color: subjectColor(db, exam.subjectId),
        cardsDue: db.cards.filter((c) => deckIds.includes(c.deckId) && daysBetween(c.due, today) >= 0).length,
      }
    })
}

/* ── Studietijd ─────────────────────────────────────────────────────────── */

export function studyMinutes(sessions: StudySession[]): number {
  return sessions.reduce((n, s) => n + s.minutes, 0)
}

export function studyByWeek(db: Database, weeks = 12, today = todayKey()) {
  const thisWeek = startOfWeek(today)
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisWeek, (i - weeks + 1) * 7)
    const keys = weekKeys(start)
    const list = db.study.filter((s) => keys.includes(s.date))
    return {
      label: formatShort(start),
      leren: Math.round(studyMinutes(list.filter((s) => s.kind === 'leren')) / 6) / 10,
      huiswerk: Math.round(studyMinutes(list.filter((s) => s.kind === 'huiswerk')) / 6) / 10,
      herhalen: Math.round(studyMinutes(list.filter((s) => s.kind === 'herhalen')) / 6) / 10,
    }
  })
}

export function studyBySubject(db: Database, since?: string) {
  return db.subjects
    .map((s) => ({
      label: s.name,
      value: Math.round(studyMinutes(db.study.filter((x) => x.subjectId === s.id && (!since || x.date >= since))) / 6) / 10,
      color: s.color,
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value)
}

/* ── Overhoren: hoe goed het gaat ───────────────────────────────────────── */

export function recordReview(db: Database, deckId: string, grade: string, today = todayKey()): void {
  const entry = db.reviewLog.find((r) => r.date === today && r.deckId === deckId)
  const target = entry ?? { date: today, deckId, again: 0, hard: 0, good: 0, easy: 0 }
  if (grade === 'again') target.again++
  else if (grade === 'hard') target.hard++
  else if (grade === 'good') target.good++
  else target.easy++
  if (!entry) db.reviewLog.push(target)
}

/** Percentage kaarten dat je wist, per dag. */
export function reviewAccuracy(db: Database, days = 21, today = todayKey()) {
  return Array.from({ length: days }, (_, i) => {
    const key = addDays(today, i - days + 1)
    const list = db.reviewLog.filter((r) => r.date === key)
    const total = list.reduce((n, r) => n + r.again + r.hard + r.good + r.easy, 0)
    const known = list.reduce((n, r) => n + r.hard + r.good + r.easy, 0)
    return {
      label: formatShort(key),
      juist: total === 0 ? 0 : Math.round((known / total) * 100),
      kaarten: total,
    }
  })
}

export function reviewTotals(db: Database) {
  const t = db.reviewLog.reduce(
    (acc, r) => ({
      again: acc.again + r.again, hard: acc.hard + r.hard,
      good: acc.good + r.good, easy: acc.easy + r.easy,
    }),
    { again: 0, hard: 0, good: 0, easy: 0 },
  )
  const total = t.again + t.hard + t.good + t.easy
  return { ...t, total, accuracy: total === 0 ? null : ((total - t.again) / total) * 100 }
}
