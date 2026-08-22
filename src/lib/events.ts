import { SERIES } from './palette'

export interface RaceEvent {
  id: string
  label: string
  sub: string
  date: string
  color: string
}

/** Vaste wedstrijden. Pas hier aan als er een datum bijkomt. */
export const EVENTS: RaceEvent[] = [
  { id: 'hyrox-sep', label: 'HYROX', sub: 'Open Doubles',  date: '2026-09-19', color: SERIES.aqua },
  { id: 'hyrox-dec', label: 'HYROX', sub: 'Mixed Doubles', date: '2026-12-20', color: SERIES.orange },
  { id: 'triatlon',  label: 'TRIATLON', sub: 'doel',       date: '2028-06-01', color: SERIES.blue },
]
