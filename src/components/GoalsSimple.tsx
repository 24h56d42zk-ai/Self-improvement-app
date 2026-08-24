import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { todayKey } from '../lib/date'
import { goalPercent, periodFor, periodLabel, shiftPeriod, type Goal, type Horizon } from '../lib/planning'
import type { Domain } from '../lib/types'
import { DOMAIN_STYLE } from './Tasks'
import { STATUS } from '../lib/palette'
import { Bar } from './Hud'

const COLUMNS: { horizon: Horizon; title: string; hint: string }[] = [
  { horizon: 'jaar',  title: 'Dit jaar',  hint: 'de richting' },
  { horizon: 'maand', title: 'Deze maand', hint: 'de tussenstappen' },
  { horizon: 'week',  title: 'Deze week',  hint: 'wat je nu doet' },
]

/** Drie kolommen naast elkaar. Geen menu's, geen tabbladen: je ziet alles tegelijk. */
export default function GoalsSimple() {
  const { db, update } = useStore()
  const today = todayKey()
  const [offsets, setOffsets] = useState<Record<Horizon, number>>({ jaar: 0, maand: 0, week: 0 })

  function periodOf(horizon: Horizon): string {
    return shiftPeriod(horizon, periodFor(horizon, today), offsets[horizon])
  }

  function add(horizon: Horizon, title: string, domain: Domain) {
    if (!title.trim()) return
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: title.trim(),
      horizon,
      period: periodOf(horizon),
      domain,
      target: null,
      unit: '',
      progress: 0,
      done: false,
      parentId: null,
      note: '',
      createdAt: new Date().toISOString(),
    }
    update((db) => { db.goals.push(goal) })
  }

  function patch(id: string, changes: Partial<Goal>) {
    update((db) => {
      const g = db.goals.find((x) => x.id === id)
      if (g) Object.assign(g, changes)
    })
  }

  function remove(id: string) {
    update((db) => {
      db.goals = db.goals.filter((g) => g.id !== id)
      for (const t of db.tasks) if (t.goalId === id) t.goalId = null
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {COLUMNS.map(({ horizon, title, hint }) => (
        <Column
          key={horizon}
          horizon={horizon}
          title={title}
          hint={hint}
          period={periodOf(horizon)}
          offset={offsets[horizon]}
          onShift={(d) => setOffsets({ ...offsets, [horizon]: offsets[horizon] + d })}
          onReset={() => setOffsets({ ...offsets, [horizon]: 0 })}
          goals={db.goals.filter((g) => g.horizon === horizon && g.period === periodOf(horizon))}
          taskCount={(goalId) => {
            const linked = db.tasks.filter((t) => t.goalId === goalId)
            return { done: linked.filter((t) => t.done).length, total: linked.length }
          }}
          onAdd={(t, d) => add(horizon, t, d)}
          onPatch={patch}
          onRemove={remove}
        />
      ))}
    </div>
  )
}

function Column({
  horizon, title, hint, period, offset, onShift, onReset, goals, taskCount, onAdd, onPatch, onRemove,
}: {
  horizon: Horizon
  title: string
  hint: string
  period: string
  offset: number
  onShift: (delta: number) => void
  onReset: () => void
  goals: Goal[]
  taskCount: (goalId: string) => { done: number; total: number }
  onAdd: (title: string, domain: Domain) => void
  onPatch: (id: string, changes: Partial<Goal>) => void
  onRemove: (id: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [domain, setDomain] = useState<Domain>('school')

  return (
    <section className="panel p-4">
      <header className="mb-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-ink">{title}</h3>
          <div className="flex items-center gap-0.5">
            <button className="rounded px-1 text-muted hover:text-accent" aria-label="Vorige"
              onClick={() => onShift(-1)}><ChevronLeft size={13} /></button>
            <button className="rounded px-1 text-muted hover:text-accent" aria-label="Volgende"
              onClick={() => onShift(1)}><ChevronRight size={13} /></button>
          </div>
        </div>
        <p className="num mt-0.5 text-[10px] text-muted">
          {periodLabel(horizon, period)} · {hint}
          {offset !== 0 && (
            <button className="ml-2 text-accent hover:underline" onClick={onReset}>terug naar nu</button>
          )}
        </p>
      </header>

      <form className="mb-3 flex gap-1.5"
        onSubmit={(e) => { e.preventDefault(); onAdd(draft, domain); setDraft('') }}>
        <input className="input px-2 py-1.5 text-xs" placeholder="Doel toevoegen…" value={draft}
          aria-label={`Doel voor ${title.toLowerCase()}`} onChange={(e) => setDraft(e.target.value)} />
        <select className="input w-auto px-1 py-1.5 text-[10px]" value={domain} aria-label="Categorie"
          onChange={(e) => setDomain(e.target.value as Domain)}>
          {(Object.keys(DOMAIN_STYLE) as Domain[]).map((d) => (
            <option key={d} value={d}>{DOMAIN_STYLE[d].label}</option>
          ))}
        </select>
        <button className="btn shrink-0 px-2 py-1.5" type="submit" aria-label="Toevoegen"><Plus size={14} /></button>
      </form>

      {goals.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted">Nog geen doelen.</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((g) => {
            const linked = taskCount(g.id)
            const percent = goalPercent(g)
            return (
              <li key={g.id} className="group rounded-md border border-line bg-panel2/40 p-2.5">
                <div className="flex items-start gap-2">
                  <button onClick={() => onPatch(g.id, { done: !g.done })} aria-pressed={g.done}
                    aria-label={g.done ? 'Niet behaald' : 'Behaald'}
                    className={`num mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                      g.done ? 'border-transparent bg-accent text-base' : 'border-line text-transparent hover:border-accent'
                    }`}>
                    ✓
                  </button>
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-[2px]"
                    style={{ background: DOMAIN_STYLE[g.domain].color }} aria-hidden />
                  <input className={`min-w-0 flex-1 bg-transparent text-sm leading-tight focus:outline-none ${
                    g.done ? 'text-muted line-through' : 'text-ink'}`}
                    value={g.title} aria-label="Doel"
                    onChange={(e) => onPatch(g.id, { title: e.target.value })} />
                  <button onClick={() => onRemove(g.id)} aria-label="Verwijderen"
                    className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                    <Trash2 size={12} />
                  </button>
                </div>

                <div className="mt-1.5 flex items-center gap-1.5">
                  <input type="number" className="input num w-14 px-1.5 py-0.5 text-[10px]" value={g.progress}
                    aria-label="Voortgang" onChange={(e) => onPatch(g.id, { progress: Number(e.target.value) || 0 })} />
                  <span className="text-[10px] text-muted">van</span>
                  <input type="number" className="input num w-14 px-1.5 py-0.5 text-[10px]" value={g.target ?? ''}
                    placeholder="—" aria-label="Streefwaarde"
                    onChange={(e) => onPatch(g.id, { target: e.target.value ? Number(e.target.value) : null })} />
                  <input className="input w-14 px-1.5 py-0.5 text-[10px]" value={g.unit} placeholder="eenh."
                    aria-label="Eenheid" onChange={(e) => onPatch(g.id, { unit: e.target.value })} />
                  {linked.total > 0 && (
                    <span className="num ml-auto text-[10px] text-muted">{linked.done}/{linked.total} taken</span>
                  )}
                </div>

                {g.target !== null && (
                  <div className="mt-1.5">
                    <Bar value={percent} max={100} height={4}
                      color={percent >= 100 ? STATUS.good : DOMAIN_STYLE[g.domain].color} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
