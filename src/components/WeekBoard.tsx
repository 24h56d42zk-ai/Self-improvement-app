import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { addDays, dayShort, formatShort, startOfWeek, todayKey, weekKeys } from '../lib/date'
import type { Domain, Task } from '../lib/types'
import { sessionsFor, SESSION_STYLE } from '../lib/schedule'
import { DOMAIN_STYLE } from './Tasks'

/** Zeven kolommen, taken erin zetten waar je ze wil. Meer heeft een week niet nodig. */
export default function WeekBoard({ anchor }: { anchor: string }) {
  const { db, update } = useStore()
  const today = todayKey()
  const days = weekKeys(anchor)
  const [adding, setAdding] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState<Domain>('school')

  function add(dateKey: string) {
    const clean = title.trim()
    if (!clean) { setAdding(null); return }
    update((draft) => {
      draft.tasks.push({
        id: crypto.randomUUID(),
        title: clean,
        date: dateKey,
        done: false,
        priority: 2,
        domain,
        createdAt: new Date().toISOString(),
        goalId: null,
        repeat: 'geen',
        estimateMin: 30,
      })
    })
    setTitle('')
  }

  function toggle(id: string) {
    update((draft) => {
      const t = draft.tasks.find((x) => x.id === id)
      if (t) t.done = !t.done
    })
  }

  function remove(id: string) {
    update((draft) => { draft.tasks = draft.tasks.filter((t) => t.id !== id) })
  }

  /** Een taak naar een andere dag schuiven, zonder slepen. */
  function move(task: Task, delta: number) {
    if (!task.date) return
    update((draft) => {
      const t = draft.tasks.find((x) => x.id === task.id)
      if (t && t.date) t.date = addDays(t.date, delta)
    })
  }

  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((key) => {
        const list = db.tasks
          .filter((t) => t.date === key)
          .sort((a, b) => Number(a.done) - Number(b.done) || a.priority - b.priority)
        const planned = sessionsFor(key)
        const isToday = key === today
        return (
          <div key={key}
            className={`panel flex min-h-[220px] flex-col p-2.5 ${isToday ? 'border-accent/60' : ''}`}>
            <div className="mb-2 flex items-baseline justify-between">
              <span className={`label ${isToday ? 'text-accent' : ''}`}>{dayShort(key)}</span>
              <span className="num text-[10px] text-muted">{formatShort(key)}</span>
            </div>

            {planned.length > 0 && (
              <div className="mb-2 flex gap-1">
                {planned.map((s) => (
                  <span key={s.id} className="h-1.5 flex-1 rounded-full" title={SESSION_STYLE[s.kind].label}
                    style={{ background: db.days[key]?.sessions[s.id] ? SESSION_STYLE[s.kind].color : '#16283a' }} />
                ))}
              </div>
            )}

            <ul className="flex-1 space-y-1">
              {list.map((t) => (
                <li key={t.id} className="group rounded border border-line/60 bg-panel2/50 px-1.5 py-1.5">
                  <div className="flex items-start gap-1.5">
                    <button onClick={() => toggle(t.id)} aria-pressed={t.done}
                      aria-label={t.done ? 'Niet gedaan' : 'Gedaan'}
                      className={`num mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border text-[9px] ${
                        t.done ? 'border-transparent bg-accent text-base' : 'border-line text-transparent hover:border-accent'
                      }`}>
                      ✓
                    </button>
                    <span className="h-3 w-0.5 shrink-0 rounded-full" style={{ background: DOMAIN_STYLE[t.domain].color }} aria-hidden />
                    <span className={`min-w-0 flex-1 text-[11px] leading-tight ${t.done ? 'text-muted line-through' : 'text-ink'}`}>
                      {t.title}
                    </span>
                    <button onClick={() => remove(t.id)} aria-label="Verwijderen"
                      className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                      <X size={11} />
                    </button>
                  </div>
                  <div className="mt-1 hidden justify-end gap-1 group-hover:flex">
                    <button onClick={() => move(t, -1)} aria-label="Dag eerder"
                      className="num rounded px-1 text-[9px] text-muted hover:text-accent">◀</button>
                    <button onClick={() => move(t, 1)} aria-label="Dag later"
                      className="num rounded px-1 text-[9px] text-muted hover:text-accent">▶</button>
                  </div>
                </li>
              ))}
            </ul>

            {adding === key ? (
              <div className="mt-2 space-y-1">
                <input autoFocus className="input px-2 py-1 text-[11px]" placeholder="Taak…"
                  value={title} aria-label={`Taak voor ${formatShort(key)}`}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); add(key) }
                    if (e.key === 'Escape') { setAdding(null); setTitle('') }
                  }} />
                <select className="input px-2 py-1 text-[10px]" value={domain} aria-label="Categorie"
                  onChange={(e) => setDomain(e.target.value as Domain)}>
                  {(Object.keys(DOMAIN_STYLE) as Domain[]).map((d) => (
                    <option key={d} value={d}>{DOMAIN_STYLE[d].label}</option>
                  ))}
                </select>
                <button className="btn w-full py-1 text-[10px]" onClick={() => add(key)}>Toevoegen</button>
              </div>
            ) : (
              <button className="mt-2 flex w-full items-center justify-center gap-1 rounded border border-dashed border-line/70 py-1.5 text-[10px] text-muted transition hover:border-accent/50 hover:text-accent"
                onClick={() => { setAdding(key); setTitle('') }}>
                <Plus size={11} /> taak
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export { startOfWeek }
