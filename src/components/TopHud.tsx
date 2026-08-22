import { useStore } from '../lib/store'
import { EVENTS } from '../lib/events'
import { daysBetween, todayKey } from '../lib/date'
import { hard75State, latestNetWorth, sessionsThisWeek, tasksOnDay, WEEK_TARGET } from '../lib/derive'
import { cashNow, inventoryCoverage } from '../lib/businessDerive'
import { HARD75_LENGTH } from '../lib/types'
import { Bar, Stat } from './Hud'
import { SERIES } from '../lib/palette'

const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`

/** De vaste bovenbalk: de cijfers die Noa altijd wil zien. */
export default function TopHud() {
  const { db } = useStore()
  const today = todayKey()
  const hard = hard75State(db, today)
  const week = sessionsThisWeek(db, today)
  const tasks = tasksOnDay(db, today)
  // Live rekenen zodra er transacties zijn; de voorraad alleen als de lijst je meting dekt.
  const snapshot = latestNetWorth(db)
  const coverage = inventoryCoverage(db)
  const cash = db.trades.length > 0 ? cashNow(db, today).amount : snapshot.cash
  const inventory = coverage.complete ? coverage.live : Math.max(coverage.live, snapshot.inventory)
  const nw = { cash, inventory, total: cash + inventory }
  const races = EVENTS.filter((e) => e.id.startsWith('hyrox'))

  return (
    <div className="panel-hud relative grid grid-cols-2 gap-px overflow-hidden bg-line/40 lg:grid-cols-4">
      {/* scanlijn */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
        <span className="block h-px w-1/3 animate-sweep bg-gradient-to-r from-transparent via-accent to-transparent" />
      </span>

      <div className="bg-panel p-4">
        <div className="label mb-2">Wedstrijden</div>
        <ul className="space-y-2">
          {races.map((r) => {
            const d = daysBetween(today, r.date)
            return (
              <li key={r.id} className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[11px] text-muted">
                  <span className="h-2 w-2" style={{ color: r.color }} aria-hidden>■</span> {r.sub}
                </span>
                <span className="num text-lg font-bold leading-none" style={{ color: r.color }}>
                  {d}
                  <span className="ml-1 text-[10px] font-normal text-muted">dgn</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="bg-panel p-4">
        <Stat
          label="75 Hard"
          value={hard.started ? hard.dayIndex : '—'}
          unit={hard.started ? `/ ${HARD75_LENGTH}` : undefined}
          sub={hard.started ? `streak ${hard.streak} · vandaag ${hard.todayCount}/5` : 'nog niet gestart'}
          accent={SERIES.violet}
        />
        <div className="mt-2">
          <Bar value={hard.dayIndex} max={HARD75_LENGTH} color={SERIES.violet} />
        </div>
      </div>

      <div className="bg-panel p-4">
        <div className="label mb-2">Vermogen</div>
        <div className="num text-2xl font-bold leading-none text-ink">{euro(nw.total)}</div>
        <div className="mt-2 flex gap-3 text-[11px] text-muted">
          <span><span style={{ color: SERIES.blue }} aria-hidden>■</span> cash {euro(nw.cash)}</span>
          <span><span style={{ color: SERIES.aqua }} aria-hidden>■</span> voorraad {euro(nw.inventory)}</span>
        </div>
      </div>

      <div className="bg-panel p-4">
        <div className="flex items-start justify-between gap-4">
          <Stat
            label="Sessies deze week"
            value={week.done}
            unit={`/ ${WEEK_TARGET}`}
            sub={`${tasks.total - tasks.done} taken open vandaag`}
            accent={SERIES.orange}
          />
        </div>
        <div className="mt-2">
          <Bar value={week.done} max={WEEK_TARGET} color={SERIES.orange} />
        </div>
      </div>
    </div>
  )
}
