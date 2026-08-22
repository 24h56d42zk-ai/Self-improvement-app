import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { todayKey } from '../lib/date'
import { SESSION_STYLE, sessionsFor, type SessionKind } from '../lib/schedule'
import { TEMPLATES, type ExerciseEntry, type SessionLog } from '../lib/training'

interface Draft {
  date: string
  kind: SessionKind
  sessionId: string | null
  durationMin: string
  distanceKm: string
  rpe: string
  exercises: ExerciseEntry[]
  note: string
}

function blank(date: string): Draft {
  return { date, kind: 'hyrox', sessionId: null, durationMin: '', distanceKm: '', rpe: '', exercises: [], note: '' }
}

/** Sessie loggen. Een sjabloon vult alles in; daarna pas je aan wat afwijkt. */
export default function SessionForm({ onSaved }: { onSaved?: () => void }) {
  const { update, setDay } = useStore()
  const [draft, setDraft] = useState<Draft>(() => blank(todayKey()))
  const [saved, setSaved] = useState(false)

  const planned = sessionsFor(draft.date)

  function applyTemplate(id: string) {
    const t = TEMPLATES.find((x) => x.id === id)
    if (!t) return
    const match = sessionsFor(draft.date).find((s) => s.kind === t.kind)
    setDraft({
      ...draft,
      kind: t.kind,
      sessionId: match?.id ?? draft.sessionId,
      durationMin: String(t.durationMin),
      distanceKm: t.distanceKm === null ? '' : String(t.distanceKm),
      exercises: t.exercises.map((ex) => ({
        id: crypto.randomUUID(),
        name: ex.name,
        sets: Array.from({ length: ex.sets }, () => ({ reps: ex.reps, weightKg: ex.weightKg })),
      })),
    })
    setSaved(false)
  }

  function addExercise() {
    setDraft({
      ...draft,
      exercises: [...draft.exercises, { id: crypto.randomUUID(), name: '', sets: [{ reps: 8, weightKg: null }] }],
    })
  }

  function patchExercise(id: string, patch: Partial<ExerciseEntry>) {
    setDraft({ ...draft, exercises: draft.exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)) })
  }

  function removeExercise(id: string) {
    setDraft({ ...draft, exercises: draft.exercises.filter((e) => e.id !== id) })
  }

  function patchSet(exId: string, index: number, patch: { reps?: number; weightKg?: number | null }) {
    const ex = draft.exercises.find((e) => e.id === exId)
    if (!ex) return
    patchExercise(exId, { sets: ex.sets.map((s, i) => (i === index ? { ...s, ...patch } : s)) })
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    const log: SessionLog = {
      id: crypto.randomUUID(),
      date: draft.date,
      sessionId: draft.sessionId,
      kind: draft.kind,
      durationMin: draft.durationMin ? Number(draft.durationMin) : null,
      distanceKm: draft.distanceKm ? Number(draft.distanceKm) : null,
      rpe: draft.rpe ? Number(draft.rpe) : null,
      exercises: draft.exercises.filter((ex) => ex.name.trim() !== ''),
      note: draft.note.trim(),
    }
    update((db) => { db.sessionLogs.push(log) })
    // Een gelogde sessie vinkt meteen het weekschema af.
    setDay(draft.date, (d) => {
      if (log.sessionId) d.sessions[log.sessionId] = true
      else d.extra += 1
    })
    setDraft(blank(draft.date))
    setSaved(true)
    onSaved?.()
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <span className="label mb-1.5 block">Sjabloon</span>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" onClick={() => applyTemplate(t.id)}
              className="btn px-2.5 py-1 text-xs">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: SESSION_STYLE[t.kind].color }} aria-hidden />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <label className="block">
          <span className="label">Datum</span>
          <input type="date" className="input mt-1" value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value, sessionId: null })} />
        </label>
        <label className="block">
          <span className="label">Type</span>
          <select className="input mt-1" value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as SessionKind })}>
            {(Object.keys(SESSION_STYLE) as SessionKind[]).map((k) => (
              <option key={k} value={k}>{SESSION_STYLE[k].label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Uit schema</span>
          <select className="input mt-1" value={draft.sessionId ?? ''}
            onChange={(e) => setDraft({ ...draft, sessionId: e.target.value || null })}>
            <option value="">Extra sessie</option>
            {planned.map((s) => (
              <option key={s.id} value={s.id}>{s.slot} {SESSION_STYLE[s.kind].label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Duur (min)</span>
          <input type="number" inputMode="numeric" className="input mt-1" value={draft.durationMin}
            onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })} placeholder="60" />
        </label>
        <label className="block">
          <span className="label">Afstand (km)</span>
          <input type="number" step="0.1" inputMode="decimal" className="input mt-1" value={draft.distanceKm}
            onChange={(e) => setDraft({ ...draft, distanceKm: e.target.value })} placeholder="8" />
        </label>
      </div>

      <div>
        <span className="label mb-1.5 block">Hoe zwaar was het? (RPE)</span>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
            <button key={n} type="button" onClick={() => setDraft({ ...draft, rpe: draft.rpe === n ? '' : n })}
              aria-pressed={draft.rpe === n}
              className={`num h-8 w-8 rounded-md border text-xs transition ${
                draft.rpe === n ? 'border-accent bg-accent/15 text-accent' : 'border-line text-muted hover:border-accent/50'
              }`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label">Oefeningen</span>
          <button type="button" className="btn px-2 py-1 text-xs" onClick={addExercise}>
            <Plus size={13} /> Oefening
          </button>
        </div>
        {draft.exercises.length === 0 ? (
          <p className="text-xs text-muted">Geen oefeningen — prima voor een loop- of zwemsessie.</p>
        ) : (
          <ul className="space-y-2">
            {draft.exercises.map((ex) => (
              <li key={ex.id} className="rounded-md border border-line bg-panel2/50 p-2.5">
                <div className="flex items-center gap-2">
                  <input className="input flex-1" placeholder="Oefening" value={ex.name}
                    onChange={(e) => patchExercise(ex.id, { name: e.target.value })} />
                  <button type="button" onClick={() => removeExercise(ex.id)}
                    className="shrink-0 text-muted hover:text-bad" aria-label="Oefening verwijderen">
                    <X size={15} />
                  </button>
                </div>
                <ul className="mt-2 space-y-1">
                  {ex.sets.map((set, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="num w-8 shrink-0 text-[10px] uppercase text-muted">set {i + 1}</span>
                      <input type="number" inputMode="numeric" className="input w-20" value={set.reps}
                        aria-label={`Reps set ${i + 1}`}
                        onChange={(e) => patchSet(ex.id, i, { reps: Number(e.target.value) || 0 })} />
                      <span className="text-xs text-muted">×</span>
                      <input type="number" inputMode="decimal" className="input w-24" value={set.weightKg ?? ''}
                        placeholder="kg" aria-label={`Gewicht set ${i + 1}`}
                        onChange={(e) => patchSet(ex.id, i, { weightKg: e.target.value ? Number(e.target.value) : null })} />
                      <button type="button" className="ml-auto shrink-0 text-muted hover:text-bad"
                        aria-label={`Set ${i + 1} verwijderen`}
                        onClick={() => patchExercise(ex.id, { sets: ex.sets.filter((_, j) => j !== i) })}>
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn mt-2 px-2 py-1 text-xs"
                  onClick={() => patchExercise(ex.id, { sets: [...ex.sets, ex.sets[ex.sets.length - 1] ?? { reps: 8, weightKg: null }] })}>
                  <Plus size={12} /> Set
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="block">
        <span className="label">Notitie</span>
        <input className="input mt-1" value={draft.note}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          placeholder="bv. benen zwaar, sled voelde beter" />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary">Sessie opslaan</button>
        {saved && <span className="text-xs text-good">✓ opgeslagen</span>}
      </div>
    </form>
  )
}
