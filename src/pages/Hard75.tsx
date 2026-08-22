import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { addDays, formatLong, formatShort, todayKey } from '../lib/date'
import { hard75State } from '../lib/derive'
import { HARD75_LENGTH, HARD75_RULES, type Hard75Key } from '../lib/types'
import { Hard75Checks, Hard75Grid } from '../components/Hard75Bits'
import { Panel, Ring, Stat } from '../components/Hud'
import { SERIES, STATUS } from '../lib/palette'

export default function Hard75() {
  const { db, setDay, setSettings } = useStore()
  const today = todayKey()
  const state = hard75State(db, today)
  const log = db.days[today]

  const misses = useMemo(() => {
    const counts = Object.fromEntries(HARD75_RULES.map((r) => [r.key, 0])) as Record<Hard75Key, number>
    for (const cell of state.grid) {
      if (cell.future || cell.isToday) continue
      const day = db.days[cell.key]
      for (const rule of HARD75_RULES) if (!day?.hard75[rule.key]) counts[rule.key]++
    }
    return HARD75_RULES.map((r) => ({ ...r, missed: counts[r.key] })).sort((a, b) => b.missed - a.missed)
  }, [db, state.grid])

  const recent = useMemo(
    () => Array.from({ length: 10 }, (_, i) => addDays(today, -i)).filter((k) => !state.started || k >= (db.settings.hard75Start ?? k)),
    [today, state.started, db.settings.hard75Start],
  )

  function toggle(key: Hard75Key) {
    setDay(today, (d) => { d.hard75[key] = !d.hard75[key] })
  }

  function start(dateKey: string) {
    setSettings({ hard75Start: dateKey })
  }

  function restart() {
    setSettings({ hard75Start: today, hard75Attempt: db.settings.hard75Attempt + 1 })
  }

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="num text-2xl font-bold text-ink">75 HARD</h1>
          <p className="text-sm text-muted">
            {state.started ? `Poging ${db.settings.hard75Attempt} · gestart ${formatShort(db.settings.hard75Start!)}` : 'Nog niet gestart'}
          </p>
        </div>
        <span className="num text-[11px] text-muted">{formatLong(today)}</span>
      </header>

      {!state.started && (
        <Panel hud title="Startdatum">
          <p className="mb-3 text-sm text-muted">
            Kies de dag waarop je begint. Vanaf dan telt elke dag: alle vijf de regels, geen uitzonderingen.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => start(today)}>Vandaag starten</button>
            <button className="btn" onClick={() => start(addDays(today, 1))}>Morgen starten</button>
            <input
              type="date" className="input w-auto"
              onChange={(e) => e.target.value && start(e.target.value)}
              aria-label="Andere startdatum"
            />
          </div>
        </Panel>
      )}

      {state.brokenOn && (
        <Panel className="border-bad/50 bg-bad/5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-bad">
              ✕ Gebroken op {formatShort(state.brokenOn)}. De regel is: terug naar dag 1. Je geschiedenis blijft bewaard.
            </p>
            <button className="btn border-bad/60 text-bad hover:border-bad hover:text-bad" onClick={restart}>
              Opnieuw beginnen vanaf vandaag
            </button>
          </div>
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <Panel hud title="Vandaag afvinken" accent={SERIES.violet}
          right={<span className="num text-sm" style={{ color: SERIES.violet }}>{state.todayCount}/5</span>}>
          <Hard75Checks
            values={log?.hard75 ?? { water: false, move: false, creatine: false, skincare: false, read: false }}
            onToggle={toggle}
          />
        </Panel>

        <Panel title="Stand">
          <div className="flex items-center gap-6">
          <Ring
            value={state.started ? (state.dayIndex / HARD75_LENGTH) * 100 : 0}
            size={116} color={SERIES.violet}
            label="voltooid" sub={`dag ${state.dayIndex}`}
          />
          <div className="grid flex-1 gap-4">
            <Stat label="Streak" value={state.streak} unit="dagen" accent={SERIES.violet} />
            <Stat label="Volle dagen" value={state.completed} unit={`/ ${HARD75_LENGTH}`} />
            <Stat label="Nog te gaan" value={Math.max(0, HARD75_LENGTH - state.completed)} unit="dagen" />
          </div>
          </div>
        </Panel>
      </div>

      <Panel title="75 dagen" right={
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
          <li><span style={{ color: SERIES.violet }} aria-hidden>■</span> volledig</li>
          <li><span style={{ color: STATUS.critical }} aria-hidden>■</span> gemist</li>
          <li><span className="text-line" aria-hidden>■</span> nog te doen</li>
        </ul>
      }>
        <Hard75Grid state={state} />
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Welke regel laat je vallen?">
          {state.started ? (
            <ul className="space-y-2">
              {misses.map((m) => (
                <li key={m.key} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-ink">{m.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/60">
                    <span className="block h-full rounded-full"
                      style={{
                        width: `${misses[0].missed ? (m.missed / misses[0].missed) * 100 : 0}%`,
                        background: m.missed > 0 ? STATUS.critical : SERIES.violet,
                      }} />
                  </span>
                  <span className="num w-8 shrink-0 text-right text-sm text-muted">{m.missed}×</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Zichtbaar zodra de challenge loopt.</p>
          )}
        </Panel>

        <Panel title="Laatste dagen">
          <ul className="space-y-1.5">
            {recent.map((key) => {
              const d = db.days[key]
              return (
                <li key={key} className="flex items-center gap-3">
                  <span className="num w-12 shrink-0 text-[11px] text-muted">{formatShort(key)}</span>
                  <span className="flex gap-1">
                    {HARD75_RULES.map((r) => (
                      <span key={r.key} title={r.label} className="h-3 w-3 rounded-[3px]"
                        style={{ background: d?.hard75[r.key] ? SERIES.violet : '#0f1720' }} />
                    ))}
                  </span>
                  <span className="num ml-auto text-[11px] text-muted">
                    {HARD75_RULES.filter((r) => d?.hard75[r.key]).length}/5
                  </span>
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
