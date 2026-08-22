import { isoWeekday } from './date'
import { SERIES } from './palette'

export type SessionKind = 'zwem' | 'loop' | 'hyrox'
export type Slot = 'VM' | 'NM'

export interface PlannedSession {
  /** stabiel id, gebruikt als sleutel in DayLog.sessions */
  id: string
  weekday: number // 1 = maandag
  kind: SessionKind
  slot: Slot
  label: string
}

export const SESSION_STYLE: Record<SessionKind, { color: string; label: string }> = {
  zwem:  { color: SERIES.blue,   label: 'Zwemmen' },
  loop:  { color: SERIES.orange, label: 'Lopen' },
  hyrox: { color: SERIES.aqua,   label: 'Hyrox' },
}

/** Noa's vaste weekschema: 9 sessies, donderdag rustdag. */
export const WEEK_SCHEDULE: PlannedSession[] = [
  { id: 'ma-zwem',  weekday: 1, kind: 'zwem',  slot: 'VM', label: 'Zwemmen' },
  { id: 'ma-hyrox', weekday: 1, kind: 'hyrox', slot: 'NM', label: 'Hyrox' },
  { id: 'di-loop',  weekday: 2, kind: 'loop',  slot: 'NM', label: 'Lopen' },
  { id: 'wo-hyrox', weekday: 3, kind: 'hyrox', slot: 'NM', label: 'Hyrox' },
  { id: 'vr-zwem',  weekday: 5, kind: 'zwem',  slot: 'VM', label: 'Zwemmen' },
  { id: 'vr-hyrox', weekday: 5, kind: 'hyrox', slot: 'NM', label: 'Hyrox' },
  { id: 'za-loop',  weekday: 6, kind: 'loop',  slot: 'VM', label: 'Lopen' },
  { id: 'za-hyrox', weekday: 6, kind: 'hyrox', slot: 'NM', label: 'Hyrox' },
  { id: 'zo-hyrox', weekday: 7, kind: 'hyrox', slot: 'VM', label: 'Hyrox' },
]

export const SESSIONS_PER_WEEK = WEEK_SCHEDULE.length

/** Standaardtijden per dagdeel, gebruikt om je dag in te plannen. */
export const SLOT_TIMES: Record<Slot, { start: string; end: string }> = {
  VM: { start: '07:30', end: '09:00' },
  NM: { start: '17:00', end: '18:30' },
}

export function sessionsFor(dateKey: string): PlannedSession[] {
  const wd = isoWeekday(dateKey)
  return WEEK_SCHEDULE.filter((s) => s.weekday === wd)
}

export function isRestDay(dateKey: string): boolean {
  return sessionsFor(dateKey).length === 0
}

export function sessionById(id: string): PlannedSession | undefined {
  return WEEK_SCHEDULE.find((s) => s.id === id)
}
