import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import type { Lesson } from '../lib/planning'
import { subjectColor } from '../lib/schoolDerive'
import { Empty } from './Hud'

const DAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']

/** Vast weekrooster. Eén keer invullen; daarna weet de app wanneer je vrij bent. */
export default function Lessons() {
  const { db, update } = useStore()
  const [draft, setDraft] = useState({ weekday: 1, start: '08:30', end: '09:20', subjectId: '', room: '' })

  function add(e: React.FormEvent) {
    e.preventDefault()
    const lesson: Lesson = {
      id: crypto.randomUUID(),
      weekday: draft.weekday,
      start: draft.start,
      end: draft.end,
      subjectId: draft.subjectId || null,
      room: draft.room.trim(),
    }
    update((db) => { db.lessons.push(lesson) })
  }

  function remove(id: string) {
    update((db) => { db.lessons = db.lessons.filter((l) => l.id !== id) })
  }

  const byDay = Array.from({ length: 5 }, (_, i) =>
    db.lessons.filter((l) => l.weekday === i + 1).sort((a, b) => a.start.localeCompare(b.start)))

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-5">
        <label className="block"><span className="label">Dag</span>
          <select className="input mt-1" value={draft.weekday}
            onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })}>
            {DAYS.slice(0, 5).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
          </select></label>
        <label className="block"><span className="label">Van</span>
          <input type="time" className="input mt-1" value={draft.start}
            onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></label>
        <label className="block"><span className="label">Tot</span>
          <input type="time" className="input mt-1" value={draft.end}
            onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></label>
        <label className="block"><span className="label">Vak</span>
          <select className="input mt-1" value={draft.subjectId}
            onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}>
            <option value="">Kies…</option>
            {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        <div className="flex items-end gap-2">
          <input className="input" value={draft.room} placeholder="lokaal" aria-label="Lokaal"
            onChange={(e) => setDraft({ ...draft, room: e.target.value })} />
          <button className="btn shrink-0 px-2.5" type="submit" aria-label="Les toevoegen"><Plus size={16} /></button>
        </div>
      </form>

      {db.subjects.length === 0 && (
        <p className="text-sm text-warn">! Stel eerst je vakken in bij School → Overzicht.</p>
      )}

      {db.lessons.length === 0 ? (
        <Empty>Nog geen lesrooster. Eén keer invullen en het staat er voor het hele jaar.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {byDay.map((lessons, i) => (
            <div key={i} className="panel p-3">
              <div className="label mb-2">{DAYS[i]}</div>
              {lessons.length === 0 ? (
                <p className="text-[11px] text-muted">vrij</p>
              ) : (
                <ul className="space-y-1">
                  {lessons.map((l) => (
                    <li key={l.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-line/30">
                      <span className="h-5 w-1 shrink-0 rounded-full" style={{ background: subjectColor(db, l.subjectId) }} aria-hidden />
                      <span className="num shrink-0 text-[10px] text-muted">{l.start}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-ink">
                        {db.subjects.find((s) => s.id === l.subjectId)?.name ?? '—'}
                      </span>
                      {l.room && <span className="num shrink-0 text-[10px] text-muted">{l.room}</span>}
                      <button onClick={() => remove(l.id)} aria-label="Les verwijderen"
                        className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                        <Trash2 size={11} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
