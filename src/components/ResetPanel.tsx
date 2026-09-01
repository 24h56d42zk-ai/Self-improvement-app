import { useState } from 'react'
import { AlertTriangle, Download } from 'lucide-react'
import { useStore } from '../lib/store'
import { APP_START } from '../lib/appStart'
import { emptyDatabase } from '../lib/types'
import { formatLong, todayKey } from '../lib/date'
import { STATUS } from '../lib/palette'

type Scope = 'logboek' | 'alles'

const SCOPES: { id: Scope; label: string; keeps: string; wipes: string }[] = [
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

/**
 * Opnieuw beginnen. Onomkeerbaar, dus met een backup vooraf en een woord dat
 * je moet uittypen — een verkeerde klik mag hier niet volstaan.
 */
export default function ResetPanel() {
  const { db, update, exportJson } = useStore()
  const [scope, setScope] = useState<Scope>('logboek')
  const [confirm, setConfirm] = useState('')
  const [backedUp, setBackedUp] = useState(false)
  const [done, setDone] = useState(false)

  const chosen = SCOPES.find((s) => s.id === scope)!
  const ready = confirm.trim().toUpperCase() === 'WISSEN'

  function download() {
    const blob = new Blob([exportJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `noa-backup-voor-reset-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackedUp(true)
  }

  function reset() {
    if (!ready) return
    update((draft) => {
      const fresh = emptyDatabase()

      // Wat je opnieuw wil opbouwen, gaat altijd leeg.
      draft.days = {}
      draft.tasks = []
      draft.netWorth = []
      draft.sessionLogs = []
      draft.stations = []
      draft.stationTargets = fresh.stationTargets
      draft.trades = []
      draft.fairs = []
      draft.reading = []
      draft.shopifyImported = []
      draft.shopifySyncedAt = null
      draft.settings.hard75Start = null
      draft.settings.hard75Attempt = 1
      draft.settings.bootSeen = null

      if (scope === 'alles') {
        draft.inventory = []
        draft.subjects = []
        draft.notes = []
        draft.projects = []
        draft.presentations = []
        draft.books = []
        draft.goals = []
        draft.lessons = []
        draft.bookGoal = fresh.bookGoal
      }
    })
    setDone(true)
    setConfirm('')
  }

  if (done) {
    return (
      <div className="space-y-2">
        <p className="text-sm" style={{ color: STATUS.good }}>
          ✓ Gewist. Je begint opnieuw vanaf {formatLong(APP_START)}.
        </p>
        <p className="text-[11px] text-muted">
          Zet je 75 Hard-startdatum opnieuw bij het tabblad 75 Hard, en je cash en voorraad
          bij Voorraad. Daarna staat alles klaar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Alles begint te tellen vanaf <span className="text-ink">{formatLong(APP_START)}</span>.
        Wil je met een schone lei beginnen, wis dan hieronder wat je hebt ingevuld.
      </p>

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
        <button className="btn mt-2 py-1.5 text-xs" onClick={download}>
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
