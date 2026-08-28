import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { formatShort, todayKey } from '../lib/date'
import {
  CATEGORIES, CHANNELS, euro, euroSmart, type Channel, type InventoryItem, type ItemCategory,
} from '../lib/business'
import { daysInStock, inventoryTotals, itemCost, itemValue } from '../lib/businessDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Empty } from './Hud'

type Sort = 'waarde' | 'naam' | 'stock' | 'winst'

const emptyDraft = (date: string) => ({
  name: '', set: '', category: 'sealed' as ItemCategory, grade: '',
  quantity: '1', unitCost: '', unitValue: '', buyDate: date, note: '',
})

export default function Inventory() {
  const { db, update } = useStore()
  const today = todayKey()
  const [draft, setDraft] = useState(() => emptyDraft(today))
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<ItemCategory | 'alle'>('alle')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('waarde')
  const [selling, setSelling] = useState<string | null>(null)

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = db.inventory.filter((i) =>
      (filter === 'alle' || i.category === filter) &&
      (q === '' || `${i.name} ${i.set} ${i.grade}`.toLowerCase().includes(q)))
    return list.sort((a, b) => {
      if (sort === 'naam') return a.name.localeCompare(b.name)
      if (sort === 'stock') return daysInStock(b, today) - daysInStock(a, today)
      if (sort === 'winst') return (itemValue(b) - itemCost(b)) - (itemValue(a) - itemCost(a))
      return itemValue(b) - itemValue(a)
    })
  }, [db.inventory, filter, query, sort, today])

  const totals = inventoryTotals(items)

  function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return
    const item: InventoryItem = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      set: draft.set.trim(),
      category: draft.category,
      grade: draft.grade.trim(),
      quantity: Math.max(1, Number(draft.quantity) || 1),
      unitCost: Number(draft.unitCost) || 0,
      unitValue: Number(draft.unitValue) || Number(draft.unitCost) || 0,
      buyDate: draft.buyDate,
      valueUpdated: today,
      note: draft.note.trim(),
    }
    update((db) => {
      db.inventory.push(item)
      // Een toevoeging is ook een aankoop: zo klopt je cash zonder dubbel invoeren.
      db.trades.push({
        id: crypto.randomUUID(),
        kind: 'aankoop',
        date: item.buyDate,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unitPrice: item.unitCost,
        unitCost: null,
        channel: 'beurs',
        fairId: null,
        itemId: item.id,
        note: 'toegevoegd aan inventaris',
      })
    })
    setDraft(emptyDraft(today))
    setAdding(false)
  }

  function setValue(id: string, raw: string) {
    const v = Number(raw)
    if (!Number.isFinite(v)) return
    update((db) => {
      const item = db.inventory.find((i) => i.id === id)
      if (item) { item.unitValue = v; item.valueUpdated = today }
    })
  }

  function removeItem(id: string) {
    update((db) => { db.inventory = db.inventory.filter((i) => i.id !== id) })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Marktwaarde', value: euro(totals.value), color: SERIES.aqua },
          { label: 'Ingekocht voor', value: euro(totals.cost), color: undefined },
          {
            label: 'Ongerealiseerde winst',
            value: euro(totals.unrealised),
            color: totals.unrealised >= 0 ? STATUS.good : STATUS.critical,
          },
          { label: 'Stuks / regels', value: `${totals.units} / ${totals.lines}`, color: undefined },
        ].map((s) => (
          <div key={s.label} className="panel p-3">
            <div className="label truncate">{s.label}</div>
            <div className="num mt-1 text-xl font-bold" style={s.color ? { color: s.color } : undefined}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input className="input w-auto flex-1 min-w-[180px]" placeholder="Zoeken op naam, set of grade…"
          value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Zoeken" />
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value as ItemCategory | 'alle')}
          aria-label="Categorie">
          <option value="alle">Alle categorieën</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.short}</option>)}
        </select>
        <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sorteren">
          <option value="waarde">Hoogste waarde</option>
          <option value="winst">Meeste winst</option>
          <option value="stock">Langst in stock</option>
          <option value="naam">Naam</option>
        </select>
        <button className="btn-primary" onClick={() => setAdding(!adding)}>
          <Plus size={15} /> Item
        </button>
      </div>

      {adding && (
        <form onSubmit={addItem} className="panel grid gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4">
          <label className="block sm:col-span-2">
            <span className="label">Naam</span>
            <input className="input mt-1" value={draft.name} autoFocus
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Charizard ex" />
          </label>
          <label className="block">
            <span className="label">Set</span>
            <input className="input mt-1" value={draft.set}
              onChange={(e) => setDraft({ ...draft, set: e.target.value })} placeholder="Surging Sparks" />
          </label>
          <label className="block">
            <span className="label">Categorie</span>
            <select className="input mt-1" value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as ItemCategory })}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.short}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Grade / conditie</span>
            <input className="input mt-1" value={draft.grade}
              onChange={(e) => setDraft({ ...draft, grade: e.target.value })} placeholder="PSA 10" />
          </label>
          <label className="block">
            <span className="label">Aantal</span>
            <input type="number" min="1" className="input mt-1" value={draft.quantity}
              onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Inkoop per stuk (€)</span>
            <input type="number" step="0.01" className="input mt-1" value={draft.unitCost}
              onChange={(e) => setDraft({ ...draft, unitCost: e.target.value })} placeholder="120" />
          </label>
          <label className="block">
            <span className="label">Marktwaarde per stuk (€)</span>
            <input type="number" step="0.01" className="input mt-1" value={draft.unitValue}
              onChange={(e) => setDraft({ ...draft, unitValue: e.target.value })} placeholder="150" />
          </label>
          <label className="block">
            <span className="label">Aankoopdatum</span>
            <input type="date" className="input mt-1" value={draft.buyDate}
              onChange={(e) => setDraft({ ...draft, buyDate: e.target.value })} />
          </label>
          <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-4">
            <button className="btn-primary" type="submit">Toevoegen</button>
            <button className="btn" type="button" onClick={() => setAdding(false)}>Annuleren</button>
            <span className="text-[11px] text-muted">
              Toevoegen boekt meteen een aankoop, zodat je cash klopt.
            </span>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <Empty>Nog geen items. Voeg je grootste posities eerst toe — die bepalen je waarde toch.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-separate border-spacing-y-1 text-sm">
            <thead>
              <tr className="text-left">
                {['Item', 'Cat.', 'Aantal', 'Inkoop/st', 'Waarde/st', 'Totaal', 'Ongerealiseerd', 'In stock', ''].map((h) => (
                  <th key={h} className="label pb-1 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const gain = itemValue(i) - itemCost(i)
                const days = daysInStock(i, today)
                return (
                  <tr key={i.id} className="group bg-panel2/40">
                    <td className="rounded-l-md px-3 py-2">
                      <span className="block truncate text-ink">{i.name}</span>
                      <span className="text-[10px] text-muted">
                        {[i.set, i.grade].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-[11px] text-muted">{CATEGORIES.find((c) => c.id === i.category)?.short}</td>
                    <td className="num px-2 py-2">{i.quantity}</td>
                    <td className="num px-2 py-2 text-muted">{euroSmart(i.unitCost)}</td>
                    <td className="px-2 py-2">
                      <input className="input num w-24 px-2 py-1 text-xs" defaultValue={i.unitValue}
                        aria-label={`Marktwaarde ${i.name}`} onBlur={(e) => setValue(i.id, e.target.value)} />
                    </td>
                    <td className="num px-2 py-2 font-medium" style={{ color: SERIES.aqua }}>{euro(itemValue(i))}</td>
                    <td className="num px-2 py-2" style={{ color: gain >= 0 ? STATUS.good : STATUS.critical }}>
                      {gain >= 0 ? '+' : ''}{euro(gain)}
                    </td>
                    <td className="num px-2 py-2 text-[11px]" style={{ color: days >= 90 ? STATUS.serious : undefined }}>
                      {days}d
                    </td>
                    <td className="rounded-r-md px-2 py-2">
                      <div className="flex justify-end gap-1">
                        <button className="btn px-2 py-1 text-xs" onClick={() => setSelling(selling === i.id ? null : i.id)}>
                          Verkoop
                        </button>
                        <button onClick={() => removeItem(i.id)} aria-label={`${i.name} verwijderen`}
                          className="shrink-0 px-1 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selling && <SellForm itemId={selling} onDone={() => setSelling(null)} />}

      <p className="text-[11px] text-muted">
        De marktwaarde pas je hier per item aan; elke wijziging zet meteen de datum van bijwerken.
        Items die 90 dagen of langer stilliggen kleuren oranje — dat is geld dat niet werkt.
      </p>
    </div>
  )
}

/* ── Verkopen vanuit de inventaris ──────────────────────────────────────── */

function SellForm({ itemId, onDone }: { itemId: string; onDone: () => void }) {
  const { db, update } = useStore()
  const today = todayKey()
  const item = db.inventory.find((i) => i.id === itemId)
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState(() => String(item?.unitValue ?? ''))
  const [channel, setChannel] = useState<Channel>('beurs')
  const [fairId, setFairId] = useState('')
  const [date, setDate] = useState(today)

  if (!item) return null
  const quantity = Math.min(item.quantity, Math.max(1, Number(qty) || 1))
  const unitPrice = Number(price) || 0
  const profit = quantity * (unitPrice - item.unitCost)

  function sell(e: React.FormEvent) {
    e.preventDefault()
    update((db) => {
      db.trades.push({
        id: crypto.randomUUID(),
        kind: 'verkoop',
        date,
        name: item!.name,
        category: item!.category,
        quantity,
        unitPrice,
        unitCost: item!.unitCost,
        channel,
        fairId: fairId || null,
        itemId: item!.id,
        note: '',
        at: new Date().toISOString(),
        valueAtSale: item!.unitValue,
      })
      const target = db.inventory.find((i) => i.id === item!.id)
      if (target) {
        target.quantity -= quantity
        if (target.quantity <= 0) db.inventory = db.inventory.filter((i) => i.id !== item!.id)
      }
    })
    onDone()
  }

  return (
    <form onSubmit={sell} className="panel-hud grid gap-3 p-3 sm:grid-cols-3 lg:grid-cols-6">
      <div className="sm:col-span-3 lg:col-span-6">
        <span className="label">Verkopen</span>
        <p className="text-sm text-ink">{item.name} <span className="text-muted">· {item.quantity} in stock · inkoop {euroSmart(item.unitCost)}/st</span></p>
      </div>
      <label className="block">
        <span className="label">Aantal</span>
        <input type="number" min="1" max={item.quantity} className="input mt-1" value={qty}
          onChange={(e) => setQty(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Prijs per stuk (€)</span>
        <input type="number" step="0.01" className="input mt-1" value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Kanaal</span>
        <select className="input mt-1" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
          {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="label">Beurs</span>
        <select className="input mt-1" value={fairId} onChange={(e) => setFairId(e.target.value)}>
          <option value="">Geen</option>
          {[...db.fairs].sort((a, b) => b.date.localeCompare(a.date)).map((f) => (
            <option key={f.id} value={f.id}>{f.name} ({formatShort(f.date)})</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="label">Datum</span>
        <input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="flex items-end gap-2">
        <button className="btn-primary" type="submit">Verkoop boeken</button>
        <button className="btn" type="button" onClick={onDone}>Annuleren</button>
      </div>
      <p className="num text-xs sm:col-span-3 lg:col-span-6"
        style={{ color: profit >= 0 ? STATUS.good : STATUS.critical }}>
        Winst op deze verkoop: {profit >= 0 ? '+' : ''}{euro(profit)}
        {unitPrice > 0 && ` · marge ${Math.round((profit / (quantity * unitPrice)) * 100)}%`}
      </p>
    </form>
  )
}
