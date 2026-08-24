import { useState } from 'react'
import { ArrowDownToLine, Plus, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { addDays, formatShort } from '../lib/date'
import type { Domain, Repeat, Task } from '../lib/types'
import { carryOver, overdueTasks } from '../lib/autoplan'
import { SERIES, STATUS } from '../lib/palette'
import { DOMAIN_STYLE } from './Tasks'

const PRIORITY: { id: Task['priority']; label: string; color: string }[] = [
  { id: 1, label: 'Moet', color: STATUS.critical },
  { id: 2, label: 'Zou', color: SERIES.blue },
  { id: 3, label: 'Kan', color: '#6b8299' },
]

const REPEATS: { id: Repeat; label: string }[] = [
  { id: 'geen', label: 'Eenmalig' },
  { id: 'dagelijks', label: 'Elke dag' },
  { id: 'wekelijks', label: 'Elke week' },
  { id: 'maandelijks', label: 'Elke maand' },
]

function nextDate(date: string, repeat: Repeat): string | null {
  if (repeat === 'dagelijks') return addDays(date, 1)
  if (repeat === 'wekelijks') return addDays(date, 7)
  if (repeat === 'maandelijks') return addDays(date, 28)
  return null
}

/**
 * De takenlijst van vandaag, groot genoeg om de hele dag in te werken:
 * ruime regels, prioriteit in één tik, en wat blijven liggen is meteen zichtbaar.
 */
export default function TodayTasks({ dateKey }: { dateKey: string }) {
  const { db, update } = useStore()
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState<Domain>('school')
  const [priority, setPriority] = useState<Task['priority']>(2)
  const [repeat, setRepeat] = useState<Repeat>('geen')

  const list = db.tasks
    .filter((t) => t.date === dateKey)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.priority - b.priority)
  const open = list.filter((t) => !t.done)
  const overdue = overdueTasks(db, dateKey)

  function add(e: React.FormEvent) {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    update((draft) => {
      draft.tasks.push({
        id: crypto.randomUUID(),
        title: clean,
        date: dateKey,
        done: false,
        priority,
        domain,
        createdAt: new Date().toISOString(),
        goalId: null,
        repeat,
        estimateMin: 30,
      })
    })
    setTitle('')
  }

  function toggle(id: string) {
    update((draft) => {
      const t = draft.tasks.find((x) => x.id === id)
      if (!t) return
      t.done = !t.done
      if (t.done && t.repeat && t.repeat !== 'geen' && t.date) {
        const next = nextDate(t.date, t.repeat)
        if (next && !draft.tasks.some((x) => x.title === t.title && x.date === next)) {
          draft.tasks.push({ ...t, id: crypto.randomUUID(), date: next, done: false, createdAt: new Date().toISOString() })
        }
      }
    })
  }

  function cyclePriority(id: string) {
    update((draft) => {
      const t = draft.tasks.find((x) => x.id === id)
      if (t) t.priority = (t.priority === 3 ? 1 : ((t.priority + 1) as Task['priority']))
    })
  }

  function remove(id: string) {
    update((draft) => { draft.tasks = draft.tasks.filter((t) => t.id !== id) })
  }

  return (
    <div>
      <form onSubmit={add} className="mb-3 flex flex-wrap gap-2">
        <input
          className="input min-w-[200px] flex-1 py-3 text-base"
          placeholder="Wat moet er vandaag gebeuren?"
          value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Nieuwe taak"
        />
        <select className="input w-auto py-3" value={domain} aria-label="Categorie"
          onChange={(e) => setDomain(e.target.value as Domain)}>
          {(Object.keys(DOMAIN_STYLE) as Domain[]).map((d) => (
            <option key={d} value={d}>{DOMAIN_STYLE[d].label}</option>
          ))}
        </select>
        <select className="input w-auto py-3" value={priority} aria-label="Prioriteit"
          onChange={(e) => setPriority(Number(e.target.value) as Task['priority'])}>
          {PRIORITY.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select className="input w-auto py-3" value={repeat} aria-label="Herhaling"
          onChange={(e) => setRepeat(e.target.value as Repeat)}>
          {REPEATS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
        <button className="btn-primary shrink-0 px-5 py-3" type="submit" aria-label="Toevoegen">
          <Plus size={18} />
        </button>
      </form>

      {overdue.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-warn/40 bg-warn/5 px-3 py-2">
          <span className="text-sm text-warn">
            {overdue.length} {overdue.length === 1 ? 'taak staat' : 'taken staan'} nog open van eerdere dagen
          </span>
          <button className="btn border-warn/50 py-1.5 text-xs text-warn hover:border-warn"
            onClick={() => update((db) => { carryOver(db, dateKey) })}>
            <ArrowDownToLine size={13} /> Naar vandaag halen
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          Nog niets voor vandaag. Zet erin wat af moet — drie dingen die echt tellen is genoeg.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((t) => {
            const prio = PRIORITY.find((p) => p.id === t.priority)!
            return (
              <li key={t.id}
                className={`group flex items-center gap-3 rounded-md border px-3 py-3 transition ${
                  t.done ? 'border-line/50 bg-panel2/30' : 'border-line bg-panel2/60 hover:border-accent/40'
                }`}>
                <button type="button" onClick={() => toggle(t.id)} aria-pressed={t.done}
                  aria-label={t.done ? 'Markeer als niet gedaan' : 'Markeer als gedaan'}
                  className={`num flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs transition ${
                    t.done ? 'border-transparent bg-accent text-base' : 'border-line text-transparent hover:border-accent'
                  }`}>
                  ✓
                </button>
                <span className="h-6 w-1 shrink-0 rounded-full"
                  style={{ background: DOMAIN_STYLE[t.domain].color }}
                  aria-label={DOMAIN_STYLE[t.domain].label} />
                <span className={`min-w-0 flex-1 truncate text-[15px] ${t.done ? 'text-muted line-through' : 'text-ink'}`}>
                  {t.title}
                </span>
                {t.repeat && t.repeat !== 'geen' && (
                  <span className="num shrink-0 text-[10px] text-muted">herhaalt</span>
                )}
                <button type="button" onClick={() => cyclePriority(t.id)}
                  className="num shrink-0 rounded px-2 py-1 text-[10px] uppercase tracking-wider transition hover:bg-line/40"
                  style={{ color: prio.color }} title="Prioriteit wisselen">
                  {prio.label}
                </button>
                <button type="button" onClick={() => remove(t.id)} aria-label="Verwijderen"
                  className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                  <X size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {list.length > 0 && (
        <p className="mt-3 border-t border-line/60 pt-2 text-[11px] text-muted">
          {open.length === 0
            ? 'Alles af voor vandaag.'
            : `Nog ${open.length} van ${list.length} te gaan · ${formatShort(dateKey)}`}
        </p>
      )}
    </div>
  )
}
