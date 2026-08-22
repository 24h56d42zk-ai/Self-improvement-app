import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../lib/store'
import { addDays, dayShort, formatShort, isoWeekday, monthName, todayKey } from '../lib/date'
import { dayHasData, dayScore, sessionsOnDay, tasksOnDay } from '../lib/derive'
import { scoreColor } from '../lib/palette'
import { STATUS } from '../lib/palette'

/** Maandkalender met per dag je score, je sessies, je taken en je toetsen. */
export default function MonthView({ onPickDay }: { onPickDay?: (key: string) => void }) {
  const { db } = useStore()
  const today = todayKey()
  const [month, setMonth] = useState(() => today.slice(0, 7))

  const cells = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const first = `${y}-${String(m).padStart(2, '0')}-01`
    const lead = isoWeekday(first) - 1
    const daysInMonth = new Date(y, m, 0).getDate()

    const out: ({ key: string; day: number } | null)[] = []
    for (let i = 0; i < lead; i++) out.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ key: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d })
    }
    return out
  }, [month])

  function shift(delta: number) {
    const [y, m] = month.split('-').map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const [year, monthNum] = month.split('-').map(Number)
  const scores = cells.filter(Boolean).map((c) => (dayHasData(db, c!.key) ? dayScore(db, c!.key) : null)).filter((s): s is number => s !== null)
  const average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button className="btn px-1.5 py-1" aria-label="Vorige maand" onClick={() => shift(-1)}><ChevronLeft size={14} /></button>
          <span className="num min-w-[130px] text-center text-sm text-ink">{monthName(monthNum - 1)} {year}</span>
          <button className="btn px-1.5 py-1" aria-label="Volgende maand" onClick={() => shift(1)}><ChevronRight size={14} /></button>
        </div>
        {month !== today.slice(0, 7) && (
          <button className="btn py-1 text-xs" onClick={() => setMonth(today.slice(0, 7))}>Deze maand</button>
        )}
        <span className="num ml-auto text-[11px] text-muted">
          {scores.length} dagen gelogd{average !== null && ` · gemiddeld ${average}`}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'].map((d) => (
          <div key={d} className="label pb-1 text-center">{d}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`x${i}`} />
          const has = dayHasData(db, cell.key)
          const score = has ? dayScore(db, cell.key) : 0
          const tasks = tasksOnDay(db, cell.key)
          const sessions = sessionsOnDay(db, cell.key)
          const exams = db.exams.filter((e) => e.date === cell.key)
          const isToday = cell.key === today
          return (
            <button
              key={cell.key}
              onClick={() => onPickDay?.(cell.key)}
              className={`min-h-[74px] rounded-md border p-1.5 text-left transition hover:border-accent/50 ${
                isToday ? 'border-accent' : 'border-line/70'
              }`}
              style={{ background: has ? `color-mix(in srgb, ${scoreColor(score, true)} 18%, #080d16)` : undefined }}
            >
              <div className="flex items-baseline justify-between">
                <span className="num text-[11px] text-ink">{cell.day}</span>
                {has && <span className="num text-[10px]" style={{ color: scoreColor(score, true) }}>{score}</span>}
              </div>
              <div className="mt-1 space-y-0.5">
                {exams.map((e) => (
                  <div key={e.id} className="truncate rounded px-1 text-[9px]"
                    style={{ background: `${STATUS.critical}22`, color: STATUS.critical }}>
                    {e.title}
                  </div>
                ))}
                {sessions.planned > 0 && (
                  <div className="num text-[9px] text-muted">{sessions.done}/{sessions.planned} sessies</div>
                )}
                {tasks.total > 0 && (
                  <div className="num text-[9px]"
                    style={{ color: tasks.done === tasks.total ? undefined : STATUS.warning }}>
                    {tasks.done}/{tasks.total} taken
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Klik een dag om hem te openen. Rood is een toets, oranje betekent dat er nog taken openstaan.
      </p>
    </div>
  )
}

export { addDays, dayShort, formatShort }
