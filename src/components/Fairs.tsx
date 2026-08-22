import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { formatLong, todayKey } from '../lib/date'
import { euro, type Fair } from '../lib/business'
import { fairReports } from '../lib/businessDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Empty, Panel } from './Hud'

const emptyDraft = (date: string) => ({
  name: '', date, location: '', standCost: '', travelCost: '', otherCost: '', hours: '', note: '',
})

export default function Fairs() {
  const { db, update } = useStore()
  const today = todayKey()
  const [draft, setDraft] = useState(() => emptyDraft(today))
  const [adding, setAdding] = useState(false)

  const reports = fairReports(db).reverse()

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.name.trim()) return
    const fair: Fair = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      date: draft.date,
      location: draft.location.trim(),
      standCost: Number(draft.standCost) || 0,
      travelCost: Number(draft.travelCost) || 0,
      otherCost: Number(draft.otherCost) || 0,
      hours: draft.hours ? Number(draft.hours) : null,
      note: draft.note.trim(),
    }
    update((db) => { db.fairs.push(fair) })
    setDraft(emptyDraft(today))
    setAdding(false)
  }

  function remove(id: string) {
    update((db) => {
      db.fairs = db.fairs.filter((f) => f.id !== id)
      for (const t of db.trades) if (t.fairId === id) t.fairId = null
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Zet de beurs eerst aan, koppel er daarna je verkopen aan. Het rapport rekent zichzelf uit.
        </p>
        <button className="btn-primary shrink-0" onClick={() => setAdding(!adding)}>
          <Plus size={15} /> Beurs
        </button>
      </div>

      {adding && (
        <form onSubmit={add} className="panel grid gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4">
          <label className="block sm:col-span-2">
            <span className="label">Naam</span>
            <input className="input mt-1" value={draft.name} autoFocus placeholder="Pokébeurs Antwerpen"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Datum</span>
            <input type="date" className="input mt-1" value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Plaats</span>
            <input className="input mt-1" value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Standhuur (€)</span>
            <input type="number" step="0.01" className="input mt-1" value={draft.standCost}
              onChange={(e) => setDraft({ ...draft, standCost: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Transport (€)</span>
            <input type="number" step="0.01" className="input mt-1" value={draft.travelCost}
              onChange={(e) => setDraft({ ...draft, travelCost: e.target.value })} />
          </label>
          <label className="block">
            <span className="label">Overige kosten (€)</span>
            <input type="number" step="0.01" className="input mt-1" value={draft.otherCost}
              onChange={(e) => setDraft({ ...draft, otherCost: e.target.value })} placeholder="eten, parking" />
          </label>
          <label className="block">
            <span className="label">Uren op de beurs</span>
            <input type="number" step="0.5" className="input mt-1" value={draft.hours}
              onChange={(e) => setDraft({ ...draft, hours: e.target.value })} placeholder="8" />
          </label>
          <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-4">
            <button className="btn-primary" type="submit">Beurs opslaan</button>
            <button className="btn" type="button" onClick={() => setAdding(false)}>Annuleren</button>
          </div>
        </form>
      )}

      {reports.length === 0 ? (
        <Empty>Nog geen beurzen. Voeg je eerstvolgende toe, dan kan je er meteen verkopen aan koppelen.</Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {reports.map((r) => (
            <Panel key={r.fair.id} hud title={r.fair.name}
              right={
                <button onClick={() => remove(r.fair.id)} aria-label="Beurs verwijderen"
                  className="text-muted hover:text-bad"><Trash2 size={13} /></button>
              }>
              <p className="mb-3 text-[11px] text-muted">
                {formatLong(r.fair.date)}{r.fair.location && ` · ${r.fair.location}`}
                {r.fair.hours && ` · ${r.fair.hours} uur`}
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Omzet', value: euro(r.revenue), color: SERIES.aqua },
                  { label: 'Kosten', value: euro(r.costs), color: STATUS.serious },
                  {
                    label: 'Netto winst', value: `${r.netProfit >= 0 ? '+' : ''}${euro(r.netProfit)}`,
                    color: r.netProfit >= 0 ? STATUS.good : STATUS.critical,
                  },
                  { label: 'Marge', value: r.margin === null ? '—' : `${Math.round(r.margin)}%`, color: undefined },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="label truncate">{s.label}</div>
                    <div className="num mt-0.5 text-lg font-bold" style={s.color ? { color: s.color } : undefined}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>

              <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line/60 pt-3 text-[11px] text-muted sm:grid-cols-3">
                <li>Transacties <span className="num text-ink">{r.transactions}</span></li>
                <li>Stuks <span className="num text-ink">{r.unitsSold}</span></li>
                <li>Gem. verkoop <span className="num text-ink">{r.avgSale === null ? '—' : euro(r.avgSale)}</span></li>
                <li>Winst/uur <span className="num text-ink">{r.profitPerHour === null ? '—' : euro(r.profitPerHour)}</span></li>
                <li>Ingekocht <span className="num text-ink">{euro(r.purchases)}</span></li>
                <li>Bruto winst <span className="num text-ink">{euro(r.grossProfit)}</span></li>
              </ul>

              {r.best.length > 0 && (
                <div className="mt-3 border-t border-line/60 pt-3">
                  <div className="label mb-1.5">Best verkocht</div>
                  <ul className="space-y-1">
                    {r.best.map((b) => (
                      <li key={b.name} className="flex items-center gap-2 text-sm">
                        <span className="num w-6 shrink-0 text-[11px] text-muted">{b.units}×</span>
                        <span className="min-w-0 flex-1 truncate text-ink">{b.name}</span>
                        <span className="num shrink-0" style={{ color: SERIES.aqua }}>{euro(b.revenue)}</span>
                        {b.profit !== null && (
                          <span className="num w-16 shrink-0 text-right text-[11px]"
                            style={{ color: b.profit >= 0 ? STATUS.good : STATUS.critical }}>
                            {b.profit >= 0 ? '+' : ''}{euro(b.profit)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {r.transactions === 0 && (
                <p className="mt-3 text-[11px] text-muted">
                  Nog geen verkopen gekoppeld. Boek ze bij Inventaris (knop Verkoop) of bij Transacties,
                  en kies deze beurs.
                </p>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}
