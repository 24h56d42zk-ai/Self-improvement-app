import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { formatShort, todayKey } from '../lib/date'
import { latestNetWorth, netWorthSeries } from '../lib/derive'
import { inventoryTotals } from '../lib/businessDerive'
import { Empty, Panel } from '../components/Hud'
import CloudSetup from '../components/CloudSetup'
import ResetPanel from '../components/ResetPanel'
import { SERIES } from '../lib/palette'

const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`

export default function Instellingen() {
  const { db, update, setSettings, exportJson, importJson, cloudConfigured, email, signOut, sync, syncError } = useStore()
  const today = todayKey()
  const last = latestNetWorth(db)
  const liveInventory = inventoryTotals(db.inventory).value
  const series = netWorthSeries(db)
  const fileRef = useRef<HTMLInputElement>(null)

  const [cash, setCash] = useState(String(last.cash || ''))
  const [inventory, setInventory] = useState(String(last.inventory || ''))
  const [date, setDate] = useState(today)
  const [note, setNote] = useState('')
  const [importError, setImportError] = useState<string | null>(null)

  function addSnapshot(e: React.FormEvent) {
    e.preventDefault()
    const c = Number(cash) || 0
    const i = Number(inventory) || 0
    update((draft) => {
      const existing = draft.netWorth.find((s) => s.date === date)
      if (existing) Object.assign(existing, { cash: c, inventory: i, note })
      else draft.netWorth.push({ id: crypto.randomUUID(), date, cash: c, inventory: i, note })
    })
    setNote('')
  }

  function removeSnapshot(id: string) {
    update((draft) => { draft.netWorth = draft.netWorth.filter((s) => s.id !== id) })
  }

  function download() {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `noa-dashboard-${today}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError(null)
    try {
      importJson(await file.text())
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Importeren mislukt')
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-4">
      <h1 className="num text-2xl font-bold text-ink">Instellingen</h1>

      <Panel hud title="Vermogen bijwerken" accent={SERIES.aqua}>
        <p className="mb-3 text-sm text-muted">
          Elke meting is één punt op de grafiek. Werk je voorraad bij na een beurs of een grote aankoop —
          voorraad zonder verse cijfers is een gok.
        </p>
        <form onSubmit={addSnapshot} className="grid gap-3 sm:grid-cols-4">
          <label className="block">
            <span className="label">Datum</span>
            <input type="date" className="input mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Cash (€)</span>
            <input type="number" inputMode="decimal" className="input mt-1" value={cash}
              onChange={(e) => setCash(e.target.value)} placeholder="0" />
          </label>
          <label className="block">
            <span className="label">Voorraad (€)</span>
            <input type="number" inputMode="decimal" className="input mt-1" value={inventory}
              onChange={(e) => setInventory(e.target.value)} placeholder="50000" />
          </label>
          <label className="block">
            <span className="label">Notitie</span>
            <input className="input mt-1" value={note} onChange={(e) => setNote(e.target.value)} placeholder="bv. na beurs" />
          </label>
          <div className="sm:col-span-4 flex flex-wrap items-center gap-3">
            <button className="btn-primary" type="submit">Meting opslaan</button>
            {liveInventory > 0 && (
              <button className="btn" type="button" onClick={() => setInventory(String(Math.round(liveInventory)))}>
                Neem inventariswaarde over ({euro(liveInventory)})
              </button>
            )}
            <span className="num text-xs text-muted">
              totaal {euro((Number(cash) || 0) + (Number(inventory) || 0))}
            </span>
          </div>
        </form>

        <div className="mt-4 border-t border-line/60 pt-3">
          {series.length === 0 ? (
            <Empty>Nog geen metingen.</Empty>
          ) : (
            <ul className="space-y-1">
              {[...db.netWorth].sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
                <li key={s.id} className="group flex items-center gap-3 rounded px-1.5 py-1 text-sm hover:bg-line/30">
                  <span className="num w-12 shrink-0 text-[11px] text-muted">{formatShort(s.date)}</span>
                  <span className="num" style={{ color: SERIES.blue }}>{euro(s.cash)}</span>
                  <span className="num" style={{ color: SERIES.aqua }}>{euro(s.inventory)}</span>
                  <span className="num font-medium text-ink">{euro(s.cash + s.inventory)}</span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted">{s.note}</span>
                  <button className="shrink-0 text-[11px] text-muted opacity-0 group-hover:opacity-100 hover:text-bad"
                    onClick={() => removeSnapshot(s.id)}>verwijder</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel title="75 Hard">
        <div className="flex flex-wrap items-center gap-3">
          <label className="block">
            <span className="label">Startdatum</span>
            <input type="date" className="input mt-1 w-auto" value={db.settings.hard75Start ?? ''}
              onChange={(e) => setSettings({ hard75Start: e.target.value || null })} />
          </label>
          <button className="btn self-end" onClick={() => setSettings({ hard75Start: null })}>Wissen</button>
        </div>
      </Panel>

      <Panel title="Weergave">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-[#22d3ee]"
            checked={db.settings.calmMode} onChange={(e) => setSettings({ calmMode: e.target.checked })} />
          Rustige modus — zet animaties en gloed uit (sneltoets: <span className="num">r</span>)
        </label>
      </Panel>

      <Panel title="Opnieuw beginnen">
        <ResetPanel />
      </Panel>

      <Panel title="Opslag en backup">
        <p className="text-sm text-muted">
          {cloudConfigured
            ? <>Cloud actief{email ? <> als <span className="num text-ink">{email}</span></> : null}. Status: <span className="num text-ink">{sync}</span>.</>
            : <>Deze app draait nu <span className="text-ink">alleen lokaal in deze browser</span> — geen sync tussen laptop en gsm.</>}
        </p>
        <div className="mt-4 border-t border-line/60 pt-4">
          <h3 className="label mb-2">Verbinding met Supabase</h3>
          <CloudSetup compact />
        </div>
        {syncError && <p className="mt-2 text-sm text-bad">✕ {syncError}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn" onClick={download}>Exporteer alles (.json)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importeer backup</button>
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onFile} />
          {cloudConfigured && email && <button className="btn" onClick={() => void signOut()}>Afmelden</button>}
        </div>
        {importError && <p className="mt-2 text-sm text-bad">✕ {importError}</p>}
      </Panel>
    </div>
  )
}
