import type { Database } from './types'
import { HARD75_RULES, emptyDay } from './types'
import { addDays, dayName, daysBetween, formatShort, hoursLeftToday, todayKey, weekKeys } from './date'
import { EVENTS } from './events'
import { SESSION_STYLE, sessionsFor } from './schedule'
import {
  dayScore, hard75Count, hard75State, latestNetWorth, sessionsOnDay, sessionsThisWeek, tasksOnDay, WEEK_TARGET,
} from './derive'
import { loadRatio, stationScores, weakestStation } from './trainingDerive'
import { formatSeconds } from './training'

export type Tone = 'neutral' | 'good' | 'warn' | 'bad'
export interface Line { tone: Tone; text: string }

/**
 * Regelgebaseerde briefing — geen AI-sleutel nodig. De toon is direct,
 * want dat is expliciet wat er gevraagd is.
 */
export function morningBriefing(db: Database, today = todayKey()): Line[] {
  const out: Line[] = []
  const planned = sessionsFor(today)
  const hard = hard75State(db, today)

  if (planned.length === 0) {
    out.push({ tone: 'neutral', text: 'Rustdag. Geen sessies gepland — herstel is training, maar 75 Hard loopt gewoon door.' })
  } else {
    const list = planned.map((s) => `${s.slot} ${SESSION_STYLE[s.kind].label.toLowerCase()}`).join(' en ')
    out.push({ tone: 'neutral', text: `Vandaag ${planned.length} ${planned.length === 1 ? 'sessie' : 'sessies'}: ${list}.` })
  }

  if (hard.started && hard.dayIndex > 0) {
    if (hard.brokenOn) {
      out.push({ tone: 'bad', text: `75 Hard is gebroken op ${formatShort(hard.brokenOn)}. Herstart hem of stop ermee — half meedoen telt niet.` })
    } else {
      out.push({ tone: hard.streak >= 7 ? 'good' : 'neutral', text: `75 Hard dag ${hard.dayIndex}. Streak van ${hard.streak} ${hard.streak === 1 ? 'dag' : 'dagen'} staat op het spel.` })
    }
  } else {
    out.push({ tone: 'warn', text: '75 Hard is nog niet gestart. Zet je startdatum en begin.' })
  }

  const week = sessionsThisWeek(db, today)
  const daysGone = weekKeys(today).filter((k) => daysBetween(k, today) >= 0).length
  const expected = weekKeys(today).slice(0, daysGone).reduce((n, k) => n + sessionsFor(k).length, 0)
  if (week.done < expected) {
    out.push({ tone: 'warn', text: `Je staat op ${week.done} van ${expected} sessies die deze week al gedaan moesten zijn. Achterstand: ${expected - week.done}.` })
  } else if (expected > 0) {
    out.push({ tone: 'good', text: `${week.done}/${WEEK_TARGET} sessies deze week, volledig op schema.` })
  }

  // Opbouw: te snel stijgen is de snelste weg naar een blessure.
  const load = loadRatio(db, today)
  if (load.tone === 'bad' || load.tone === 'warn') {
    out.push({ tone: load.tone, text: load.message })
  }

  const weak = weakestStation(stationScores(db))
  if (weak && weak.score < 90) {
    out.push({
      tone: 'warn',
      text: `Zwakste station blijft ${weak.label}: ${formatSeconds(weak.best!)} tegenover doel ${formatSeconds(weak.target)}.`,
    })
  }

  const next = upcomingEvent(today)
  if (next) {
    const d = daysBetween(today, next.date)
    const weeksLeft = Math.floor(d / 7)
    out.push({
      tone: d <= 21 ? 'warn' : 'neutral',
      text: `${next.label} ${next.sub}: nog ${d} dagen (${weeksLeft} weken, ~${weeksLeft * WEEK_TARGET} sessies).`,
    })
  }

  const tasks = tasksOnDay(db, today)
  if (tasks.total > 0) {
    out.push({ tone: tasks.done === tasks.total ? 'good' : 'neutral', text: `${tasks.total - tasks.done} van ${tasks.total} taken staan nog open voor vandaag.` })
  }

  const nw = latestNetWorth(db)
  if (nw.date && daysBetween(nw.date, today) > 30) {
    out.push({ tone: 'warn', text: `Je vermogen is ${daysBetween(nw.date, today)} dagen niet bijgewerkt. Voorraad van €${nw.inventory.toLocaleString('nl-BE')} zonder verse cijfers is een gok.` })
  }

  return out
}

/** 's Avonds: wat staat er nog open, met hoeveel tijd nog. */
export function eveningAlerts(db: Database, today = todayKey(), now = new Date()): Line[] {
  const out: Line[] = []
  const hours = hoursLeftToday(now)
  if (hours > 6) return out

  const log = db.days[today] ?? emptyDay(today)
  const open = HARD75_RULES.filter((r) => !log.hard75[r.key])
  if (open.length > 0) {
    out.push({
      tone: hours < 3 ? 'bad' : 'warn',
      text: `Nog ${open.length} van 5 open: ${open.map((r) => r.short.toLowerCase()).join(', ')}. Je hebt ${Math.floor(hours)}u ${Math.round((hours % 1) * 60)}m.`,
    })
  }
  const s = sessionsOnDay(db, today)
  if (s.planned > 0 && s.done < s.planned) {
    out.push({ tone: 'warn', text: `${s.planned - s.done} geplande ${s.planned - s.done === 1 ? 'sessie' : 'sessies'} nog niet afgevinkt.` })
  }
  if ((db.days[today]?.reflection ?? null) === null && hours < 4) {
    out.push({ tone: 'neutral', text: 'Avondreflectie nog niet ingevuld — één minuut werk.' })
  }
  return out
}

export interface WeekReview {
  weekOf: string
  sessions: { done: number; planned: number }
  hard75Days: number
  avgScore: number
  bestDay: { key: string; score: number } | null
  worstDay: { key: string; score: number } | null
  lines: Line[]
}

export function weekReview(db: Database, anchor = todayKey()): WeekReview {
  const keys = weekKeys(anchor).filter((k) => daysBetween(k, anchor) >= 0)
  const scores = keys.map((k) => ({ key: k, score: dayScore(db, k) }))
  const sessions = keys.reduce(
    (acc, k) => {
      const d = sessionsOnDay(db, k)
      return { done: acc.done + d.done, planned: acc.planned + d.planned }
    },
    { done: 0, planned: 0 },
  )
  const hard75Days = keys.filter((k) => hard75Count(db.days[k] ?? emptyDay(k)) === HARD75_RULES.length).length
  const avgScore = scores.length ? Math.round(scores.reduce((n, s) => n + s.score, 0) / scores.length) : 0
  const sorted = [...scores].sort((a, b) => b.score - a.score)

  const lines: Line[] = []
  lines.push({
    tone: sessions.done >= sessions.planned ? 'good' : 'warn',
    text: `${sessions.done} van ${sessions.planned} geplande sessies afgewerkt.`,
  })
  lines.push({
    tone: hard75Days === keys.length ? 'good' : 'bad',
    text: `75 Hard volledig op ${hard75Days} van ${keys.length} dagen.`,
  })
  if (sorted.length > 1) {
    lines.push({ tone: 'neutral', text: `Beste dag: ${dayName(sorted[0].key)} (${sorted[0].score}). Slechtste: ${dayName(sorted[sorted.length - 1].key)} (${sorted[sorted.length - 1].score}).` })
  }
  if (avgScore < 70) {
    lines.push({ tone: 'bad', text: `Gemiddelde dagscore ${avgScore}. Dat is te laag om je Hyrox-doel te halen. Kies één ding dat volgende week anders gaat.` })
  } else if (avgScore >= 90) {
    lines.push({ tone: 'good', text: `Gemiddelde dagscore ${avgScore}. Zo hoort het eruit te zien.` })
  }

  return { weekOf: keys[0], sessions, hard75Days, avgScore, bestDay: sorted[0] ?? null, worstDay: sorted[sorted.length - 1] ?? null, lines }
}

export function upcomingEvent(today = todayKey()) {
  return EVENTS
    .filter((e) => daysBetween(today, e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
}

/** Zondagavond: tijd voor de weekreview. */
export function isReviewMoment(now = new Date()): boolean {
  return now.getDay() === 0 && now.getHours() >= 17
}

export function tomorrowKey(today = todayKey()): string {
  return addDays(today, 1)
}
