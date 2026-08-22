import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { todayKey } from '../lib/date'
import {
  HORIZONS, goalPercent, periodFor, periodLabel, shiftPeriod, type Goal, type Horizon,
} from '../lib/planning'
import type { Domain } from '../lib/types'
import { DOMAIN_STYLE } from './Tasks'
import { STATUS } from '../lib/palette'
import { Bar, Empty } from './Hud'

export default function Goals() {
  const { db, update } = useStore()
  const today = todayKey()
  const [horizon, setHorizon] = useState<Horizon>('week')
  const [period, setPeriod] = useState(() => periodFor('week', today))
  const [title, setTitle] = useState('')
  const [domain, setDomain] = useState<Domain>('school')

  function switchHorizon(h: Horizon) {
    setHorizon(h)
    setPeriod(periodFor(h, today))
  }

  const goals = db.goals.filter((g) => g.horizon === horizon && g.period === period)
  // Doelen van een niveau hoger, om een doel aan op te hangen.
  const parentHorizon: Horizon | null = horizon === 'week' ? 'maand' : horizon === 'maand' ? 'jaar' : null
  const parents = parentHorizon
    ? db.goals.filter((g) => g.horizon === parentHorizon && g.period === periodFor(parentHorizon, today))
    : []

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const goal: Goal = {
      id: crypto.randomUUID(),
      title: title.trim(),
      horizon,
      period,
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
    setTitle('')
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
      for (const g of db.goals) if (g.parentId === id) g.parentId = null
      for (const t of db.tasks) if (t.goalId === id) t.goalId = null
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {HORIZONS.map((h) => (
            <button key={h.id} onClick={() => switchHorizon(h.id)} aria-pressed={horizon === h.id}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                horizon === h.id ? 'bg-accent/12 text-accent' : 'text-muted hover:text-ink'
              }`}>
              {h.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button className="btn px-1.5 py-1" aria-label="Vorige" onClick={() => setPeriod(shiftPeriod(horizon, period, -1))}>
            <ChevronLeft size={14} />
          </button>
          <span className="num min-w-[150px] text-center text-sm text-ink">{periodLabel(horizon, period)}</span>
          <button className="btn px-1.5 py-1" aria-label="Volgende" onClick={() => setPeriod(shiftPeriod(horizon, period, 1))}>
            <ChevronRight size={14} />
          </button>
        </div>
        {period !== periodFor(horizon, today) && (
          <button className="btn py-1 text-xs" onClick={() => setPeriod(periodFor(horizon, today))}>Naar nu</button>
        )}
      </div>

      <form onSubmit={add} className="flex gap-2">
        <input className="input flex-1" placeholder={`Doel voor deze ${horizon}…`} value={title}
          onChange={(e) => setTitle(e.target.value)} aria-label="Nieuw doel" />
        <select className="input w-[130px] shrink-0" value={domain} onChange={(e) => setDomain(e.target.value as Domain)}
          aria-label="Categorie">
          {(Object.keys(DOMAIN_STYLE) as Domain[]).map((d) => (
            <option key={d} value={d}>{DOMAIN_STYLE[d].label}</option>
          ))}
        </select>
        <button className="btn shrink-0 px-2.5" type="submit" aria-label="Doel toevoegen"><Plus size={16} /></button>
      </form>

      {goals.length === 0 ? (
        <Empty>
          Nog geen {horizon}doelen voor {periodLabel(horizon, period)}.
          {horizon === 'week' && ' Begin klein: drie dingen die deze week echt af moeten.'}
        </Empty>
      ) : (
        <ul className="space-y-2">
          {goals.map((g) => {
            const percent = goalPercent(g)
            const linked = db.tasks.filter((t) => t.goalId === g.id)
            const linkedDone = linked.filter((t) => t.done).length
            return (
              <li key={g.id} className="group rounded-md border border-line bg-panel2/40 p-3">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => patch(g.id, { done: !g.done })} aria-pressed={g.done}
                    aria-label={g.done ? 'Markeer als niet behaald' : 'Markeer als behaald'}
                    className={`num flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                      g.done ? 'border-transparent bg-accent text-base' : 'border-line text-transparent hover:border-accent'
                    }`}>
                    ✓
                  </button>
                  <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: DOMAIN_STYLE[g.domain].color }} aria-hidden />
                  <input className={`min-w-0 flex-1 bg-transparent text-sm focus:outline-none ${
                    g.done ? 'text-muted line-through' : 'text-ink'}`}
                    value={g.title} aria-label="Doel"
                    onChange={(e) => patch(g.id, { title: e.target.value })} />
                  <button onClick={() => remove(g.id)} aria-label="Doel verwijderen"
                    className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="number" className="input num w-20 py-1 text-xs" value={g.progress}
                    aria-label="Voortgang" onChange={(e) => patch(g.id, { progress: Number(e.target.value) || 0 })} />
                  <span className="text-xs text-muted">van</span>
                  <input type="number" className="input num w-20 py-1 text-xs" value={g.target ?? ''} placeholder="doel"
                    aria-label="Streefwaarde" onChange={(e) => patch(g.id, { target: e.target.value ? Number(e.target.value) : null })} />
                  <input className="input w-24 py-1 text-xs" value={g.unit} placeholder="eenheid"
                    aria-label="Eenheid" onChange={(e) => patch(g.id, { unit: e.target.value })} />
                  {parents.length > 0 && (
                    <select className="input w-auto py-1 text-xs" value={g.parentId ?? ''}
                      aria-label="Hoort bij"
                      onChange={(e) => patch(g.id, { parentId: e.target.value || null })}>
                      <option value="">Los doel</option>
                      {parents.map((p) => <option key={p.id} value={p.id}>↳ {p.title}</option>)}
                    </select>
                  )}
                  {linked.length > 0 && (
                    <span className="num text-[11px] text-muted">{linkedDone}/{linked.length} taken</span>
                  )}
                </div>

                {g.target !== null && (
                  <div className="mt-2">
                    <Bar value={percent} max={100} color={percent >= 100 ? STATUS.good : DOMAIN_STYLE[g.domain].color} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
