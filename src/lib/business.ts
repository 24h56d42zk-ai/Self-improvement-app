export type ItemCategory = 'sealed' | 'single' | 'slab' | 'accessoire'
export type Channel = 'beurs' | 'cardmarket' | 'online' | 'direct'

export const CATEGORIES: { id: ItemCategory; label: string; short: string }[] = [
  { id: 'sealed',     label: 'Sealed (boxes, ETB, displays)', short: 'Sealed' },
  { id: 'single',     label: 'Losse kaarten',                 short: 'Singles' },
  { id: 'slab',       label: 'Graded (PSA / CGC / BGS)',      short: 'Slabs' },
  { id: 'accessoire', label: 'Accessoires',                   short: 'Accessoires' },
]

export const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'beurs',      label: 'Beurs' },
  { id: 'cardmarket', label: 'Cardmarket' },
  { id: 'online',     label: 'Online (Vinted, eBay…)' },
  { id: 'direct',     label: 'Direct / DM' },
]

export interface InventoryItem {
  id: string
  name: string
  /** Set of reeks, bv. "Surging Sparks" */
  set: string
  category: ItemCategory
  /** Grade of conditie, bv. "PSA 10" of "NM" */
  grade: string
  quantity: number
  /** Inkoopprijs per stuk */
  unitCost: number
  /** Huidige marktwaarde per stuk */
  unitValue: number
  buyDate: string
  /** Wanneer je de marktwaarde het laatst bijwerkte */
  valueUpdated: string
  note: string
}

export interface Trade {
  id: string
  kind: 'aankoop' | 'verkoop'
  date: string
  name: string
  category: ItemCategory
  quantity: number
  /** Prijs per stuk */
  unitPrice: number
  /** Alleen bij verkoop: kostprijs per stuk, bewaard zodat de marge blijft kloppen */
  unitCost: number | null
  channel: Channel
  fairId: string | null
  itemId: string | null
  note: string
  /** Exact tijdstip van boeken; gebruikt om samen met metingen op dezelfde dag te rekenen */
  at?: string
}

export interface Fair {
  id: string
  name: string
  date: string
  location: string
  standCost: number
  travelCost: number
  otherCost: number
  /** Uren dat je er stond, om winst per uur te kunnen rekenen */
  hours: number | null
  note: string
}

export function categoryLabel(id: ItemCategory): string {
  return CATEGORIES.find((c) => c.id === id)?.short ?? id
}

export function channelLabel(id: Channel): string {
  return CHANNELS.find((c) => c.id === id)?.label ?? id
}

export function fairCosts(fair: Fair): number {
  return fair.standCost + fair.travelCost + fair.otherCost
}

export function euro(n: number): string {
  return `€${Math.round(n).toLocaleString('nl-BE')}`
}

/** Toont centen alleen wanneer ze er zijn — anders wordt €4,20 stilletjes €4. */
export function euroSmart(n: number): string {
  return Number.isInteger(n) ? euro(n) : euro2(n)
}

export function euro2(n: number): string {
  return `€${n.toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
