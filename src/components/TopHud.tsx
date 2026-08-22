import { useStore } from '../lib/store'
import { EVENTS } from '../lib/events'
import { daysBetween, todayKey } from '../lib/date'
import { hard75State, sessionsThisWeek, tasksOnDay, WEEK_TARGET } from '../lib/derive'
import { inventoryFromList, setCash, setInventory, wealth } from '../lib/wealth'
import EditableMoney from './EditableMoney'
import { HARD75_LENGTH } from '../lib/types'
import { Bar, Stat } from './Hud'
import { SERIES } from '../lib/palette'

const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`

/** De vaste bovenbalk: de cijfers die Noa altijd wil zien. */
export default function TopHud() {
  const { db, update } = useStore()
  const today = todayKey()
  const hard = hard75State(db, today)
  const week = sessionsThisWeek(db, today)
  const tasks = tasksOnDay(db, today)
  const nw = wealth(db, today)
  const fromList = inventoryFromList(db)
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
        <div className="label mb-1">Vermogen</div>
        <div className="num text-2xl font-bold leading-none text-ink">{euro(nw.total)}</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div>
            <div className="label text-[9px]">cash</div>
            <EditableMoney size="sm" value={nw.cash} color={SERIES.blue} label="Cash"
              onSave={(n) => update((db) => setCash(db, n))} />
          </div>
          <div>
            <div className="label text-[9px]">voorraad</div>
            <EditableMoney size="sm" value={nw.inventory} color={SERIES.aqua} label="Voorraad"
              disabled={fromList} hint="Komt uit je inventarislijst — pas die aan bij Business"
              onSave={(n) => update((db) => setInventory(db, n))} />
          </div>
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
