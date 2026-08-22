import { useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../lib/store'
import { formatShort, todayKey } from '../lib/date'
import { STATIONS, formatSeconds, parseSeconds, type StationId } from '../lib/training'
import { stationScores } from '../lib/trainingDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Bar } from './Hud'

/** Per station: je beste tijd, je doeltijd, en een invoerveld voor een nieuwe meting. */
export default function Stations() {
  const { db, update } = useStore()
  const scores = stationScores(db)
  const [entry, setEntry] = useState<Record<string, string>>({})
  const [date, setDate] = useState(todayKey())
  const [error, setError] = useState<string | null>(null)

  function addResult(stationId: StationId) {
    const seconds = parseSeconds(entry[stationId] ?? '')
    if (seconds === null) {
      setError('Gebruik mm:ss, bijvoorbeeld 4:15.')
      return
    }
    setError(null)
    update((db) => {
      db.stations.push({ id: crypto.randomUUID(), stationId, date, seconds, note: '' })
    })
    setEntry({ ...entry, [stationId]: '' })
  }

  function setTarget(stationId: StationId, raw: string) {
    const seconds = parseSeconds(raw)
    if (seconds === null) return
    update((db) => { db.stationTargets[stationId] = seconds })
  }

  function removeResult(id: string) {
    update((db) => { db.stations = db.stations.filter((r) => r.id !== id) })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">Datum van de meting</span>
          <input type="date" className="input mt-1 w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <p className="text-xs text-muted">
          Doeltijden zijn een startpunt — zet ze op wat jij op 19 september wil neerzetten.
        </p>
      </div>
      {error && <p className="text-sm text-bad">✕ {error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-left">
              <th className="label pb-1 font-normal">Station</th>
              <th className="label pb-1 font-normal">Beste</th>
              <th className="label pb-1 font-normal">Doel</th>
              <th className="label pb-1 font-normal">Tegenover doel</th>
              <th className="label pb-1 font-normal">Nieuwe tijd</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => {
              const st = STATIONS.find((x) => x.id === s.id)!
              const onTarget = s.measured && s.score >= 100
              return (
                <tr key={s.id} className="bg-panel2/40">
                  <td className="rounded-l-md px-3 py-2">
                    <span className="block text-ink">{st.label}</span>
                    <span className="num text-[10px] text-muted">{st.spec}</span>
                  </td>
                  <td className="num px-3 py-2" style={{ color: s.measured ? SERIES.orange : undefined }}>
                    {s.best === null ? <span className="text-muted">—</span> : formatSeconds(s.best)}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      className="input num w-20 px-2 py-1 text-xs" defaultValue={formatSeconds(s.target)}
                      aria-label={`Doeltijd ${st.label}`}
                      onBlur={(e) => setTarget(s.id, e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {s.measured ? (
                      <div className="flex items-center gap-2">
                        <span className="w-24"><Bar value={Math.min(s.score, 130)} max={130}
                          color={onTarget ? STATUS.good : STATUS.serious} /></span>
                        <span className="num text-xs" style={{ color: onTarget ? STATUS.good : STATUS.serious }}>
                          {s.score}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">niet getest</span>
                    )}
                  </td>
                  <td className="rounded-r-md px-3 py-2">
                    <div className="flex gap-1.5">
                      <input
                        className="input num w-20 px-2 py-1 text-xs" placeholder="4:15"
                        aria-label={`Nieuwe tijd ${st.label}`}
                        value={entry[s.id] ?? ''}
                        onChange={(e) => setEntry({ ...entry, [s.id]: e.target.value })}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addResult(s.id) } }}
                      />
                      <button type="button" className="btn px-2 py-1 text-xs" onClick={() => addResult(s.id)}>
                        Bewaar
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {db.stations.length > 0 && (
        <div>
          <h3 className="label mb-2">Alle metingen</h3>
          <ul className="space-y-1">
            {[...db.stations].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((r) => (
              <li key={r.id} className="group flex items-center gap-3 rounded px-1.5 py-1 text-sm hover:bg-line/30">
                <span className="num w-12 shrink-0 text-[11px] text-muted">{formatShort(r.date)}</span>
                <span className="flex-1 truncate text-ink">{STATIONS.find((s) => s.id === r.stationId)?.label}</span>
                <span className="num" style={{ color: SERIES.orange }}>{formatSeconds(r.seconds)}</span>
                <button onClick={() => removeResult(r.id)} aria-label="Verwijderen"
                  className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
