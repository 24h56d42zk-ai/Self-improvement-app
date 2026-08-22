import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { addDays, formatLong, formatShort, dayShort, todayKey, weekKeys } from '../lib/date'
import { dayHasData, dayScore, hard75State, netWorthSeries, sessionsThisWeek, tasksOnDay, WEEK_TARGET } from '../lib/derive'
import { eveningAlerts, morningBriefing } from '../lib/briefing'
import { SESSION_STYLE, sessionsFor } from '../lib/schedule'
import { SERIES } from '../lib/palette'
import { HARD75_RULES, type Hard75Key } from '../lib/types'
import TopHud from '../components/TopHud'
import Tasks from '../components/Tasks'
import TodaySessions from '../components/TodaySessions'
import Reflection from '../components/Reflection'
import { Hard75Checks, Hard75Grid } from '../components/Hard75Bits'
import { Empty, Legend, Panel, Ring, ToneLine } from '../components/Hud'
import { NetWorthArea, ScoreTrend, WeekSessions, type WeekBar } from '../components/charts'
import { AchievementsPanel, EffortPanel, LevelPanel, StreaksPanel } from '../components/Progress'
import { levelFor, totalXp } from '../lib/progress'

export default function Dashboard() {
  const { db, setDay } = useStore()
  const today = todayKey()
  const hard = hard75State(db, today)
  const log = db.days[today]

  const briefing = useMemo(() => morningBriefing(db, today), [db, today])
  const alerts = useMemo(() => eveningAlerts(db, today), [db, today])
  const score = dayScore(db, today)

  const trend = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const key = addDays(today, i - 13)
        return { label: formatShort(key), score: dayHasData(db, key) ? dayScore(db, key) : 0 }
      }),
    [db, today],
  )

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
    () => netWorthSeries(db).map((s) => ({ ...s, date: formatShort(s.date) })),
    [db],
  )

  const week = sessionsThisWeek(db, today)
  const tasks = tasksOnDay(db, today)
  const level = useMemo(() => levelFor(totalXp(db)), [db])

  function toggleHard(key: Hard75Key) {
    setDay(today, (d) => { d.hard75[key] = !d.hard75[key] })
  }

  function setFood(value: boolean) {
    setDay(today, (d) => { d.ateHealthy = d.ateHealthy === value ? null : value })
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <TopHud />

      <Panel hud title="Briefing" right={<span className="num text-[11px] text-muted">{formatLong(today)}</span>}>
        <ul className="space-y-1.5">
          {alerts.map((l, i) => <ToneLine key={`a${i}`} tone={l.tone}>{l.text}</ToneLine>)}
          {briefing.map((l, i) => <ToneLine key={`b${i}`} tone={l.tone}>{l.text}</ToneLine>)}
        </ul>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        {/* Linkerkolom: alles wat je vandaag aantikt */}
        <div className="space-y-4">
          <Panel title="Sessies vandaag" accent={SERIES.orange}
            right={<span className="num text-[11px] text-muted">week {week.done}/{WEEK_TARGET}</span>}>
            <TodaySessions dateKey={today} />
          </Panel>

          <Panel title="75 Hard vandaag" accent={SERIES.violet}
            right={<span className="num text-[11px] text-muted">{hard.todayCount}/{HARD75_RULES.length}</span>}>
            <Hard75Checks values={log?.hard75 ?? { water: false, move: false, creatine: false, skincare: false, read: false }}
              onToggle={toggleHard} size="sm" />
          </Panel>

          <Panel title="Gezond gegeten?">
            <div className="flex gap-2">
              <button
                className={`btn flex-1 ${log?.ateHealthy === true ? 'border-good/60 bg-good/10 text-good' : ''}`}
                onClick={() => setFood(true)} aria-pressed={log?.ateHealthy === true}
              >
                ✓ Ja
              </button>
              <button
                className={`btn flex-1 ${log?.ateHealthy === false ? 'border-bad/60 bg-bad/10 text-bad' : ''}`}
                onClick={() => setFood(false)} aria-pressed={log?.ateHealthy === false}
              >
                ✕ Nee
              </button>
            </div>
          </Panel>

          <Panel title="Taken vandaag" right={<span className="num text-[11px] text-muted">{tasks.done}/{tasks.total}</span>}>
            <Tasks dateKey={today} />
          </Panel>
        </div>

        {/* Rechterkolom: de cijfers */}
        <div className="space-y-4">
          <div className="grid items-start gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
            <Panel hud title="Dagscore" className="flex flex-col items-center justify-center">
              <Ring value={score} label="vandaag" sub={`${hard.todayCount}/5 · ${week.done}/${WEEK_TARGET}`} />
              <div className="mt-3 w-full border-t border-line/60 pt-2 text-center">
                <span className="num text-sm font-bold text-accent">niveau {level.level}</span>
                <span className="num ml-2 text-[10px] text-muted">{level.percent}% naar {level.level + 1}</span>
              </div>
            </Panel>
            <Panel title="Dagscore, 14 dagen">
              <ScoreTrend data={trend} />
              <p className="mt-1 text-[11px] text-muted">
                45 punten 75 Hard · 30 training · 15 taken · 10 voeding
              </p>
            </Panel>
          </div>

          <Panel title="Sessies deze week"
            right={<Legend items={(['zwem', 'loop', 'hyrox'] as const).map((k) => ({ label: SESSION_STYLE[k].label, color: SESSION_STYLE[k].color }))} />}>
            <WeekSessions data={weekBars} />
            <p className="mt-1 text-[11px] text-muted">Volle balk = wat gepland stond. Het grijze stuk bovenaan is wat je liet liggen.</p>
          </Panel>

          <Panel title="Vermogen over tijd"
            right={<Legend items={[{ label: 'cash', color: SERIES.blue }, { label: 'voorraad', color: SERIES.aqua }]} />}>
            {nwSeries.length >= 2 ? (
              <NetWorthArea data={nwSeries} />
            ) : (
              <Empty>
                Voeg minstens twee metingen toe bij Instellingen → Vermogen, dan verschijnt hier de lijn.
              </Empty>
            )}
          </Panel>

          <div className="grid items-start gap-4 md:grid-cols-2">
            <Panel title="75 Hard voortgang" accent={SERIES.violet}
              right={<span className="num text-[11px] text-muted">{hard.completed}/75 vol</span>}>
              <Hard75Grid state={hard} compact />
            </Panel>
            <Panel title="Avondreflectie">
              <Reflection dateKey={today} />
            </Panel>
          </div>

        </div>
      </div>

      {/* Voortgang over de volle breedte: dit hoort niet in één kolom te hangen. */}
      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <LevelPanel />
        <StreaksPanel />
        <EffortPanel />
        <AchievementsPanel compact />
      </div>
    </div>
  )
}
