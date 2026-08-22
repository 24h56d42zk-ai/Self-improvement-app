import type { SessionKind } from './schedule'

/* ── Sessielogboek ──────────────────────────────────────────────────────── */

export interface SetEntry {
  reps: number
  weightKg: number | null
}

export interface ExerciseEntry {
  id: string
  name: string
  sets: SetEntry[]
}

export interface SessionLog {
  id: string
  date: string
  /** id uit het weekschema, of null voor een extra sessie */
  sessionId: string | null
  kind: SessionKind
  durationMin: number | null
  /** 1 = makkelijk, 10 = alles gegeven */
  rpe: number | null
  distanceKm: number | null
  exercises: ExerciseEntry[]
  note: string
}

/* ── Hyrox-stations ─────────────────────────────────────────────────────── */

export const STATION_IDS = [
  'run', 'ski', 'sledPush', 'sledPull', 'burpee', 'row', 'farmers', 'lunges', 'wallballs',
] as const

export type StationId = (typeof STATION_IDS)[number]

export interface Station {
  id: StationId
  label: string
  short: string
  spec: string
  /** Standaarddoel in seconden — bedoeld om aan te passen naar je eigen doel. */
  defaultTarget: number
}

export const STATIONS: Station[] = [
  { id: 'run',       label: 'Loopsplit 1 km',      short: 'RUN',   spec: '1 km',      defaultTarget: 285 },
  { id: 'ski',       label: 'SkiErg',              short: 'SKI',   spec: '1000 m',    defaultTarget: 255 },
  { id: 'sledPush',  label: 'Sled Push',           short: 'PUSH',  spec: '50 m',      defaultTarget: 120 },
  { id: 'sledPull',  label: 'Sled Pull',           short: 'PULL',  spec: '50 m',      defaultTarget: 150 },
  { id: 'burpee',    label: 'Burpee Broad Jumps',  short: 'BURP',  spec: '80 m',      defaultTarget: 240 },
  { id: 'row',       label: 'Roeien',              short: 'ROW',   spec: '1000 m',    defaultTarget: 240 },
  { id: 'farmers',   label: 'Farmers Carry',       short: 'FARM',  spec: '200 m',     defaultTarget: 105 },
  { id: 'lunges',    label: 'Sandbag Lunges',      short: 'LUNG',  spec: '100 m',     defaultTarget: 240 },
  { id: 'wallballs', label: 'Wall Balls',          short: 'WALL',  spec: '100 reps',  defaultTarget: 270 },
]

export function station(id: StationId): Station {
  return STATIONS.find((s) => s.id === id)!
}

export interface StationResult {
  id: string
  stationId: StationId
  date: string
  seconds: number
  note: string
}

export function defaultTargets(): Record<StationId, number> {
  return Object.fromEntries(STATIONS.map((s) => [s.id, s.defaultTarget])) as Record<StationId, number>
}

/* ── Sjablonen: één tik en de sessie staat er ───────────────────────────── */

export interface Template {
  id: string
  label: string
  kind: SessionKind
  durationMin: number
  distanceKm: number | null
  exercises: { name: string; sets: number; reps: number; weightKg: number | null }[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'zwem-techniek', label: 'Zwemmen · techniek', kind: 'zwem',
    durationMin: 45, distanceKm: 1.5, exercises: [],
  },
  {
    id: 'zwem-afstand', label: 'Zwemmen · afstand', kind: 'zwem',
    durationMin: 60, distanceKm: 2.5, exercises: [],
  },
  {
    id: 'loop-rustig', label: 'Lopen · rustige duurloop', kind: 'loop',
    durationMin: 45, distanceKm: 8, exercises: [],
  },
  {
    id: 'loop-interval', label: 'Lopen · interval', kind: 'loop',
    durationMin: 50, distanceKm: 10, exercises: [],
  },
  {
    id: 'hyrox-kracht', label: 'Hyrox · kracht', kind: 'hyrox', durationMin: 75, distanceKm: null,
    exercises: [
      { name: 'Back squat',      sets: 4, reps: 6,  weightKg: 80 },
      { name: 'Deadlift',        sets: 4, reps: 5,  weightKg: 100 },
      { name: 'Walking lunges',  sets: 3, reps: 20, weightKg: 20 },
      { name: 'Pull-ups',        sets: 4, reps: 8,  weightKg: null },
    ],
  },
  {
    id: 'hyrox-compromised', label: 'Hyrox · compromised running', kind: 'hyrox',
    durationMin: 60, distanceKm: 6,
    exercises: [
      { name: 'Wall balls',   sets: 4, reps: 25, weightKg: 9 },
      { name: 'Burpee broad jumps', sets: 4, reps: 15, weightKg: null },
      { name: 'Sled push',    sets: 4, reps: 1,  weightKg: 100 },
    ],
  },
  {
    id: 'hyrox-simulatie', label: 'Hyrox · stationsimulatie', kind: 'hyrox',
    durationMin: 70, distanceKm: 4,
    exercises: [
      { name: 'SkiErg 1000m',    sets: 2, reps: 1, weightKg: null },
      { name: 'Row 1000m',       sets: 2, reps: 1, weightKg: null },
      { name: 'Farmers carry',   sets: 4, reps: 1, weightKg: 24 },
      { name: 'Sandbag lunges',  sets: 3, reps: 20, weightKg: 20 },
    ],
  },
]

/* ── Tijdnotatie ────────────────────────────────────────────────────────── */

export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = Math.round(total % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Leest "4:15", "4.15" of "255" en geeft seconden terug; null bij onzin. */
export function parseSeconds(raw: string): number | null {
  const clean = raw.trim().replace(',', '.')
  if (!clean) return null
  if (clean.includes(':')) {
    const [m, s] = clean.split(':')
    const min = Number(m)
    const sec = Number(s)
    if (!Number.isFinite(min) || !Number.isFinite(sec)) return null
    return min * 60 + sec
  }
  const n = Number(clean)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** Totaal getild gewicht van een sessie (reps × kg), in kilo. */
export function tonnage(log: SessionLog): number {
  return log.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => s + set.reps * (set.weightKg ?? 0), 0),
    0,
  )
}
