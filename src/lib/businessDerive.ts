import type { Database } from './types'
import type { Fair, InventoryItem, ItemCategory, Trade } from './business'
import { CATEGORIES, fairCosts } from './business'
import { daysBetween, todayKey } from './date'

/* ── Inventaris ─────────────────────────────────────────────────────────── */

export function itemValue(item: InventoryItem): number {
  return item.quantity * item.unitValue
}

export function itemCost(item: InventoryItem): number {
  return item.quantity * item.unitCost
}

export interface InventoryTotals {
  value: number
  cost: number
  unrealised: number
  margin: number | null
  units: number
  lines: number
}

export function inventoryTotals(items: InventoryItem[]): InventoryTotals {
  const value = sum(items.map(itemValue))
  const cost = sum(items.map(itemCost))
  return {
    value,
    cost,
    unrealised: value - cost,
    margin: value === 0 ? null : ((value - cost) / value) * 100,
    units: sum(items.map((i) => i.quantity)),
    lines: items.length,
  }
}

export function byCategory(items: InventoryItem[]): { id: ItemCategory; label: string; value: number; cost: number; units: number }[] {
  return CATEGORIES.map((c) => {
    const list = items.filter((i) => i.category === c.id)
    return {
      id: c.id,
      label: c.short,
      value: sum(list.map(itemValue)),
      cost: sum(list.map(itemCost)),
      units: sum(list.map((i) => i.quantity)),
    }
  })
}

export function daysInStock(item: InventoryItem, today = todayKey()): number {
  return Math.max(0, daysBetween(item.buyDate, today))
}

/** Items die al lang niet bewegen — bij een grote voorraad is dat vastgeklonken geld. */
export function slowMovers(items: InventoryItem[], minDays = 90, today = todayKey()): InventoryItem[] {
  return items
    .filter((i) => daysInStock(i, today) >= minDays)
    .sort((a, b) => daysInStock(b, today) - daysInStock(a, today))
}

/** Waardes die te lang niet zijn bijgewerkt: dan reken je met verouderde cijfers. */
export function staleValues(items: InventoryItem[], minDays = 60, today = todayKey()): InventoryItem[] {
  return items
    .filter((i) => daysBetween(i.valueUpdated, today) >= minDays)
    .sort((a, b) => daysBetween(b.valueUpdated, today) - daysBetween(a.valueUpdated, today))
}

/* ── Cash ───────────────────────────────────────────────────────────────── */

export interface CashState {
  amount: number
  /** Datum van de laatste handmatige meting waarop dit bedrag verder rekent */
  since: string | null
  movements: number
}

/**
 * Live cash = je laatste handmatige meting, plus alles wat er sindsdien
 * binnenkwam en uitging. Zo hoef je niet elke euro te tellen om te kloppen.
 */
export function cashNow(db: Database, today = todayKey()): CashState {
  const snapshots = [...db.netWorth].sort((a, b) => a.date.localeCompare(b.date))
  const last = snapshots[snapshots.length - 1]
  if (!last) return { amount: 0, since: null, movements: 0 }

  const after = (date: string) => date > last.date && daysBetween(date, today) >= 0
  const sales = sum(db.trades.filter((t) => t.kind === 'verkoop' && after(t.date)).map(tradeTotal))
  const buys = sum(db.trades.filter((t) => t.kind === 'aankoop' && after(t.date)).map(tradeTotal))
  const costs = sum(db.fairs.filter((f) => after(f.date)).map(fairCosts))
  const movements = sales - buys - costs

  return { amount: last.cash + movements, since: last.date, movements }
}

export function tradeTotal(trade: Trade): number {
  return trade.quantity * trade.unitPrice
}

export function tradeProfit(trade: Trade): number | null {
  if (trade.kind !== 'verkoop' || trade.unitCost === null) return null
  return trade.quantity * (trade.unitPrice - trade.unitCost)
}

export function tradeMargin(trade: Trade): number | null {
  const profit = tradeProfit(trade)
  const revenue = tradeTotal(trade)
  if (profit === null || revenue === 0) return null
  return (profit / revenue) * 100
}

/* ── Vermogen over tijd ─────────────────────────────────────────────────── */

export interface WealthPoint { date: string; cash: number; inventory: number; total: number }

export interface Coverage {
  /** Waarde die je inventarislijst optelt */
  live: number
  /** Voorraadwaarde uit je laatste handmatige meting */
  measured: number
  ratio: number | null
  /** Dekt de lijst je gemeten voorraad genoeg om ermee te rekenen? */
  complete: boolean
}

/**
 * Zolang de inventarislijst maar een deel van je echte voorraad bevat, mag hij
 * de grafiek niet sturen — anders lijkt het alsof je vermogen instort.
 */
export function inventoryCoverage(db: Database): Coverage {
  const live = inventoryTotals(db.inventory).value
  const snapshots = [...db.netWorth].sort((a, b) => a.date.localeCompare(b.date))
  const measured = snapshots[snapshots.length - 1]?.inventory ?? 0
  if (measured === 0) return { live, measured, ratio: null, complete: live > 0 }
  const ratio = live / measured
  return { live, measured, ratio, complete: ratio >= 0.6 }
}

/**
 * De historische punten komen uit je handmatige metingen; het laatste punt is
 * live berekend uit je huidige inventaris en cash.
 */
export function wealthSeries(db: Database, today = todayKey()): WealthPoint[] {
  const points: WealthPoint[] = [...db.netWorth]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ date: s.date, cash: s.cash, inventory: s.inventory, total: s.cash + s.inventory }))

  // Het live punt komt er alleen bij als de lijst je gemeten voorraad echt dekt.
  const coverage = inventoryCoverage(db)
  if (coverage.complete) {
    const cash = cashNow(db, today).amount
    const live: WealthPoint = { date: today, cash, inventory: coverage.live, total: cash + coverage.live }
    const lastIndex = points.findIndex((p) => p.date === today)
    if (lastIndex >= 0) points[lastIndex] = live
    else points.push(live)
  }
  return points
}

/* ── Beursrapport ───────────────────────────────────────────────────────── */

export interface FairReport {
  fair: Fair
  revenue: number
  purchases: number
  costs: number
  grossProfit: number
  netProfit: number
  margin: number | null
  transactions: number
  unitsSold: number
  avgSale: number | null
  profitPerHour: number | null
  best: { name: string; revenue: number; profit: number | null; units: number }[]
}

export function fairReport(db: Database, fair: Fair): FairReport {
  const trades = db.trades.filter((t) => t.fairId === fair.id)
  const sales = trades.filter((t) => t.kind === 'verkoop')
  const buys = trades.filter((t) => t.kind === 'aankoop')

  const revenue = sum(sales.map(tradeTotal))
  const purchases = sum(buys.map(tradeTotal))
  const costs = fairCosts(fair)
  // Winst op verkopen waarvan we de kostprijs kennen; onbekende kostprijs telt als 0 winst.
  const grossProfit = sum(sales.map((t) => tradeProfit(t) ?? 0))
  const netProfit = grossProfit - costs
  const unitsSold = sum(sales.map((t) => t.quantity))

  const grouped = new Map<string, { name: string; revenue: number; profit: number | null; units: number }>()
  for (const t of sales) {
    const key = t.name.trim().toLowerCase() || '(zonder naam)'
    const current = grouped.get(key) ?? { name: t.name || '(zonder naam)', revenue: 0, profit: 0, units: 0 }
    current.revenue += tradeTotal(t)
    current.units += t.quantity
    const p = tradeProfit(t)
    current.profit = current.profit === null || p === null ? null : current.profit + p
    grouped.set(key, current)
  }

  return {
    fair,
    revenue,
    purchases,
    costs,
    grossProfit,
    netProfit,
    margin: revenue === 0 ? null : (netProfit / revenue) * 100,
    transactions: sales.length,
    unitsSold,
    avgSale: sales.length === 0 ? null : revenue / sales.length,
    profitPerHour: fair.hours && fair.hours > 0 ? netProfit / fair.hours : null,
    best: [...grouped.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5),
  }
}

export function fairReports(db: Database): FairReport[] {
  return [...db.fairs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((f) => fairReport(db, f))
}

/* ── Verkoopcijfers los van beurzen ─────────────────────────────────────── */

export interface SalesSummary {
  revenue: number
  profit: number
  units: number
  transactions: number
  margin: number | null
}

export function salesSummary(db: Database, since?: string): SalesSummary {
  const sales = db.trades.filter((t) => t.kind === 'verkoop' && (!since || t.date >= since))
  const revenue = sum(sales.map(tradeTotal))
  const profit = sum(sales.map((t) => tradeProfit(t) ?? 0))
  return {
    revenue,
    profit,
    units: sum(sales.map((t) => t.quantity)),
    transactions: sales.length,
    margin: revenue === 0 ? null : (profit / revenue) * 100,
  }
}

function sum(list: number[]): number {
  return list.reduce((a, b) => a + b, 0)
}
