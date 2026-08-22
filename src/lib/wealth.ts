import type { Database, NetWorthSnapshot } from './types'
import { todayKey } from './date'
import { fairCosts } from './business'
import { daysBetween } from './date'

/**
 * Cash, voorraad en totaal vermogen. De laatste meting is het ankerpunt;
 * alles wat daarna geboekt is telt er automatisch bij of af.
 */

export interface Wealth {
  cash: number
  inventory: number
  total: number
  /** Datum van de meting waarop dit verder rekent */
  since: string | null
  /** Wat er sinds die meting binnenkwam en uitging */
  movements: number
}

function lastSnapshot(db: Database): NetWorthSnapshot | null {
  const sorted = [...db.netWorth].sort((a, b) => (a.at ?? a.date).localeCompare(b.at ?? b.date))
  return sorted[sorted.length - 1] ?? null
}

/** Telt een boeking mee als hij ná de meting kwam, op tijdstip als dat er is. */
function isAfter(snapshot: NetWorthSnapshot, date: string, at?: string): boolean {
  if (snapshot.at && at) return at > snapshot.at
  return date > snapshot.date
}

export function wealth(db: Database, today = todayKey()): Wealth {
  const snap = lastSnapshot(db)
  const inventory = inventoryShown(db)
  if (!snap) return { cash: 0, inventory, total: inventory, since: null, movements: 0 }

  const notFuture = (date: string) => daysBetween(date, today) >= 0
  const relevant = (date: string, at?: string) => isAfter(snap, date, at) && notFuture(date)

  let movements = 0
  for (const t of db.trades) {
    if (!relevant(t.date, t.at)) continue
    movements += (t.kind === 'verkoop' ? 1 : -1) * t.quantity * t.unitPrice
  }
  for (const f of db.fairs) {
    if (!relevant(f.date)) continue
    movements -= fairCosts(f)
  }

  const cash = snap.cash + movements
  return { cash, inventory, total: cash + inventory, since: snap.date, movements }
}

/** Waarde van de voorraad: de lijst als die je meting dekt, anders de meting. */
export function inventoryShown(db: Database): number {
  const listed = db.inventory.reduce((n, i) => n + i.quantity * i.unitValue, 0)
  const snap = lastSnapshot(db)
  const measured = snap?.inventory ?? 0
  if (measured === 0) return listed
  return listed >= measured * 0.6 ? listed : Math.max(listed, measured)
}

/* ── Aanpassen ──────────────────────────────────────────────────────────── */

function upsertToday(db: Database, cash: number, inventory: number, note: string): void {
  const today = todayKey()
  const existing = db.netWorth.find((s) => s.date === today)
  if (existing) {
    existing.cash = cash
    existing.inventory = inventory
    existing.at = new Date().toISOString()
    if (note) existing.note = note
  } else {
    db.netWorth.push({
      id: crypto.randomUUID(),
      date: today,
      cash,
      inventory,
      note,
      at: new Date().toISOString(),
    })
  }
}

/** Zet je cash op een bedrag; alles wat je daarna boekt telt er weer bij. */
export function setCash(db: Database, amount: number, note = ''): void {
  upsertToday(db, amount, wealth(db).inventory, note)
}

/**
 * Zet je voorraadwaarde. Staat er een itemlijst die je meting dekt, dan is die
 * de bron en heeft handmatig zetten geen zin — dat zegt de app er ook bij.
 */
export function setInventory(db: Database, amount: number, note = ''): void {
  upsertToday(db, wealth(db).cash, amount, note)
}

/** Zet het totaal; het verschil komt terecht bij je cash. */
export function setTotal(db: Database, amount: number, note = ''): void {
  const current = wealth(db)
  upsertToday(db, amount - current.inventory, current.inventory, note)
}

/** Bepaalt of de voorraad uit de itemlijst komt of uit je meting. */
export function inventoryFromList(db: Database): boolean {
  const listed = db.inventory.reduce((n, i) => n + i.quantity * i.unitValue, 0)
  const measured = lastSnapshot(db)?.inventory ?? 0
  return measured === 0 ? listed > 0 : listed >= measured * 0.6
}
