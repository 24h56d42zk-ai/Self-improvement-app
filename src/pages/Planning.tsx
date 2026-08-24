import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../lib/store'
import { addDays, formatLong, startOfWeek, todayKey } from '../lib/date'
import { periodFor, periodLabel } from '../lib/planning'
import { Panel } from '../components/Hud'
import TodayTasks from '../components/TodayTasks'
import DayPlan from '../components/DayPlan'
import WeekBoard from '../components/WeekBoard'
import MonthView from '../components/MonthView'
import GoalsSimple from '../components/GoalsSimple'
import Lessons from '../components/Lessons'

const TABS = ['Vandaag', 'Week', 'Maand', 'Doelen', 'Lesrooster'] as const
type Tab = (typeof TABS)[number]

/**
 * Planning is bedoeld om elke dag te gebruiken, niet om naar te kijken.
 * Vandaag om te werken, week en maand om vooruit te zien, doelen om de
 * richting vast te houden.
 */
export default function Planning() {
  const { db } = useStore()
  const today = todayKey()
  const [tab, setTab] = useState<Tab>('Vandaag')
  const [anchor, setAnchor] = useState(today)
  const [selectedDay, setSelectedDay] = useState(today)

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="num text-2xl font-bold text-ink">PLANNING</h1>
          <p className="text-sm text-muted">{formatLong(today)}</p>
        </div>
        <nav className="flex flex-wrap gap-1" role="tablist">
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

      {tab === 'Vandaag' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <Panel hud title={selectedDay === today ? 'Taken vandaag' : `Taken · ${formatLong(selectedDay)}`}>
            <TodayTasks dateKey={selectedDay} />
          </Panel>
          <Panel title="Je dag" right={<span className="num text-[11px] text-muted">lessen en trainingen</span>}>
            <DayPlan dateKey={selectedDay} />
          </Panel>
        </div>
      )}

      {tab === 'Week' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <button className="btn px-1.5 py-1" aria-label="Vorige week"
                onClick={() => setAnchor(addDays(anchor, -7))}><ChevronLeft size={14} /></button>
              <span className="num min-w-[150px] text-center text-sm text-ink">
                {periodLabel('week', periodFor('week', anchor))}
              </span>
              <button className="btn px-1.5 py-1" aria-label="Volgende week"
                onClick={() => setAnchor(addDays(anchor, 7))}><ChevronRight size={14} /></button>
            </div>
            {startOfWeek(anchor) !== startOfWeek(today) && (
              <button className="btn py-1 text-xs" onClick={() => setAnchor(today)}>Deze week</button>
            )}
            <span className="num ml-auto text-[11px] text-muted">
              {db.tasks.filter((t) => t.date && t.date >= startOfWeek(anchor) && t.date <= addDays(startOfWeek(anchor), 6) && !t.done).length} open
            </span>
          </div>
          <WeekBoard anchor={anchor} />
          <p className="text-[11px] text-muted">
            Klik onderaan een dag om er een taak bij te zetten. Met de pijltjes op een taak schuif je hem een dag op.
            De streepjes bovenaan zijn je geplande sessies.
          </p>
        </>
      )}

      {tab === 'Maand' && (
        <Panel hud title="Maandoverzicht">
          <MonthView onPickDay={(key) => { setSelectedDay(key); setAnchor(key); setTab('Vandaag') }} />
        </Panel>
      )}

      {tab === 'Doelen' && (
        <>
          <GoalsSimple />
          <p className="text-[11px] text-muted">
            Jaardoelen zijn de richting, maanddoelen de tussenstappen, weekdoelen wat je nu doet.
            Vul een streefwaarde in als het meetbaar is; laat leeg als je hem gewoon wil afvinken.
          </p>
        </>
      )}

      {tab === 'Lesrooster' && (
        <Panel hud title="Lesrooster">
          <Lessons />
        </Panel>
      )}
    </div>
  )
}
