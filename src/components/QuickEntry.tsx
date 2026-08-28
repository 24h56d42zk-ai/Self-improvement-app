import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useStore } from '../lib/store'
import { todayKey } from '../lib/date'
import {
  CATEGORIES, CHANNELS, euro, euroSmart, type Channel, type InventoryItem, type ItemCategory,
} from '../lib/business'
import { wealth } from '../lib/wealth'
import { SERIES, STATUS } from '../lib/palette'

type Kind = 'aankoop' | 'verkoop'

/**
 * Eén plek om een aankoop of verkoop te boeken. De inventaris, je cash, je
 * marges en alle grafieken komen uit dezelfde boeking, dus je voert het
 * maar één keer in.
 */
export default function QuickEntry() {
  const { db, update } = useStore()
  const today = todayKey()

  const [kind, setKind] = useState<Kind>('verkoop')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ItemCategory>('sealed')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [unitCost, setUnitCost] = useState('')
  const [channel, setChannel] = useState<Channel>('beurs')
  const [fairId, setFairId] = useState('')
  const [date, setDate] = useState(today)
  const [flash, setFlash] = useState<string | null>(null)

  /** Herkent wat je typt als iets dat al in je voorraad ligt. */
  const match = useMemo<InventoryItem | null>(() => {
    const q = name.trim().toLowerCase()
    if (!q) return null
    return db.inventory.find((i) => i.name.trim().toLowerCase() === q)
      ?? db.inventory.find((i) => i.name.trim().toLowerCase().startsWith(q))
      ?? null
  }, [db.inventory, name])

  const qty = Math.max(1, Number(quantity) || 1)
  const price = Number(unitPrice) || 0
  const cost = kind === 'verkoop'
    ? (unitCost !== '' ? Number(unitCost) : match?.unitCost ?? 0)
    : price
  const total = qty * price
  const profit = kind === 'verkoop' ? qty * (price - cost) : 0
  const margin = kind === 'verkoop' && total > 0 ? (profit / total) * 100 : null
  const money = wealth(db, today)
  // Wat deze boeking met je voorraadwaarde doet: eruit tegen jouw eigen waardering,
  // erin tegen wat je ervoor betaalde.
  const inventoryDelta = kind === 'verkoop'
    ? -qty * (match?.unitValue ?? cost)
    : qty * price
  const totalDelta = (kind === 'verkoop' ? total : -total) + inventoryDelta
  const overSold = kind === 'verkoop' && match !== null && qty > match.quantity

  /** Bij het kiezen van een bestaand item vullen we in wat we al weten. */
  function pickName(value: string) {
    setName(value)
    const found = db.inventory.find((i) => i.name.trim().toLowerCase() === value.trim().toLowerCase())
    if (!found) return
    setCategory(found.category)
    if (kind === 'verkoop') {
      setUnitCost(String(found.unitCost))
      if (!unitPrice) setUnitPrice(String(found.unitValue))
    } else {
      if (!unitPrice) setUnitPrice(String(found.unitCost))
    }
  }

  function reset() {
    setName(''); setQuantity('1'); setUnitPrice(''); setUnitCost('')
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const clean = name.trim()
    if (!clean || price <= 0) return

    update((db) => {
      const existing = db.inventory.find((i) => i.name.trim().toLowerCase() === clean.toLowerCase())

      if (kind === 'aankoop') {
        if (existing) {
          // Gemiddelde inkoopprijs bijwerken, anders klopt je marge later niet.
          const totalUnits = existing.quantity + qty
          existing.unitCost = (existing.unitCost * existing.quantity + price * qty) / totalUnits
          existing.quantity = totalUnits
          if (existing.unitValue < price) existing.unitValue = price
        } else {
          db.inventory.push({
            id: crypto.randomUUID(),
            name: clean,
            set: '',
            category,
            grade: '',
            quantity: qty,
            unitCost: price,
            unitValue: price,
            buyDate: date,
            valueUpdated: date,
            note: '',
          })
        }
        db.trades.push({
          id: crypto.randomUUID(), kind: 'aankoop', date, name: clean, category,
          quantity: qty, unitPrice: price, unitCost: null, channel,
          fairId: fairId || null, itemId: existing?.id ?? null, note: '',
          at: new Date().toISOString(),
        })
      } else {
        db.trades.push({
          id: crypto.randomUUID(), kind: 'verkoop', date, name: clean, category,
          quantity: qty, unitPrice: price, unitCost: cost, channel,
          fairId: fairId || null, itemId: existing?.id ?? null, note: '',
          at: new Date().toISOString(),
          valueAtSale: existing?.unitValue ?? cost,
        })
        if (existing) {
          existing.quantity -= qty
          if (existing.quantity <= 0) db.inventory = db.inventory.filter((i) => i.id !== existing.id)
        }
      }
    })

    setFlash(kind === 'aankoop'
      ? `Gekocht: ${qty}× ${clean} voor ${euro(total)}`
      : `Verkocht: ${qty}× ${clean} voor ${euro(total)} · ${profit >= 0 ? '+' : ''}${euro(profit)} winst`)
    window.setTimeout(() => setFlash(null), 4000)
    reset()
  }

  const accent = kind === 'verkoop' ? SERIES.aqua : STATUS.serious

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        {(['verkoop', 'aankoop'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
            className={`btn flex-1 py-3 text-sm ${
              kind === k
                ? k === 'verkoop'
                  ? 'border-[#199e70]/70 bg-[#199e70]/12 text-[#3ddc84]'
                  : 'border-[#ec835a]/70 bg-[#ec835a]/12 text-[#ec835a]'
                : ''
            }`}>
            {k === 'verkoop' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
            {k === 'verkoop' ? 'Verkocht' : 'Gekocht'}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block lg:col-span-2">
          <span className="label">Wat</span>
          <input
            className="input mt-1 py-2.5" list="voorraad-namen" value={name}
            placeholder="Naam — bestaande items worden herkend"
            onChange={(e) => pickName(e.target.value)} aria-label="Naam"
          />
          <datalist id="voorraad-namen">
            {db.inventory.map((i) => (
              <option key={i.id} value={i.name}>
                {i.quantity} in stock · inkoop {euroSmart(i.unitCost)}
              </option>
            ))}
          </datalist>
        </label>

        <label className="block">
          <span className="label">Aantal</span>
          <input type="number" min="1" className="input num mt-1 py-2.5" value={quantity}
            onChange={(e) => setQuantity(e.target.value)} aria-label="Aantal" />
        </label>

        <label className="block">
          <span className="label">{kind === 'verkoop' ? 'Verkoopprijs per stuk' : 'Inkoopprijs per stuk'}</span>
          <input type="number" step="0.01" className="input num mt-1 py-2.5" value={unitPrice}
            placeholder="0,00" onChange={(e) => setUnitPrice(e.target.value)} aria-label="Prijs per stuk" />
        </label>

        {kind === 'verkoop' && (
          <label className="block">
            <span className="label">Kostprijs per stuk</span>
            <input type="number" step="0.01" className="input num mt-1 py-2.5"
              value={unitCost} placeholder={match ? String(Math.round(match.unitCost * 100) / 100) : '0,00'}
              onChange={(e) => setUnitCost(e.target.value)} aria-label="Kostprijs per stuk" />
          </label>
        )}

        {kind === 'aankoop' && (
          <label className="block">
            <span className="label">Categorie</span>
            <select className="input mt-1 py-2.5" value={category} aria-label="Categorie"
              onChange={(e) => setCategory(e.target.value as ItemCategory)}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.short}</option>)}
            </select>
          </label>
        )}

        <label className="block">
          <span className="label">Kanaal</span>
          <select className="input mt-1 py-2.5" value={channel} aria-label="Kanaal"
            onChange={(e) => setChannel(e.target.value as Channel)}>
            {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="label">Beurs</span>
          <select className="input mt-1 py-2.5" value={fairId} aria-label="Beurs"
            onChange={(e) => setFairId(e.target.value)}>
            <option value="">Geen</option>
            {[...db.fairs].sort((a, b) => b.date.localeCompare(a.date)).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Datum</span>
          <input type="date" className="input mt-1 py-2.5" value={date}
            onChange={(e) => setDate(e.target.value)} aria-label="Datum" />
        </label>
      </div>

      {/* Wat deze boeking doet, voor je hem bevestigt. */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-line bg-panel2/50 px-3 py-2.5">
        <span className="num text-lg font-bold" style={{ color: accent }}>
          {kind === 'verkoop' ? '+' : '−'}{euro(total)}
        </span>
        {kind === 'verkoop' && price > 0 && (
          <span className="num text-sm" style={{ color: profit >= 0 ? STATUS.good : STATUS.critical }}>
            {profit >= 0 ? '+' : ''}{euro(profit)} winst
            {margin !== null && ` · ${Math.round(margin)}% marge`}
          </span>
        )}
        {match && (
          <span className="text-[11px] text-muted">
            {match.quantity} in stock · inkoop {euroSmart(match.unitCost)}
            {kind === 'verkoop' && ` → ${Math.max(0, match.quantity - qty)} over`}
          </span>
        )}
        {!match && name.trim() && kind === 'aankoop' && (
          <span className="text-[11px] text-muted">nieuw item, komt in je inventaris</span>
        )}
        <span className="num ml-auto text-[11px] text-muted">
          cash {euro(money.cash)} → {euro(money.cash + (kind === 'verkoop' ? total : -total))}
          {' · '}voorraad {euro(money.inventory)} → {euro(Math.max(0, money.inventory + inventoryDelta))}
          {' · '}totaal{' '}
          <span style={{ color: totalDelta >= 0 ? STATUS.good : STATUS.critical }}>
            {totalDelta >= 0 ? '+' : ''}{euro(totalDelta)}
          </span>
        </span>
      </div>

      {overSold && (
        <p className="text-sm text-warn">
          ! Je verkoopt er meer dan er in stock liggen ({match!.quantity}). Dat mag — het item verdwijnt
          dan uit je voorraad — maar controleer even of het klopt.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary px-6 py-2.5" type="submit" disabled={!name.trim() || price <= 0}>
          {kind === 'verkoop' ? 'Verkoop boeken' : 'Aankoop boeken'}
        </button>
        {flash && <span className="text-sm" style={{ color: STATUS.good }}>✓ {flash}</span>}
      </div>

      <p className="text-[11px] text-muted">
        Eén boeking werkt je voorraad, je cash, je marges, je maandcijfers en je beursrapport tegelijk bij.
        Koop je iets dat er al ligt, dan wordt je gemiddelde inkoopprijs bijgewerkt.
      </p>
    </form>
  )
}
