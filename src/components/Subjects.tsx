import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { DEFAULT_SUBJECTS, type Subject } from '../lib/school'
import { Empty } from './Hud'

const PALETTE = ['#3987e5', '#d95926', '#199e70', '#9085e9', '#d55181', '#c98500', '#6b8299']

export default function Subjects() {
  const { db, update } = useStore()

  function seed() {
    update((db) => {
      for (const s of DEFAULT_SUBJECTS) {
        if (!db.subjects.some((x) => x.name === s.name)) {
          db.subjects.push({ ...s, id: crypto.randomUUID() })
        }
      }
    })
  }

  function add() {
    update((db) => {
      db.subjects.push({
        id: crypto.randomUUID(),
        name: 'Nieuw vak',
        color: PALETTE[db.subjects.length % PALETTE.length],
        teacher: '',
      })
    })
  }

  function patch(id: string, changes: Partial<Subject>) {
    update((db) => {
      const s = db.subjects.find((x) => x.id === id)
      if (s) Object.assign(s, changes)
    })
  }

  function remove(id: string) {
    update((db) => {
      db.subjects = db.subjects.filter((s) => s.id !== id)
      for (const n of db.notes) if (n.subjectId === id) n.subjectId = null
      for (const d of db.decks) if (d.subjectId === id) d.subjectId = null
      for (const p of db.projects) if (p.subjectId === id) p.subjectId = null
      for (const p of db.presentations) if (p.subjectId === id) p.subjectId = null
    })
  }

  return (
    <div className="space-y-3">
      {db.subjects.length === 0 ? (
        <>
          <Empty>Nog geen vakken ingesteld.</Empty>
          <div className="flex justify-center gap-2">
            <button className="btn-primary" onClick={seed}>Vakken van Latijn-Wiskunde toevoegen</button>
            <button className="btn" onClick={add}>Zelf één toevoegen</button>
          </div>
        </>
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2">
            {db.subjects.map((s) => (
              <li key={s.id} className="group flex items-center gap-2 rounded-md border border-line bg-panel2/40 px-2.5 py-2">
                <input type="color" value={s.color} aria-label={`Kleur van ${s.name}`}
                  className="h-5 w-5 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                  onChange={(e) => patch(s.id, { color: e.target.value })} />
                <input className="min-w-0 flex-1 bg-transparent text-sm text-ink focus:outline-none"
                  value={s.name} aria-label="Naam van het vak"
                  onChange={(e) => patch(s.id, { name: e.target.value })} />
                <input className="w-24 shrink-0 bg-transparent text-right text-[11px] text-muted focus:outline-none"
                  value={s.teacher} placeholder="leerkracht" aria-label="Leerkracht"
                  onChange={(e) => patch(s.id, { teacher: e.target.value })} />
                <button onClick={() => remove(s.id)} aria-label={`${s.name} verwijderen`}
                  className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
          <button className="btn" onClick={add}><Plus size={14} /> Vak</button>
        </>
      )}
    </div>
  )
}
