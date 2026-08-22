import { useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { daysBetween, formatShort, todayKey } from '../lib/date'
import { EVENTS } from '../lib/events'
import { SESSION_STYLE } from '../lib/schedule'
import { STATIONS, formatSeconds, tonnage } from '../lib/training'
import {
  loadRatio, personalRecords, readiness, stationScores, weakestStation, weeklyVolume,
} from '../lib/trainingDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Bar, Empty, Legend, Panel, Ring, Stat, ToneLine } from '../components/Hud'
import { LoadTrend, StationRadar, TonnageChart, VolumeKm } from '../components/charts'
import SessionForm from '../components/SessionForm'
import Stations from '../components/Stations'

const TABS = ['Overzicht', 'Logboek', 'Stations', 'Records'] as const
type Tab = (typeof TABS)[number]

export default function Training() {
  const { db, update } = useStore()
  const today = todayKey()
  const [tab, setTab] = useState<Tab>('Overzicht')

  const race = EVENTS.find((e) => e.id === 'hyrox-sep')!
  const nextRace = daysBetween(today, race.date) >= 0 ? race : EVENTS.find((e) => e.id === 'hyrox-dec')!

  const volume = useMemo(() => weeklyVolume(db, 12, today), [db, today])
  const ratio = useMemo(() => loadRatio(db, today), [db, today])
  const ready = useMemo(() => readiness(db, nextRace.date, today), [db, nextRace.date, today])
  const scores = useMemo(() => stationScores(db), [db])
  const weakest = useMemo(() => weakestStation(scores), [scores])
  const records = useMemo(() => personalRecords(db, today), [db, today])

  const radar = scores.map((s) => ({ short: s.short, label: s.label, score: s.score, doel: 100 }))
  const recentLogs = [...db.sessionLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15)

  function removeLog(id: string) {
    update((draft) => { draft.sessionLogs = draft.sessionLogs.filter((l) => l.id !== id) })
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="num text-2xl font-bold text-ink">TRAINING</h1>
          <p className="text-sm text-muted">
            {nextRace.label} {nextRace.sub} over {daysBetween(today, nextRace.date)} dagen ·
            nog ~{ready.sessionsLeft} sessies te gaan
          </p>
        </div>
        <nav className="flex gap-1" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                tab === t ? 'bg-accent/12 text-accent' : 'text-muted hover:text-ink'
              }`}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'Overzicht' && (
        <>
          <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
            <Panel hud title="Readiness" className="flex flex-col items-center justify-center">
              <Ring value={ready.total} color={SERIES.orange} label={nextRace.sub}
                sub={`${ready.weeksLeft} weken`} />
            </Panel>

            <Panel title="Waar die score vandaan komt">
              <ul className="space-y-3">
                {[
                  { label: 'Schema volhouden', value: ready.consistency, weight: 50, hint: 'sessies gedaan tegenover gepland, 6 weken' },
                  { label: 'Stations getest', value: ready.coverage, weight: 20, hint: 'hoeveel van de 9 stations je gemeten hebt' },
                  { label: 'Prestatie op doel', value: ready.performance, weight: 30, hint: 'je tijden tegenover je eigen doeltijden' },
                ].map((row) => (
                  <li key={row.label}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="text-sm text-ink">{row.label}</span>
                      <span className="num text-sm text-muted">{row.value}<span className="text-[10px]"> /100 · weegt {row.weight}%</span></span>
                    </div>
                    <Bar value={row.value} max={100} color={SERIES.orange} />
                    <p className="mt-1 text-[11px] text-muted">{row.hint}</p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Opbouw en blessurerisico">
              <div className="flex items-baseline gap-4">
                <Stat label="Deze week" value={ratio.acute} sub="belastingpunten" />
                <Stat label="Gemiddeld" value={ratio.chronic} sub="over 4 weken" />
                <Stat
                  label="Verhouding"
                  value={ratio.ratio === null ? '—' : ratio.ratio.toFixed(2)}
                  tone={ratio.tone === 'neutral' ? 'default' : ratio.tone}
                />
              </div>
              <ul className="mt-3">
                <ToneLine tone={ratio.tone === 'neutral' ? 'neutral' : ratio.tone}>{ratio.message}</ToneLine>
              </ul>
              <p className="mt-2 text-[11px] text-muted">
                Belasting = duur × RPE. Veilig bereik is 0,8–1,3; boven 1,5 gaat het mis.
              </p>
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <div className="space-y-4">
              <Panel title="Kilometers per week"
                right={<Legend items={[
                  { label: 'lopen', color: SESSION_STYLE.loop.color },
                  { label: 'zwemmen', color: SESSION_STYLE.zwem.color },
                ]} />}>
                <VolumeKm data={volume} />
              </Panel>
              <div className="grid gap-4 md:grid-cols-2">
                <Panel title="Getild gewicht per week">
                  <TonnageChart data={volume} />
                </Panel>
                <Panel title="Belasting per week">
                  <LoadTrend data={volume} />
                </Panel>
              </div>
            </div>

            <div className="space-y-4">
              <Panel hud title="Stations tegenover je doel"
                right={<Legend items={[
                  { label: 'jij', color: SERIES.orange },
                  { label: 'doel', color: '#6b8299' },
                ]} />}>
                <StationRadar data={radar} />
                {weakest ? (
                  <p className="mt-1 text-sm text-ink/85">
                    Zwakste station: <span style={{ color: STATUS.serious }}>{weakest.label}</span> —
                    {' '}{formatSeconds(weakest.best!)} tegenover doel {formatSeconds(weakest.target)}.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted">
                    Nog geen stations gemeten. Vul er een paar in bij <span className="text-accent">Stations</span>,
                    dan wijst deze radar je zwakste punt aan.
                  </p>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}

      {tab === 'Logboek' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <Panel hud title="Sessie loggen">
            <SessionForm />
          </Panel>
          <Panel title="Laatste sessies" right={<span className="num text-[11px] text-muted">{db.sessionLogs.length} totaal</span>}>
            {recentLogs.length === 0 ? (
              <Empty>Nog niets gelogd. Kies links een sjabloon en je staat er in twintig seconden.</Empty>
            ) : (
              <ul className="space-y-1">
                {recentLogs.map((l) => (
                  <li key={l.id} className="group flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-line/30">
                    <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: SESSION_STYLE[l.kind].color }} aria-hidden />
                    <span className="num w-11 shrink-0 text-[11px] text-muted">{formatShort(l.date)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {SESSION_STYLE[l.kind].label}
                      {l.note && <span className="text-muted"> · {l.note}</span>}
                    </span>
                    <span className="num shrink-0 text-[11px] text-muted">
                      {l.distanceKm ? `${l.distanceKm} km` : tonnage(l) > 0 ? `${tonnage(l)} kg` : ''}
                      {l.rpe ? ` · RPE ${l.rpe}` : ''}
                    </span>
                    <button onClick={() => removeLog(l.id)} aria-label="Sessie verwijderen"
                      className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === 'Stations' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <Panel hud title="De 8 stations en je loopsplit">
            <Stations />
          </Panel>
          <Panel title="Radar"
            right={<Legend items={[{ label: 'jij', color: SERIES.orange }, { label: 'doel', color: '#6b8299' }]} />}>
            <StationRadar data={radar} />
            <p className="mt-1 text-[11px] text-muted">
              100 = precies op je doeltijd. Alles binnen de stippellijn is werk aan de winkel.
            </p>
          </Panel>
        </div>
      )}

      {tab === 'Records' && (
        <Panel hud title="PR-muur" right={<span className="num text-[11px] text-muted">{records.length} records</span>}>
          {records.length === 0 ? (
            <Empty>Nog geen records. Log een sessie of een stationstijd, dan verschijnen ze hier vanzelf.</Empty>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {records.map((r) => (
                <div key={r.key}
                  className={`panel p-3 ${r.fresh ? 'border-accent/50 shadow-hud' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="label">{r.category}</span>
                    {r.fresh && <span className="num rounded bg-accent/15 px-1.5 py-0.5 text-[9px] text-accent">NIEUW</span>}
                  </div>
                  <div className="mt-1 truncate text-sm text-ink" title={r.label}>{r.label}</div>
                  <div className="num mt-1 text-xl font-bold" style={{ color: SERIES.orange }}>{r.value}</div>
                  <div className="mt-1 flex items-baseline gap-2 text-[11px] text-muted">
                    <span>{formatShort(r.date)}</span>
                    {r.improvement && <span style={{ color: STATUS.good }}>{r.improvement}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted">
            Records worden berekend uit je logboek en je stationstijden — je hoeft niets apart bij te houden.
            Een record van de laatste drie weken krijgt de markering NIEUW.
          </p>
        </Panel>
      )}

      {tab === 'Overzicht' && STATIONS.length > 0 && (
        <p className="text-[11px] text-muted">
          Readiness combineert drie dingen omdat één ervan alleen misleidt: braaf elke sessie afvinken
          zegt niets als je nooit een stationstijd meet, en snelle tijden zeggen niets als je het schema niet volhoudt.
        </p>
      )}
    </div>
  )
}
