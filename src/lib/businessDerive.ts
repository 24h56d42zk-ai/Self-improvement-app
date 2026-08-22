import type { Database } from './types'
import type { Channel, Fair, InventoryItem, ItemCategory, Trade } from './business'
import { CATEGORIES, CHANNELS, fairCosts } from './business'
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

/* ── Maandcijfers ───────────────────────────────────────────────────────── */

export interface MonthStats {
  month: string
  label: string
  revenue: number
  profit: number
  spend: number
  units: number
  transactions: number
}

const MONTH_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec']

export function monthlyStats(db: Database, months = 12, today = todayKey()): MonthStats[] {
  const [y, m] = today.split('-').map(Number)
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(y, m - 1 - (months - 1 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const inMonth = db.trades.filter((t) => t.date.startsWith(key))
    const sales = inMonth.filter((t) => t.kind === 'verkoop')
    const buys = inMonth.filter((t) => t.kind === 'aankoop')
    const fairSpend = db.fairs.filter((f) => f.date.startsWith(key)).reduce((n, f) => n + fairCosts(f), 0)
    return {
      month: key,
      label: `${MONTH_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      revenue: Math.round(sum(sales.map(tradeTotal))),
      profit: Math.round(sum(sales.map((t) => tradeProfit(t) ?? 0)) - fairSpend),
      spend: Math.round(sum(buys.map(tradeTotal)) + fairSpend),
      units: sum(sales.map((t) => t.quantity)),
      transactions: sales.length,
    }
  })
}

/* ── Kanalen ────────────────────────────────────────────────────────────── */

export interface ChannelStats {
  channel: Channel
  label: string
  revenue: number
  profit: number
  units: number
  margin: number | null
}

export function byChannel(db: Database): ChannelStats[] {
  return CHANNELS.map((c) => {
    const sales = db.trades.filter((t) => t.kind === 'verkoop' && t.channel === c.id)
    const revenue = sum(sales.map(tradeTotal))
    const profit = sum(sales.map((t) => tradeProfit(t) ?? 0))
    return {
      channel: c.id,
      label: c.label,
      revenue: Math.round(revenue),
      profit: Math.round(profit),
      units: sum(sales.map((t) => t.quantity)),
      margin: revenue === 0 ? null : (profit / revenue) * 100,
    }
  }).filter((c) => c.revenue > 0 || c.units > 0)
}

/* ── Categorie: marge en rendement ──────────────────────────────────────── */

export interface CategoryPerformance {
  id: ItemCategory
  label: string
  revenue: number
  profit: number
  margin: number | null
  /** Rendement op wat je erin stak */
  roi: number | null
  stockValue: number
  units: number
}

export function categoryPerformance(db: Database): CategoryPerformance[] {
  return CATEGORIES.map((c) => {
    const sales = db.trades.filter((t) => t.kind === 'verkoop' && t.category === c.id)
    const revenue = sum(sales.map(tradeTotal))
    const profit = sum(sales.map((t) => tradeProfit(t) ?? 0))
    const cost = sum(sales.map((t) => t.quantity * (t.unitCost ?? 0)))
    const stock = db.inventory.filter((i) => i.category === c.id)
    return {
      id: c.id,
      label: c.short,
      revenue: Math.round(revenue),
      profit: Math.round(profit),
      margin: revenue === 0 ? null : (profit / revenue) * 100,
      roi: cost === 0 ? null : (profit / cost) * 100,
      stockValue: Math.round(sum(stock.map(itemValue))),
      units: sum(sales.map((t) => t.quantity)),
    }
  })
}

/* ── Verkoopsnelheid ────────────────────────────────────────────────────── */

export interface AgeBucket { label: string; value: number; count: number }

/** Voorraadwaarde verdeeld over hoe lang het al ligt. */
export function stockAgeBuckets(db: Database, today = todayKey()): AgeBucket[] {
  const buckets: { label: string; max: number }[] = [
    { label: '0–30 d', max: 30 },
    { label: '31–60 d', max: 60 },
    { label: '61–90 d', max: 90 },
    { label: '91–180 d', max: 180 },
    { label: '180+ d', max: Infinity },
  ]
  return buckets.map((b, i) => {
    const min = i === 0 ? 0 : buckets[i - 1].max
    const items = db.inventory.filter((item) => {
      const d = daysInStock(item, today)
      return d > min - (i === 0 ? 1 : 0) && d <= b.max
    })
    return { label: b.label, value: Math.round(sum(items.map(itemValue))), count: items.length }
  })
}

/** Gemiddeld aantal dagen tussen aankoop en verkoop, per categorie. */
export function daysToSell(db: Database): { label: string; value: number }[] {
  return CATEGORIES.map((c) => {
    const spans: number[] = []
    for (const sale of db.trades.filter((t) => t.kind === 'verkoop' && t.category === c.id && t.itemId)) {
      const buy = db.trades.find((t) => t.kind === 'aankoop' && t.itemId === sale.itemId)
      if (buy) spans.push(Math.max(0, daysBetween(buy.date, sale.date)))
    }
    return { label: c.short, value: spans.length === 0 ? 0 : Math.round(sum(spans) / spans.length) }
  }).filter((c) => c.value > 0)
}

/* ── Bestsellers ────────────────────────────────────────────────────────── */

export interface Bestseller { name: string; revenue: number; profit: number; units: number }

export function bestsellers(db: Database, limit = 8): Bestseller[] {
  const map = new Map<string, Bestseller>()
  for (const t of db.trades.filter((x) => x.kind === 'verkoop')) {
    const key = t.name.trim().toLowerCase() || '(zonder naam)'
    const cur = map.get(key) ?? { name: t.name || '(zonder naam)', revenue: 0, profit: 0, units: 0 }
    cur.revenue += tradeTotal(t)
    cur.profit += tradeProfit(t) ?? 0
    cur.units += t.quantity
    map.set(key, cur)
  }
  return [...map.values()]
    .map((b) => ({ ...b, revenue: Math.round(b.revenue), profit: Math.round(b.profit) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}
