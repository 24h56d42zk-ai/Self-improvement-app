import type { Database } from './types'
import { HARD75_RULES, emptyDay } from './types'
import { addDays, daysBetween, todayKey, weekKeys } from './date'
import { dayHasData, dayScore, hard75Count, sessionsOnDay } from './derive'
import { personalRecords } from './trainingDerive'
import { readingStreak } from './booksDerive'
import { tradeProfit } from './businessDerive'
import { SERIES } from './palette'

/* ── Ervaring en niveau ─────────────────────────────────────────────────── */

const XP = {
  task: 10,
  session: 25,
  hardDay: 50,
  grade: 5,
  review: 1,
  studyHour: 15,
  bookFinished: 200,
  fair: 100,
  record: 50,
  reflection: 15,
}

export interface XpBreakdown { label: string; xp: number; color: string }

export function xpBreakdown(db: Database): XpBreakdown[] {
  const sessions = Object.values(db.days).reduce(
    (n, d) => n + Object.values(d.sessions).filter(Boolean).length + d.extra, 0,
  )
  const hardDays = Object.values(db.days).filter((d) => hard75Count(d) === HARD75_RULES.length).length
  const reviews = db.reviewLog.reduce((n, r) => n + r.again + r.hard + r.good + r.easy, 0)
  const studyHours = Math.floor(db.study.reduce((n, s) => n + s.minutes, 0) / 60)
  const reflections = Object.values(db.days).filter((d) => d.reflection !== null).length

  return [
    { label: 'Taken afgewerkt', xp: db.tasks.filter((t) => t.done).length * XP.task, color: '#22d3ee' },
    { label: 'Sessies gedaan', xp: sessions * XP.session, color: SERIES.orange },
    { label: 'Volle 75 Hard-dagen', xp: hardDays * XP.hardDay, color: SERIES.violet },
    { label: 'Punten ingevoerd', xp: db.grades.length * XP.grade, color: SERIES.blue },
    { label: 'Kaarten herhaald', xp: reviews * XP.review, color: SERIES.blue },
    { label: 'Uren gestudeerd', xp: studyHours * XP.studyHour, color: SERIES.blue },
    { label: 'Boeken uitgelezen', xp: db.books.filter((b) => b.status === 'gelezen').length * XP.bookFinished, color: SERIES.magenta },
    { label: 'Beurzen gedaan', xp: db.fairs.length * XP.fair, color: SERIES.aqua },
    { label: 'Records gezet', xp: personalRecords(db).length * XP.record, color: SERIES.orange },
    { label: 'Avondreflecties', xp: reflections * XP.reflection, color: '#22d3ee' },
  ].filter((x) => x.xp > 0)
}

export interface Level {
  level: number
  xp: number
  intoLevel: number
  needed: number
  percent: number
}

/** Elk niveau kost iets meer dan het vorige, zodat het lang boeiend blijft. */
function xpForLevel(level: number): number {
  return Math.round(250 * level ** 1.45)
}

export function levelFor(xp: number): Level {
  let level = 1
  let spent = 0
  while (spent + xpForLevel(level) <= xp) {
    spent += xpForLevel(level)
    level++
  }
  const needed = xpForLevel(level)
  const intoLevel = xp - spent
  return { level, xp, intoLevel, needed, percent: Math.round((intoLevel / needed) * 100) }
}

export function totalXp(db: Database): number {
  return xpBreakdown(db).reduce((n, x) => n + x.xp, 0)
}

/* ── Reeksen ────────────────────────────────────────────────────────────── */

export interface Streak {
  label: string
  days: number
  color: string
  hint: string
}

function streakOf(test: (key: string) => boolean, today: string): number {
  let streak = 0
  let cursor = test(today) ? today : addDays(today, -1)
  while (test(cursor)) {
    streak++
    cursor = addDays(cursor, -1)
    if (streak > 400) break
  }
  return streak
}

export function streaks(db: Database, today = todayKey()): Streak[] {
  return [
    {
      label: '75 Hard volledig',
      days: streakOf((k) => hard75Count(db.days[k] ?? emptyDay(k)) === HARD75_RULES.length, today),
      color: SERIES.violet,
      hint: 'alle vijf de regels op één dag',
    },
    {
      label: 'Getraind',
      days: streakOf((k) => {
        const s = sessionsOnDay(db, k)
        return s.planned === 0 ? false : s.done >= s.planned
      }, today),
      color: SERIES.orange,
      hint: 'alle geplande sessies van die dag',
    },
    {
      label: 'Gelezen',
      days: readingStreak(db, today),
      color: SERIES.magenta,
      hint: 'minstens één leessessie',
    },
    {
      label: 'Alles afgevinkt',
      days: streakOf((k) => {
        const tasks = db.tasks.filter((t) => t.date === k)
        return tasks.length > 0 && tasks.every((t) => t.done)
      }, today),
      color: '#22d3ee',
      hint: 'geen taak laten liggen',
    },
    {
      label: 'Dag gelogd',
      days: streakOf((k) => dayHasData(db, k), today),
      color: SERIES.blue,
      hint: 'iets ingevuld die dag',
    },
  ]
}

/* ── Momentum ───────────────────────────────────────────────────────────── */

export interface Momentum {
  recent: number
  before: number
  delta: number
  tone: 'good' | 'warn' | 'bad' | 'neutral'
  message: string
}

/** Je laatste week tegenover de drie weken daarvoor. */
export function momentum(db: Database, today = todayKey()): Momentum {
  const avg = (from: number, to: number) => {
    const scores: number[] = []
    for (let i = from; i < to; i++) {
      const key = addDays(today, -i)
      if (dayHasData(db, key)) scores.push(dayScore(db, key))
    }
    return scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length
  }

  const recent = Math.round(avg(0, 7))
  const before = Math.round(avg(7, 28))
  const delta = recent - before

  if (before === 0 || recent === 0) {
    return { recent, before, delta, tone: 'neutral', message: 'Nog te weinig dagen gelogd om een richting te zien.' }
  }
  if (delta >= 8) return { recent, before, delta, tone: 'good', message: 'Je bent duidelijk aan het klimmen. Hou dit vast.' }
  if (delta <= -8) return { recent, before, delta, tone: 'bad', message: 'Je zakt weg tegenover de weken ervoor. Kies één ding om morgen anders te doen.' }
  return { recent, before, delta, tone: 'warn', message: 'Vlak. Niet slecht, maar ook niet vooruit.' }
}

/* ── Waar je je energie in stopt ────────────────────────────────────────── */

export function effortSplit(db: Database, days = 30, today = todayKey()) {
  const since = addDays(today, -days)
  const keys = Array.from({ length: days }, (_, i) => addDays(today, -i))

  const sessionMinutes = db.sessionLogs
    .filter((l) => l.date > since)
    .reduce((n, l) => n + (l.durationMin ?? 45), 0)
  const plainSessions = keys.reduce((n, k) => {
    if (db.sessionLogs.some((l) => l.date === k)) return n
    return n + sessionsOnDay(db, k).done * 60
  }, 0)

  return [
    { label: 'Sport', value: Math.round((sessionMinutes + plainSessions) / 60), color: SERIES.orange },
    { label: 'School', value: Math.round(db.study.filter((s) => s.date > since).reduce((n, s) => n + s.minutes, 0) / 60), color: SERIES.blue },
    { label: 'Lezen', value: Math.round(db.reading.filter((r) => r.date > since).reduce((n, r) => n + r.minutes, 0) / 60), color: SERIES.magenta },
    {
      label: 'Business',
      value: Math.round(db.fairs.filter((f) => f.date > since).reduce((n, f) => n + (f.hours ?? 6), 0)),
      color: SERIES.aqua,
    },
  ].filter((e) => e.value > 0)
}

/* ── Prestaties ─────────────────────────────────────────────────────────── */

export interface Achievement {
  id: string
  label: string
  hint: string
  done: boolean
  progress: number
  target: number
  color: string
}

export function achievements(db: Database, today = todayKey()): Achievement[] {
  const sessions = Object.values(db.days).reduce(
    (n, d) => n + Object.values(d.sessions).filter(Boolean).length + d.extra, 0,
  )
  const hardDays = Object.values(db.days).filter((d) => hard75Count(d) === HARD75_RULES.length).length
  const reviews = db.reviewLog.reduce((n, r) => n + r.again + r.hard + r.good + r.easy, 0)
  const profit = db.trades.reduce((n, t) => n + (tradeProfit(t) ?? 0), 0)
  const studyHours = db.study.reduce((n, s) => n + s.minutes, 0) / 60
  const tasksDone = db.tasks.filter((t) => t.done).length
  const booksRead = db.books.filter((b) => b.status === 'gelezen').length
  const records = personalRecords(db).length
  const perfectWeeks = countPerfectWeeks(db, today)
  const s = streaks(db, today)
  const hardStreak = s[0].days
  const trainStreak = s[1].days

  const list: [string, string, string, number, number, string][] = [
    ['eerste-stap', 'Eerste stap', 'Eén dag volledig gelogd', dayHasData(db, today) ? 1 : 0, 1, '#22d3ee'],
    ['week-vol', 'Week volgehouden', '7 dagen 75 Hard op rij', hardStreak, 7, SERIES.violet],
    ['maand-vol', 'Maand volgehouden', '30 dagen 75 Hard op rij', hardStreak, 30, SERIES.violet],
    ['75-af', '75 Hard afgemaakt', 'Alle 75 dagen volledig', hardDays, 75, SERIES.violet],
    ['ijzeren-week', 'IJzeren week', '9 sessies in één week', bestWeekSessions(db, today), 9, SERIES.orange],
    ['train-reeks', 'Onafgebroken', '14 dagen alles getraind', trainStreak, 14, SERIES.orange],
    ['honderd-sessies', 'Honderd sessies', '100 sessies afgewerkt', sessions, 100, SERIES.orange],
    ['records', 'Recordjager', '10 persoonlijke records', records, 10, SERIES.orange],
    ['kaarten', 'Duizend kaarten', '1000 kaarten herhaald', reviews, 1000, SERIES.blue],
    ['studeren', 'Vijftig uur', '50 uur studietijd gelogd', Math.floor(studyHours), 50, SERIES.blue],
    ['taken', 'Doorzetter', '250 taken afgewerkt', tasksDone, 250, '#22d3ee'],
    ['perfecte-weken', 'Vier perfecte weken', 'Vier weken met gemiddeld 90+', perfectWeeks, 4, '#22d3ee'],
    ['boeken', 'Boekenwurm', '12 boeken uitgelezen', booksRead, 12, SERIES.magenta],
    ['winst', 'Eerste duizend', '€1.000 winst gemaakt', Math.floor(profit), 1000, SERIES.aqua],
    ['beurzen', 'Vaste standhouder', '10 beurzen gedaan', db.fairs.length, 10, SERIES.aqua],
  ]

  return list.map(([id, label, hint, progress, target, color]) => ({
    id, label, hint, target, color,
    progress: Math.min(progress, target),
    done: progress >= target,
  }))
}

function bestWeekSessions(db: Database, today: string): number {
  let best = 0
  for (let w = 0; w < 26; w++) {
    const keys = weekKeys(addDays(today, -w * 7))
    const total = keys.reduce((n, k) => n + sessionsOnDay(db, k).done, 0)
    if (total > best) best = total
  }
  return best
}

function countPerfectWeeks(db: Database, today: string): number {
  let count = 0
  for (let w = 0; w < 52; w++) {
    const keys = weekKeys(addDays(today, -w * 7)).filter((k) => daysBetween(k, today) >= 0 && dayHasData(db, k))
    if (keys.length < 5) continue
    const avg = keys.reduce((n, k) => n + dayScore(db, k), 0) / keys.length
    if (avg >= 90) count++
  }
  return count
}
