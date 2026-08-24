import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { addDays, daysBetween, formatShort, dayShort, todayKey, weekKeys } from '../lib/date'
import { dayHasData, dayScore, hard75State, netWorthSeries, sessionsThisWeek, tasksOnDay, WEEK_TARGET } from '../lib/derive'
import { APP_START } from '../lib/appStart'
import { SESSION_STYLE, sessionsFor } from '../lib/schedule'
import { SERIES } from '../lib/palette'
import { HARD75_RULES, type Hard75Key } from '../lib/types'
import TopHud from '../components/TopHud'
import TodayTasks from '../components/TodayTasks'
import TodaySessions from '../components/TodaySessions'
import { Hard75Checks, Hard75Grid } from '../components/Hard75Bits'
import { Empty, Legend, Panel, Ring } from '../components/Hud'
import { NetWorthArea, ScoreTrend, WeekSessions, type WeekBar } from '../components/charts'

/** Hoeveel dagen de dagscore-grafiek beslaat, gerekend vanaf de startdatum. */
const TREND_DAYS = 75

export default function Dashboard() {
  const { db, setDay } = useStore()
  const today = todayKey()
  const hard = hard75State(db, today)
  const log = db.days[today]

  const score = dayScore(db, today)
  const tasks = tasksOnDay(db, today)
  const week = sessionsThisWeek(db, today)

  /**
   * De grafiek loopt van de startdatum tot 75 dagen later, zodat je je opbouw
   * ziet groeien in plaats van een venster dat mee schuift. Dagen die nog
   * moeten komen blijven leeg.
   */
  const trend = useMemo(() => {
    const elapsed = Math.max(0, daysBetween(APP_START, today)) + 1
    const shown = Math.min(TREND_DAYS, Math.max(14, elapsed))
    return Array.from({ length: shown }, (_, i) => {
      const key = addDays(APP_START, i)
      const future = daysBetween(today, key) > 0
      return {
        label: formatShort(key),
        score: future ? null : dayHasData(db, key) ? dayScore(db, key) : 0,
      }
    })
  }, [db, today])

  const weekBars = useMemo<WeekBar[]>(
    () =>
      weekKeys(today).map((key) => {
        const planned = sessionsFor(key)
        const dayLog = db.days[key]
        const count = (kind: 'zwem' | 'loop' | 'hyrox') =>
          planned.filter((s) => s.kind === kind && dayLog?.sessions[s.id]).length
        const done = count('zwem') + count('loop') + count('hyrox')
        return {
          day: dayShort(key),
          zwem: count('zwem'),
          loop: count('loop'),
          hyrox: count('hyrox'),
          gepland: planned.length,
          gemist: Math.max(0, planned.length - done),
        }
      }),
    [db, today],
  )

  const nwSeries = useMemo(
    () => netWorthSeries(db)
      .filter((s) => s.date >= APP_START)
      .map((s) => ({ ...s, date: formatShort(s.date) })),
    [db],
  )

  function toggleHard(key: Hard75Key) {
    setDay(today, (d) => { d.hard75[key] = !d.hard75[key] })
  }

  function setFood(value: boolean) {
    setDay(today, (d) => { d.ateHealthy = d.ateHealthy === value ? null : value })
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <TopHud />

      <Panel hud title="Taken vandaag"
        right={<span className="num text-sm text-muted">{tasks.done}/{tasks.total}</span>}>
        <TodayTasks dateKey={today} />
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel title="Sessies vandaag" accent={SERIES.orange}
            right={<span className="num text-[11px] text-muted">week {week.done}/{WEEK_TARGET}</span>}>
            <TodaySessions dateKey={today} />
          </Panel>

          <Panel title="75 Hard vandaag" accent={SERIES.violet}
            right={<span className="num text-[11px] text-muted">{hard.todayCount}/{HARD75_RULES.length}</span>}>
            <Hard75Checks
              values={log?.hard75 ?? { water: false, move: false, creatine: false, skincare: false, read: false }}
              onToggle={toggleHard} size="sm" />
          </Panel>

          <Panel title="Gezond gegeten?">
            <div className="flex gap-2">
              <button
                className={`btn flex-1 ${log?.ateHealthy === true ? 'border-good/60 bg-good/10 text-good' : ''}`}
                onClick={() => setFood(true)} aria-pressed={log?.ateHealthy === true}>
                ✓ Ja
              </button>
              <button
                className={`btn flex-1 ${log?.ateHealthy === false ? 'border-bad/60 bg-bad/10 text-bad' : ''}`}
                onClick={() => setFood(false)} aria-pressed={log?.ateHealthy === false}>
                ✕ Nee
              </button>
            </div>
          </Panel>

          <Panel title="75 Hard voortgang" accent={SERIES.violet}
            right={<span className="num text-[11px] text-muted">{hard.completed}/75 vol</span>}>
            <Hard75Grid state={hard} compact />
          </Panel>
        </div>

        <div className="space-y-4">
          <div className="grid items-start gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
            <Panel hud title="Dagscore" className="flex flex-col items-center justify-center">
              <Ring value={score} label="vandaag" sub={`${hard.todayCount}/5 · ${week.done}/${WEEK_TARGET}`} />
            </Panel>
            <Panel title={`Dagscore sinds ${formatShort(APP_START)}`}
              right={<span className="num text-[11px] text-muted">{TREND_DAYS} dagen</span>}>
              <ScoreTrend data={trend} />
              <p className="mt-1 text-[11px] text-muted">
                45 punten 75 Hard · 30 training · 15 taken · 10 voeding
              </p>
            </Panel>
          </div>

          <Panel title="Sessies deze week"
            right={<Legend items={(['zwem', 'loop', 'hyrox'] as const).map((k) => ({ label: SESSION_STYLE[k].label, color: SESSION_STYLE[k].color }))} />}>
            <WeekSessions data={weekBars} />
            <p className="mt-1 text-[11px] text-muted">
              Volle balk = wat gepland stond. Het grijze stuk bovenaan is wat je liet liggen.
            </p>
          </Panel>

          <Panel title="Vermogen over tijd"
            right={<Legend items={[{ label: 'cash', color: SERIES.blue }, { label: 'voorraad', color: SERIES.aqua }]} />}>
            {nwSeries.length >= 2 ? (
              <NetWorthArea data={nwSeries} />
            ) : (
              <Empty>
                Vanaf twee metingen verschijnt hier de lijn. Pas je cash of voorraad aan in de balk hierboven.
              </Empty>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
