import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../lib/store'
import { addDays, dayShort, formatLong, formatShort, startOfWeek, todayKey, weekKeys } from '../lib/date'
import { dayHasData, dayScore, sessionsOnDay, tasksOnDay } from '../lib/derive'
import { weekReview } from '../lib/briefing'
import { goalPercent, periodFor, periodLabel } from '../lib/planning'
import { SESSION_STYLE, sessionsFor } from '../lib/schedule'
import { scoreColor } from '../lib/palette'
import { SERIES, STATUS } from '../lib/palette'
import { Bar, Empty, Panel, Ring, ToneLine } from '../components/Hud'
import Tasks from '../components/Tasks'
import { DOMAIN_STYLE } from '../components/Tasks'
import Goals from '../components/Goals'
import YearGrid from '../components/YearGrid'
import Lessons from '../components/Lessons'

const TABS = ['Week', 'Doelen', 'Jaar', 'Lesrooster'] as const
type Tab = (typeof TABS)[number]

export default function Planning() {
  const { db } = useStore()
  const today = todayKey()
  const [tab, setTab] = useState<Tab>('Week')
  const [anchor, setAnchor] = useState(today)
  const [selectedDay, setSelectedDay] = useState(today)

  const days = useMemo(() => weekKeys(anchor), [anchor])
  const review = useMemo(() => weekReview(db, today), [db, today])
  const weekGoals = db.goals.filter((g) => g.horizon === 'week' && g.period === periodFor('week', anchor))

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="num text-2xl font-bold text-ink">PLANNING</h1>
          <p className="text-sm text-muted">{formatLong(today)}</p>
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

      {tab === 'Week' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              <button className="btn px-1.5 py-1" aria-label="Vorige week" onClick={() => setAnchor(addDays(anchor, -7))}>
                <ChevronLeft size={14} />
              </button>
              <span className="num min-w-[150px] text-center text-sm text-ink">
                {periodLabel('week', periodFor('week', anchor))}
              </span>
              <button className="btn px-1.5 py-1" aria-label="Volgende week" onClick={() => setAnchor(addDays(anchor, 7))}>
                <ChevronRight size={14} />
              </button>
            </div>
            {startOfWeek(anchor) !== startOfWeek(today) && (
              <button className="btn py-1 text-xs" onClick={() => { setAnchor(today); setSelectedDay(today) }}>Deze week</button>
            )}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((key) => {
              const score = dayHasData(db, key) ? dayScore(db, key) : 0
              const tasks = tasksOnDay(db, key)
              const sessions = sessionsOnDay(db, key)
              const planned = sessionsFor(key)
              return (
                <button key={key} onClick={() => setSelectedDay(key)}
                  className={`panel p-2.5 text-left transition ${
                    selectedDay === key ? 'border-accent/60 shadow-hud' : 'hover:border-accent/40'
                  }`}>
                  <div className="flex items-baseline justify-between">
                    <span className="label">{dayShort(key)}</span>
                    <span className="num text-[10px] text-muted">{formatShort(key)}</span>
                  </div>
                  <div className="num mt-1.5 text-lg font-bold"
                    style={{ color: score > 0 ? scoreColor(score, true) : '#2a3b4d' }}>
                    {dayHasData(db, key) ? score : '—'}
                  </div>
                  <div className="mt-1.5 flex gap-0.5">
                    {planned.map((s) => (
                      <span key={s.id} className="h-1.5 flex-1 rounded-full"
                        style={{ background: db.days[key]?.sessions[s.id] ? SESSION_STYLE[s.kind].color : '#16283a' }}
                        title={SESSION_STYLE[s.kind].label} />
                    ))}
                    {planned.length === 0 && <span className="h-1.5 flex-1 rounded-full bg-line/40" title="rustdag" />}
                  </div>
                  <div className="mt-1.5 text-[10px] text-muted">
                    {tasks.total > 0 ? `${tasks.done}/${tasks.total} taken` : 'geen taken'}
                    {sessions.planned > 0 && ` · ${sessions.done}/${sessions.planned}`}
                  </div>
                  {key === today && <div className="mt-1 text-[9px] text-accent">vandaag</div>}
                </button>
              )
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
            <Panel hud title={`Taken — ${formatLong(selectedDay)}`}>
              <Tasks dateKey={selectedDay} full />
            </Panel>

            <div className="space-y-4">
              <Panel title="Doelen deze week">
                {weekGoals.length === 0 ? (
                  <Empty>Nog geen weekdoelen. Zet er drie bij het tabblad Doelen.</Empty>
                ) : (
                  <ul className="space-y-2.5">
                    {weekGoals.map((g) => (
                      <li key={g.id}>
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="h-2 w-2 shrink-0 rounded-[2px]"
                              style={{ background: DOMAIN_STYLE[g.domain].color }} aria-hidden />
                            <span className={`truncate text-sm ${g.done ? 'text-muted line-through' : 'text-ink'}`}>{g.title}</span>
                          </span>
                          <span className="num shrink-0 text-[11px] text-muted">
                            {g.target === null ? (g.done ? 'klaar' : '—') : `${g.progress}/${g.target} ${g.unit}`}
                          </span>
                        </div>
                        <Bar value={goalPercent(g)} max={100}
                          color={goalPercent(g) >= 100 ? STATUS.good : DOMAIN_STYLE[g.domain].color} />
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel hud title="Weekreview"
                right={<span className="num text-[11px] text-muted">tot en met vandaag</span>}>
                <div className="mb-3 flex items-center gap-5">
                  <div className="text-center">
                    <Ring value={review.avgScore} size={92} stroke={7} />
                    <div className="label mt-1">gem. score</div>
                  </div>
                  <div className="grid flex-1 gap-2">
                    <div>
                      <div className="label">Sessies</div>
                      <div className="num text-lg font-bold" style={{ color: SERIES.orange }}>
                        {review.sessions.done}<span className="text-xs text-muted">/{review.sessions.planned}</span>
                      </div>
                    </div>
                    <div>
                      <div className="label">75 Hard volledig</div>
                      <div className="num text-lg font-bold" style={{ color: SERIES.violet }}>
                        {review.hard75Days}<span className="text-xs text-muted"> dagen</span>
                      </div>
                    </div>
                  </div>
                </div>
                <ul className="space-y-1.5 border-t border-line/60 pt-3">
                  {review.lines.map((l, i) => <ToneLine key={i} tone={l.tone}>{l.text}</ToneLine>)}
                </ul>
              </Panel>
            </div>
          </div>
        </>
      )}

      {tab === 'Doelen' && (
        <Panel hud title="Doelen">
          <Goals />
          <p className="mt-4 border-t border-line/60 pt-3 text-[11px] text-muted">
            Jaardoelen zijn de richting, maanddoelen de tussenstappen, weekdoelen wat je nu doet.
            Hang je taken aan een weekdoel, dan zie je meteen of je dagen je doelen dienen.
          </p>
        </Panel>
      )}

      {tab === 'Jaar' && (
        <Panel hud title="Je jaar in dagen">
          <YearGrid />
        </Panel>
      )}

      {tab === 'Lesrooster' && (
        <Panel hud title="Lesrooster">
          <Lessons />
        </Panel>
      )}
    </div>
  )
}
