import { useState } from 'react'
import { AlertTriangle, Download, RotateCcw } from 'lucide-react'
import { useStore } from '../lib/store'
import { APP_START } from '../lib/appStart'
import { emptyDatabase } from '../lib/types'
import { keepBackup, readBackup, RESET_ID, wipe, type ResetScope } from '../lib/reset'
import { formatLong, todayKey } from '../lib/date'
import { STATUS } from '../lib/palette'

const SCOPES: { id: ResetScope; label: string; keeps: string; wipes: string }[] = [
  {
    id: 'logboek',
    label: 'Alleen mijn logboek',
    keeps: 'Je vakken, lesrooster, inventaris, doelen, boeken en de Shopify-koppeling blijven staan.',
    wipes: 'Weg: afgevinkte dagen, 75 Hard, taken, trainingssessies, stationstijden, transacties, beurzen, leessessies en vermogensmetingen.',
  },
  {
    id: 'alles',
    label: 'Alles',
    keeps: 'Alleen je aanmelding en je Supabase-verbinding blijven staan.',
    wipes: 'Weg: werkelijk alles wat je ooit invulde, inclusief je inventaris, vakken, documenten, projecten, presentaties en boeken.',
  },
]

function download(json: string, name: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Opnieuw beginnen. Onomkeerbaar, dus met een backup vooraf en een woord dat
 * je moet uittypen — een verkeerde klik mag hier niet volstaan. Bovenaan staat
 * wat de automatische schoonmaak van 1 september opzij zette.
 */
export default function ResetPanel() {
  const { db, update, exportJson } = useStore()
  const [scope, setScope] = useState<ResetScope>('alles')
  const [confirm, setConfirm] = useState('')
  const [backedUp, setBackedUp] = useState(false)
  const [done, setDone] = useState(false)
  const [restored, setRestored] = useState(false)

  const chosen = SCOPES.find((s) => s.id === scope)!
  const ready = confirm.trim().toUpperCase() === 'WISSEN'
  const old = readBackup()

  function reset() {
    if (!ready) return
    keepBackup(db)
    update((draft) => {
      wipe(draft, scope)
      draft.settings.resetDone = RESET_ID
    })
    setDone(true)
    setConfirm('')
  }

  function restore() {
    const backup = readBackup()
    if (!backup) return
    update((draft) => {
      Object.assign(draft, { ...emptyDatabase(), ...backup })
      draft.settings.resetDone = RESET_ID
    })
    setRestored(true)
    setDone(false)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Alles begint te tellen vanaf <span className="text-ink">{formatLong(APP_START)}</span>.
        Bij deze versie is je oude invoer automatisch gewist, zodat je met een schone lei start.
      </p>

      {old && (
        <div className="rounded-md border border-line p-3">
          <p className="text-sm text-ink">Je vorige gegevens zijn bewaard</p>
          <p className="mt-1 text-[11px] text-muted">
            De stand van vlak voor het wissen staat nog op dit toestel. Je kan ze downloaden,
            of ze in één klik terugzetten als er toch iets bij moest blijven.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button className="btn py-1.5 text-xs"
              onClick={() => download(JSON.stringify(old, null, 2), `noa-oude-gegevens-${todayKey()}.json`)}>
              <Download size={13} /> Downloaden
            </button>
            <button className="btn py-1.5 text-xs" onClick={restore}>
              <RotateCcw size={13} /> Terugzetten
            </button>
          </div>
          {restored && (
            <p className="mt-1.5 text-[11px]" style={{ color: STATUS.good }}>
              ✓ Teruggezet. Alles staat weer zoals het stond.
            </p>
          )}
        </div>
      )}

      {done && (
        <p className="text-sm" style={{ color: STATUS.good }}>
          ✓ Gewist. Zet je 75 Hard-startdatum opnieuw bij het tabblad 75 Hard, en je cash en
          voorraad bij Voorraad.
        </p>
      )}

      <p className="text-sm text-muted">Wil je later opnieuw beginnen, dan doe je dat hier.</p>

      <div className="grid gap-2 sm:grid-cols-2">
        {SCOPES.map((s) => (
          <button key={s.id} type="button" onClick={() => setScope(s.id)} aria-pressed={scope === s.id}
            className={`rounded-md border p-3 text-left transition ${
              scope === s.id ? 'border-accent/60 bg-accent/5' : 'border-line hover:border-accent/40'
            }`}>
            <span className="block text-sm text-ink">{s.label}</span>
            <span className="mt-1 block text-[11px] text-muted">{s.wipes}</span>
            <span className="mt-1 block text-[11px]" style={{ color: STATUS.good }}>{s.keeps}</span>
          </button>
        ))}
      </div>

      <div className="rounded-md border border-warn/40 bg-warn/5 p-3">
        <p className="flex items-start gap-2 text-sm text-warn">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
          Dit kan niet ongedaan gemaakt worden. Ook op je gsm is het weg zodra hij synchroniseert.
        </p>
        <button className="btn mt-2 py-1.5 text-xs"
          onClick={() => { download(exportJson(), `noa-backup-voor-reset-${todayKey()}.json`); setBackedUp(true) }}>
          <Download size={13} /> {backedUp ? 'Nog een backup downloaden' : 'Eerst een backup downloaden'}
        </button>
        {backedUp && (
          <p className="mt-1.5 text-[11px]" style={{ color: STATUS.good }}>
            ✓ Bewaard. Met "Importeer backup" hierboven zet je alles terug als je je bedenkt.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input w-48" value={confirm} onChange={(e) => setConfirm(e.target.value)}
          placeholder="Typ WISSEN" aria-label="Typ WISSEN om te bevestigen"
        />
        <button
          className="btn border-bad/60 text-bad hover:border-bad disabled:opacity-40"
          disabled={!ready} onClick={reset}>
          {chosen.label.toLowerCase()} wissen
        </button>
        <span className="text-[11px] text-muted">
          {db.tasks.length + Object.keys(db.days).length + db.trades.length} regels worden geraakt
        </span>
      </div>
    </div>
  )
}
