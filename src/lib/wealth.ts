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
  /** Wat er sinds die meting aan cash binnenkwam en uitging */
  movements: number
  /** Hoeveel voorraadwaarde er sinds die meting bij kwam of afging */
  inventoryMovements: number
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
  if (!snap) {
    const listed = listedValue(db)
    return { cash: 0, inventory: listed, total: listed, since: null, movements: 0, inventoryMovements: 0 }
  }

  const notFuture = (date: string) => daysBetween(date, today) >= 0
  const relevant = (date: string, at?: string) => isAfter(snap, date, at) && notFuture(date)

  let movements = 0
  let inventoryMovements = 0
  for (const t of db.trades) {
    if (!relevant(t.date, t.at)) continue
    const amount = t.quantity * t.unitPrice
    if (t.kind === 'verkoop') {
      movements += amount
      // De voorraad zakt met wat je het stuk zelf waard vond, niet met de verkoopprijs.
      inventoryMovements -= t.quantity * (t.valueAtSale ?? t.unitCost ?? t.unitPrice)
    } else {
      movements -= amount
      inventoryMovements += amount
    }
  }
  for (const f of db.fairs) {
    if (!relevant(f.date)) continue
    movements -= fairCosts(f)
  }

  const cash = snap.cash + movements
  // Dekt je lijst je meting, dan is de lijst de bron en is hij al bijgewerkt.
  // Doet hij dat niet, dan schuift de meting mee met wat je boekte.
  const inventory = inventoryFromList(db)
    ? listedValue(db)
    : Math.max(0, snap.inventory + inventoryMovements)

  return { cash, inventory, total: cash + inventory, since: snap.date, movements, inventoryMovements }
}

function listedValue(db: Database): number {
  return db.inventory.reduce((n, i) => n + i.quantity * i.unitValue, 0)
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
  const listed = listedValue(db)
  const measured = lastSnapshot(db)?.inventory ?? 0
  return measured === 0 ? listed > 0 : listed >= measured * 0.6
}
