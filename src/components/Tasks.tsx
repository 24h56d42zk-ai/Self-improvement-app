import { useState } from 'react'
import { Plus, Repeat as RepeatIcon, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { addDays } from '../lib/date'
import type { Domain, Repeat, Task } from '../lib/types'
import { periodFor } from '../lib/planning'
import { SERIES } from '../lib/palette'
import { Empty } from './Hud'

export const DOMAIN_STYLE: Record<Domain, { label: string; color: string }> = {
  school:   { label: 'School',      color: SERIES.blue },
  sport:    { label: 'Sport',       color: SERIES.orange },
  biz:      { label: 'Business',    color: SERIES.aqua },
  health:   { label: 'Gezondheid',  color: SERIES.violet },
  personal: { label: 'Persoonlijk', color: SERIES.magenta },
}

const PRIORITY_LABEL: Record<Task['priority'], string> = { 1: 'moet', 2: 'zou', 3: 'kan' }

const REPEATS: { id: Repeat; label: string }[] = [
  { id: 'geen',        label: 'Eenmalig' },
  { id: 'dagelijks',   label: 'Elke dag' },
  { id: 'wekelijks',   label: 'Elke week' },
  { id: 'maandelijks', label: 'Elke maand' },
]

function nextDate(date: string, repeat: Repeat): string | null {
  if (repeat === 'dagelijks') return addDays(date, 1)
  if (repeat === 'wekelijks') return addDays(date, 7)
  if (repeat === 'maandelijks') return addDays(date, 28)
  return null
}

export default function Tasks({ dateKey, full = false }: { dateKey: string; full?: boolean }) {
  const { db, update } = useStore()
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState<Domain>('school')
  const [goalId, setGoalId] = useState('')
  const [repeat, setRepeat] = useState<Repeat>('geen')

  const list = db.tasks
    .filter((t) => t.date === dateKey)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.priority - b.priority)

  // Alleen doelen van de week waarin deze dag valt: anders wordt de lijst onbruikbaar lang.
  const weekGoals = db.goals.filter(
    (g) => (g.horizon === 'week' && g.period === periodFor('week', dateKey)) ||
      (g.horizon === 'maand' && g.period === periodFor('maand', dateKey)),
  )

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
        priority: 2,
        domain,
        createdAt: new Date().toISOString(),
        goalId: goalId || null,
        repeat,
      })
    })
    setTitle('')
  }

  /** Een herhalende taak afvinken zet meteen de volgende klaar. */
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

  function remove(id: string) {
    update((draft) => { draft.tasks = draft.tasks.filter((t) => t.id !== id) })
  }

  function cyclePriority(id: string) {
    update((draft) => {
      const t = draft.tasks.find((x) => x.id === id)
      if (t) t.priority = (t.priority === 3 ? 1 : ((t.priority + 1) as Task['priority']))
    })
  }

  return (
    <div>
      <form onSubmit={add} className={full ? 'mb-3 grid gap-2 sm:grid-cols-7' : 'mb-3 flex gap-2'}>
        <input
          className={`input ${full ? 'sm:col-span-2' : 'flex-1'}`} placeholder="Taak toevoegen…"
          value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Nieuwe taak"
        />
        <select
          className={`input shrink-0 ${full ? '' : 'w-[112px]'}`} value={domain}
          onChange={(e) => setDomain(e.target.value as Domain)} aria-label="Categorie"
        >
          {(Object.keys(DOMAIN_STYLE) as Domain[]).map((d) => (
            <option key={d} value={d}>{DOMAIN_STYLE[d].label}</option>
          ))}
        </select>
        {full && (
          <>
            <select className="input" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)} aria-label="Herhaling">
              {REPEATS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
            <select className="input sm:col-span-2" value={goalId} onChange={(e) => setGoalId(e.target.value)} aria-label="Hoort bij doel">
              <option value="">Geen doel</option>
              {weekGoals.map((g) => <option key={g.id} value={g.id}>↳ {g.title}</option>)}
            </select>
          </>
        )}
        <button className="btn shrink-0 px-2.5" type="submit" aria-label="Toevoegen"><Plus size={16} /></button>
      </form>

      {list.length === 0 ? (
        <Empty>Geen taken voor deze dag.</Empty>
      ) : (
        <ul className="space-y-1">
          {list.map((t) => {
            const goal = t.goalId ? db.goals.find((g) => g.id === t.goalId) : null
            return (
              <li key={t.id} className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-line/30">
                <button
                  type="button" onClick={() => toggle(t.id)} aria-pressed={t.done}
                  aria-label={t.done ? 'Markeer als niet gedaan' : 'Markeer als gedaan'}
                  className={`num flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border text-[10px] ${
                    t.done ? 'border-transparent bg-accent text-base' : 'border-line text-transparent hover:border-accent'
                  }`}
                >
                  ✓
                </button>
                <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: DOMAIN_STYLE[t.domain].color }}
                  aria-label={DOMAIN_STYLE[t.domain].label} />
                <span className={`min-w-0 flex-1 truncate text-sm ${t.done ? 'text-muted line-through' : 'text-ink'}`}>
                  {t.title}
                  {goal && <span className="text-[11px] text-muted"> ↳ {goal.title}</span>}
                </span>
                {t.repeat && t.repeat !== 'geen' && (
                  <RepeatIcon size={11} className="shrink-0 text-muted" aria-label="Herhalende taak" />
                )}
                <button type="button" onClick={() => cyclePriority(t.id)}
                  className="num shrink-0 text-[10px] uppercase tracking-wider text-muted hover:text-accent"
                  title="Prioriteit wisselen">
                  {PRIORITY_LABEL[t.priority]}
                </button>
                <button type="button" onClick={() => remove(t.id)} aria-label="Verwijderen"
                  className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                  <X size={14} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
