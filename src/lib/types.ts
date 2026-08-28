/** Alle data van Noa. Eén dag = één DayLog, geïdentificeerd door de datum (YYYY-MM-DD). */

export type Hard75Key = 'water' | 'move' | 'creatine' | 'skincare' | 'read'

export interface Hard75Day {
  water: boolean
  move: boolean
  creatine: boolean
  skincare: boolean
  read: boolean
}

export interface DayLog {
  date: string
  hard75: Hard75Day
  /** sessionId uit het weekschema -> afgevinkt */
  sessions: Record<string, boolean>
  /** extra sessies bovenop het vaste schema */
  extra: number
  ateHealthy: boolean | null
  sleepHours: number | null
  weightKg: number | null
  note: string
}

export type Domain = 'school' | 'sport' | 'biz' | 'health' | 'personal'

export type Repeat = 'geen' | 'dagelijks' | 'wekelijks' | 'maandelijks'

export interface Task {
  id: string
  title: string
  /** YYYY-MM-DD, of null voor 'ooit' */
  date: string | null
  done: boolean
  priority: 1 | 2 | 3
  domain: Domain
  createdAt: string
  /** Aan welk doel deze taak bijdraagt; null = losse taak */
  goalId?: string | null
  repeat?: Repeat
  /** Geschatte duur in minuten; gebruikt om je dag in te plannen */
  estimateMin?: number
}

export interface NetWorthSnapshot {
  id: string
  date: string
  cash: number
  inventory: number
  note: string
  /** Exact tijdstip; laat toe om transacties van dezelfde dag juist te tellen */
  at?: string
}

export interface Settings {
  name: string
  /** YYYY-MM-DD waarop 75 Hard begint; null = nog niet gestart */
  hard75Start: string | null
  /** Hoeveel keer 75 Hard al opnieuw is begonnen */
  hard75Attempt: number
  calmMode: boolean
  bootSeen: string | null
  /** Bewust gekozen om zonder cloud te werken; onderdrukt het startscherm */
  localOnly?: boolean
}

import type { SessionLog, StationId, StationResult } from './training'
import { defaultTargets } from './training'
import type { Fair, InventoryItem, Trade } from './business'
import type { Note, Presentation, Project, Subject } from './school'
import type { Book, ReadingLog } from './books'
import type { Goal, Lesson } from './planning'

export interface Database {
  version: 1
  /** ISO-tijdstip van de laatste wijziging; gebruikt om lokaal en cloud te vergelijken. */
  updatedAt: string
  settings: Settings
  days: Record<string, DayLog>
  tasks: Task[]
  netWorth: NetWorthSnapshot[]
  sessionLogs: SessionLog[]
  stations: StationResult[]
  /** Streeftijd per station in seconden — aanpasbaar per persoon. */
  stationTargets: Record<StationId, number>
  inventory: InventoryItem[]
  trades: Trade[]
  fairs: Fair[]
  /** Shopify-bestellingen die al geboekt zijn */
  shopifyImported: string[]
  /** Wanneer je voor het laatst synchroniseerde */
  shopifySyncedAt: string | null
  subjects: Subject[]
  notes: Note[]
  projects: Project[]
  presentations: Presentation[]
  books: Book[]
  reading: ReadingLog[]
  /** Hoeveel boeken je dit jaar wil lezen */
  bookGoal: number
  goals: Goal[]
  lessons: Lesson[]
}

export const HARD75_RULES: { key: Hard75Key; label: string; short: string; hint: string }[] = [
  { key: 'water',    label: '2 liter water',        short: 'WATER',    hint: 'Minstens 2L doorheen de dag' },
  { key: 'move',     label: '30 min bewegen',       short: 'BEWEGEN',  hint: 'Workout of wandeling, min. 30 minuten' },
  { key: 'creatine', label: 'Creatine genomen',     short: 'CREATINE', hint: '5g, elke dag, ook op rustdagen' },
  { key: 'skincare', label: 'Skincare gedaan',      short: 'SKINCARE', hint: 'Ochtend en avond' },
  { key: 'read',     label: '10 min gelezen',       short: 'LEZEN',    hint: 'Minstens 10 minuten in een boek' },
]

export const HARD75_LENGTH = 75

export function emptyHard75(): Hard75Day {
  return { water: false, move: false, creatine: false, skincare: false, read: false }
}

export function emptyDay(date: string): DayLog {
  return {
    date,
    hard75: emptyHard75(),
    sessions: {},
    extra: 0,
    ateHealthy: null,
    sleepHours: null,
    weightKg: null,
    note: '',
  }
}

export function emptyDatabase(): Database {
  return {
    version: 1,
    updatedAt: new Date(0).toISOString(),
    settings: {
      name: 'Noa',
      hard75Start: null,
      hard75Attempt: 1,
      calmMode: false,
      bootSeen: null,
    },
    days: {},
    tasks: [],
    netWorth: [],
    sessionLogs: [],
    stations: [],
    stationTargets: defaultTargets(),
    inventory: [],
    trades: [],
    fairs: [],
    shopifyImported: [],
    shopifySyncedAt: null,
    subjects: [],
    notes: [],
    projects: [],
    presentations: [],
    books: [],
    reading: [],
    bookGoal: 12,
    goals: [],
    lessons: [],
  }
}
