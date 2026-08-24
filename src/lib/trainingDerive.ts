import type { Database } from './types'
import type { SessionLog, StationId } from './training'
import { STATIONS, station, tonnage } from './training'
import { addDays, daysBetween, formatShort, startOfWeek, todayKey, weekKeys } from './date'
import { afterStart } from './appStart'
import { sessionsFor } from './schedule'

/* ── Weekvolume ─────────────────────────────────────────────────────────── */

export interface WeekVolume {
  weekStart: string
  label: string
  loopKm: number
  zwemKm: number
  tonnage: number
  load: number
  sessions: number
  planned: number
}

export function weeklyVolume(db: Database, weeks = 12, today = todayKey()): WeekVolume[] {
  const thisWeek = startOfWeek(today)
  const all = Array.from({ length: weeks }, (_, i) => {
    const weekStart = addDays(thisWeek, (i - weeks + 1) * 7)
    const keys = weekKeys(weekStart)
    const logs = db.sessionLogs.filter((l) => keys.includes(l.date))
    const done = keys.reduce((n, k) => {
      const day = db.days[k]
      if (!day) return n
      return n + Object.values(day.sessions).filter(Boolean).length + day.extra
    }, 0)
    return {
      weekStart,
      label: formatShort(weekStart),
      loopKm: round1(sum(logs.filter((l) => l.kind === 'loop').map((l) => l.distanceKm ?? 0))),
      zwemKm: round1(sum(logs.filter((l) => l.kind === 'zwem').map((l) => l.distanceKm ?? 0))),
      tonnage: Math.round(sum(logs.map(tonnage))),
      load: Math.round(sum(logs.map(sessionLoad))),
      sessions: done,
      planned: keys.reduce((n, k) => n + sessionsFor(k).length, 0),
    }
  })
  // Weken van voor de start tellen niet mee.
  return all.filter((w) => afterStart(addDays(w.weekStart, 6)))
}

/* ── Belasting en blessurerisico ────────────────────────────────────────── */

/** Sessiebelasting volgens de RPE-methode: duur × zwaarte. Zonder RPE rekenen we met 6. */
export function sessionLoad(log: SessionLog): number {
  return (log.durationMin ?? 45) * (log.rpe ?? 6)
}

export interface LoadRatio {
  acute: number
  chronic: number
  ratio: number | null
  tone: 'good' | 'warn' | 'bad' | 'neutral'
  message: string
}

/**
 * Acute belasting (7 dagen) tegenover de chronische (gemiddelde week over 28 dagen).
 * Boven 1,5 bouw je te snel op — dat is waar blessures vandaan komen.
 */
export function loadRatio(db: Database, today = todayKey()): LoadRatio {
  const inWindow = (days: number) =>
    db.sessionLogs.filter((l) => {
      const d = daysBetween(l.date, today)
      return d >= 0 && d < days
    })

  const acute = Math.round(sum(inWindow(7).map(sessionLoad)))
  const chronic = Math.round(sum(inWindow(28).map(sessionLoad)) / 4)

  if (chronic === 0) {
    return { acute, chronic, ratio: null, tone: 'neutral', message: 'Nog te weinig sessies gelogd om je opbouw te beoordelen.' }
  }
  const ratio = acute / chronic
  if (ratio > 1.5) return { acute, chronic, ratio, tone: 'bad', message: 'Je bouwt te snel op. Dit is het bereik waar blessures ontstaan — bouw deze week af.' }
  if (ratio > 1.3) return { acute, chronic, ratio, tone: 'warn', message: 'Stevige stijging. Hou het hier, ga niet verder omhoog.' }
  if (ratio < 0.8) return { acute, chronic, ratio, tone: 'warn', message: 'Je doet duidelijk minder dan je gewoon bent. Bewust, of laat je het lopen?' }
  return { acute, chronic, ratio, tone: 'good', message: 'Gezonde opbouw. Zo hoort het.' }
}

/* ── Persoonlijke records ───────────────────────────────────────────────── */

export interface Record {
  key: string
  category: 'station' | 'afstand' | 'kracht'
  label: string
  value: string
  raw: number
  date: string
  fresh: boolean
  /** Verbetering tegenover het vorige record, als tekst */
  improvement: string | null
}

const NEW_PR_DAYS = 21

export function personalRecords(db: Database, today = todayKey()): Record[] {
  const out: Record[] = []

  // Stations: snelste tijd wint.
  for (const st of STATIONS) {
    const results = db.stations
      .filter((r) => r.stationId === st.id)
      .sort((a, b) => a.seconds - b.seconds)
    if (results.length === 0) continue
    const best = results[0]
    const previous = results.find((r) => r.id !== best.id && r.date < best.date)
    out.push({
      key: `station-${st.id}`,
      category: 'station',
      label: `${st.label} (${st.spec})`,
      value: fmt(best.seconds),
      raw: best.seconds,
      date: best.date,
      fresh: daysBetween(best.date, today) <= NEW_PR_DAYS,
      improvement: previous ? `−${fmt(previous.seconds - best.seconds)}` : null,
    })
  }

  // Afstand: beste tempo per soort. Lopen rekent per km, zwemmen per 100 m.
  for (const kind of ['loop', 'zwem'] as const) {
    const unit = kind === 'loop' ? '/km' : '/100m'
    const perUnit = kind === 'loop' ? 1 : 10
    const candidates = db.sessionLogs
      .filter((l) => l.kind === kind && (l.distanceKm ?? 0) > 0 && (l.durationMin ?? 0) > 0)
      .map((l) => ({ log: l, pace: (l.durationMin! * 60) / (l.distanceKm! * perUnit) }))
      .sort((a, b) => a.pace - b.pace)
    if (candidates.length === 0) continue
    const best = candidates[0]
    out.push({
      key: `pace-${kind}`,
      category: 'afstand',
      label: kind === 'loop' ? 'Beste looptempo' : 'Beste zwemtempo',
      value: `${fmt(best.pace)} ${unit}`,
      raw: best.pace,
      date: best.log.date,
      fresh: daysBetween(best.log.date, today) <= NEW_PR_DAYS,
      improvement: candidates[1] ? `−${fmt(candidates[1].pace - best.pace)}` : null,
    })
  }

  // Langste afstand per soort.
  for (const kind of ['loop', 'zwem'] as const) {
    const longest = db.sessionLogs
      .filter((l) => l.kind === kind && (l.distanceKm ?? 0) > 0)
      .sort((a, b) => (b.distanceKm ?? 0) - (a.distanceKm ?? 0))[0]
    if (!longest) continue
    out.push({
      key: `dist-${kind}`,
      category: 'afstand',
      label: kind === 'loop' ? 'Langste loop' : 'Langste zwem',
      value: `${longest.distanceKm} km`,
      raw: longest.distanceKm!,
      date: longest.date,
      fresh: daysBetween(longest.date, today) <= NEW_PR_DAYS,
      improvement: null,
    })
  }

  // Kracht: zwaarste set per oefening.
  const heaviest = new Map<string, { kg: number; reps: number; date: string }>()
  for (const log of db.sessionLogs) {
    for (const ex of log.exercises) {
      for (const set of ex.sets) {
        if (!set.weightKg) continue
        const current = heaviest.get(ex.name)
        if (!current || set.weightKg > current.kg) {
          heaviest.set(ex.name, { kg: set.weightKg, reps: set.reps, date: log.date })
        }
      }
    }
  }
  for (const [name, rec] of heaviest) {
    out.push({
      key: `lift-${name}`,
      category: 'kracht',
      label: name,
      value: `${rec.kg} kg × ${rec.reps}`,
      raw: rec.kg,
      date: rec.date,
      fresh: daysBetween(rec.date, today) <= NEW_PR_DAYS,
      improvement: null,
    })
  }

  return out.sort((a, b) => Number(b.fresh) - Number(a.fresh) || b.date.localeCompare(a.date))
}

/* ── Stations: radar en zwakste punt ────────────────────────────────────── */

export interface StationScore {
  id: StationId
  short: string
  label: string
  spec: string
  best: number | null
  target: number
  /** 100 = op doel; hoger is sneller dan het doel. Zonder meting: 0. */
  score: number
  measured: boolean
}

export function stationScores(db: Database): StationScore[] {
  return STATIONS.map((st) => {
    const target = db.stationTargets?.[st.id] ?? st.defaultTarget
    const best = db.stations
      .filter((r) => r.stationId === st.id)
      .reduce<number | null>((min, r) => (min === null || r.seconds < min ? r.seconds : min), null)
    return {
      id: st.id,
      short: st.short,
      label: st.label,
      spec: st.spec,
      best,
      target,
      score: best === null ? 0 : Math.round(Math.min(130, (target / best) * 100)),
      measured: best !== null,
    }
  })
}

export function weakestStation(scores: StationScore[]): StationScore | null {
  const measured = scores.filter((s) => s.measured)
  if (measured.length === 0) return null
  return measured.reduce((worst, s) => (s.score < worst.score ? s : worst))
}

/* ── Readiness ──────────────────────────────────────────────────────────── */

export interface Readiness {
  total: number
  consistency: number
  coverage: number
  performance: number
  weeksLeft: number
  sessionsLeft: number
}

/**
 * Hoe klaar sta je voor de wedstrijd? Drie delen: volhouden van het schema,
 * hoeveel stations je überhaupt getest hebt, en hoe je daarop presteert.
 */
export function readiness(db: Database, raceDate: string, today = todayKey()): Readiness {
  const weeks = weeklyVolume(db, 6, today)
  const done = sum(weeks.map((w) => w.sessions))
  const planned = sum(weeks.map((w) => w.planned))
  const consistency = planned === 0 ? 0 : Math.min(1, done / planned)

  const scores = stationScores(db)
  const measured = scores.filter((s) => s.measured)
  const coverage = measured.length / scores.length
  const performance = measured.length === 0
    ? 0
    : sum(measured.map((s) => Math.min(1, s.score / 100))) / measured.length

  const daysLeft = Math.max(0, daysBetween(today, raceDate))
  const weeksLeft = Math.floor(daysLeft / 7)

  return {
    total: Math.round(consistency * 50 + coverage * 20 + performance * 30),
    consistency: Math.round(consistency * 100),
    coverage: Math.round(coverage * 100),
    performance: Math.round(performance * 100),
    weeksLeft,
    sessionsLeft: Math.round((daysLeft / 7) * 9),
  }
}

/* ── Hulpjes ────────────────────────────────────────────────────────────── */

function sum(list: number[]): number {
  return list.reduce((a, b) => a + b, 0)
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function fmt(total: number): string {
  const m = Math.floor(total / 60)
  const s = Math.round(total % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export { station }
