import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { formatShort, todayKey } from '../lib/date'
import {
  CATEGORIES, CHANNELS, channelLabel, euro, type Channel, type ItemCategory, type Trade,
} from '../lib/business'
import { tradeMargin, tradeProfit, tradeTotal } from '../lib/businessDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Empty } from './Hud'

const emptyDraft = (date: string) => ({
  kind: 'aankoop' as Trade['kind'],
  date,
  name: '',
  category: 'sealed' as ItemCategory,
  quantity: '1',
  unitPrice: '',
  unitCost: '',
  channel: 'beurs' as Channel,
  fairId: '',
  note: '',
})

/** Losse aan- en verkopen die niet via de inventaris lopen — bv. een grote partij. */
export default function Trades() {
  const { db, update } = useStore()
  const today = todayKey()
  const [draft, setDraft] = useState(() => emptyDraft(today))
  const [filter, setFilter] = useState<'alle' | Trade['kind']>('alle')

  const list = db.trades
    .filter((t) => filter === 'alle' || t.kind === filter)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 60)

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return
    update((db) => {
      db.trades.push({
        id: crypto.randomUUID(),
        kind: draft.kind,
        date: draft.date,
        name: draft.name.trim(),
        category: draft.category,
        quantity: Math.max(1, Number(draft.quantity) || 1),
        unitPrice: Number(draft.unitPrice) || 0,
        unitCost: draft.kind === 'verkoop' && draft.unitCost ? Number(draft.unitCost) : null,
        channel: draft.channel,
        fairId: draft.fairId || null,
        itemId: null,
        note: draft.note.trim(),
      })
    })
    setDraft({ ...emptyDraft(draft.date), kind: draft.kind, channel: draft.channel, fairId: draft.fairId })
  }

  function remove(id: string) {
    update((db) => { db.trades = db.trades.filter((t) => t.id !== id) })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <div className="sm:col-span-3 lg:col-span-4">
          <span className="label mb-1.5 block">Soort</span>
          <div className="flex gap-2">
            {(['aankoop', 'verkoop'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setDraft({ ...draft, kind: k })}
                aria-pressed={draft.kind === k}
                className={`btn flex-1 ${draft.kind === k
                  ? k === 'verkoop' ? 'border-good/60 bg-good/10 text-good' : 'border-serious/60 bg-[#ec835a]/10 text-serious'
                  : ''}`}>
                {k === 'aankoop' ? 'Aankoop' : 'Verkoop'}
              </button>
            ))}
          </div>
        </div>
        <label className="block sm:col-span-2">
          <span className="label">Wat</span>
          <input className="input mt-1" value={draft.name} placeholder="bv. partij Evolving Skies boosters"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Categorie</span>
          <select className="input mt-1" value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value as ItemCategory })}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.short}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Datum</span>
          <input type="date" className="input mt-1" value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Aantal</span>
          <input type="number" min="1" className="input mt-1" value={draft.quantity}
            onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Prijs per stuk (€)</span>
          <input type="number" step="0.01" className="input mt-1" value={draft.unitPrice}
            onChange={(e) => setDraft({ ...draft, unitPrice: e.target.value })} />
        </label>
        {draft.kind === 'verkoop' && (
          <label className="block">
            <span className="label">Kostprijs per stuk (€)</span>
            <input type="number" step="0.01" className="input mt-1" value={draft.unitCost}
              onChange={(e) => setDraft({ ...draft, unitCost: e.target.value })} placeholder="voor de marge" />
          </label>
        )}
        <label className="block">
          <span className="label">Kanaal</span>
          <select className="input mt-1" value={draft.channel}
            onChange={(e) => setDraft({ ...draft, channel: e.target.value as Channel })}>
            {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Beurs</span>
          <select className="input mt-1" value={draft.fairId}
            onChange={(e) => setDraft({ ...draft, fairId: e.target.value })}>
            <option value="">Geen</option>
            {[...db.fairs].sort((a, b) => b.date.localeCompare(a.date)).map((f) => (
              <option key={f.id} value={f.id}>{f.name} ({formatShort(f.date)})</option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="label">Notitie</span>
          <input className="input mt-1" value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </label>
        <div className="flex items-end sm:col-span-3 lg:col-span-4">
          <button className="btn-primary" type="submit">
            {draft.kind === 'aankoop' ? 'Aankoop boeken' : 'Verkoop boeken'}
          </button>
          <span className="num ml-3 self-center text-xs text-muted">
            totaal {euro((Number(draft.quantity) || 0) * (Number(draft.unitPrice) || 0))}
          </span>
        </div>
      </form>

      <div className="flex items-center gap-2 border-t border-line/60 pt-3">
        <span className="label">Geschiedenis</span>
        <select className="input ml-auto w-auto py-1 text-xs" value={filter}
          onChange={(e) => setFilter(e.target.value as 'alle' | Trade['kind'])} aria-label="Filter">
          <option value="alle">Alles</option>
          <option value="verkoop">Alleen verkopen</option>
          <option value="aankoop">Alleen aankopen</option>
        </select>
      </div>

      {list.length === 0 ? (
        <Empty>Nog geen transacties geboekt.</Empty>
      ) : (
        <ul className="space-y-1">
          {list.map((t) => {
            const profit = tradeProfit(t)
            const margin = tradeMargin(t)
            const fair = db.fairs.find((f) => f.id === t.fairId)
            return (
              <li key={t.id} className="group flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-line/30">
                <span className="h-6 w-1 shrink-0 rounded-full"
                  style={{ background: t.kind === 'verkoop' ? STATUS.good : STATUS.serious }} aria-hidden />
                <span className="num w-11 shrink-0 text-[11px] text-muted">{formatShort(t.date)}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {t.quantity}× {t.name}
                  <span className="text-muted"> · {fair ? fair.name : channelLabel(t.channel)}</span>
                </span>
                <span className="num shrink-0 text-sm" style={{ color: t.kind === 'verkoop' ? SERIES.aqua : undefined }}>
                  {t.kind === 'aankoop' ? '−' : '+'}{euro(tradeTotal(t))}
                </span>
                <span className="num w-24 shrink-0 text-right text-[11px]"
                  style={{ color: profit === null ? undefined : profit >= 0 ? STATUS.good : STATUS.critical }}>
                  {profit === null ? '' : `${profit >= 0 ? '+' : ''}${euro(profit)}${margin === null ? '' : ` · ${Math.round(margin)}%`}`}
                </span>
                <button onClick={() => remove(t.id)} aria-label="Transactie verwijderen"
                  className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                  <Trash2 size={13} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
