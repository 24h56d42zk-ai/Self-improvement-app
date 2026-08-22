import { useMemo, useState } from 'react'
import { ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { formatShort } from '../lib/date'
import type { Note } from '../lib/school'
import { subjectColor } from '../lib/schoolDerive'
import { Empty } from './Hud'

/** Samenvattingen: typen of plakken, doorzoekbaar, met een link naar het origineel. */
export default function Notes() {
  const { db, update } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState<string>('alle')

  const notes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return db.notes
      .filter((n) =>
        (subject === 'alle' || n.subjectId === subject) &&
        (q === '' || `${n.title} ${n.chapter} ${n.content} ${n.tags.join(' ')}`.toLowerCase().includes(q)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [db.notes, query, subject])

  const active = db.notes.find((n) => n.id === selected) ?? null

  function create() {
    const note: Note = {
      id: crypto.randomUUID(),
      subjectId: db.subjects[0]?.id ?? null,
      title: 'Nieuwe samenvatting',
      chapter: '',
      content: '',
      link: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    update((db) => { db.notes.push(note) })
    setSelected(note.id)
  }

  function patch(id: string, changes: Partial<Note>) {
    update((db) => {
      const n = db.notes.find((x) => x.id === id)
      if (n) Object.assign(n, changes, { updatedAt: new Date().toISOString() })
    })
  }

  function remove(id: string) {
    update((db) => { db.notes = db.notes.filter((n) => n.id !== id) })
    if (selected === id) setSelected(null)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input className="input" placeholder="Zoeken…" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Zoeken in samenvattingen" />
          <button className="btn-primary shrink-0 px-2.5" onClick={create} aria-label="Nieuwe samenvatting">
            <Plus size={16} />
          </button>
        </div>
        <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Vak">
          <option value="alle">Alle vakken</option>
          {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {notes.length === 0 ? (
          <Empty>Nog geen samenvattingen.</Empty>
        ) : (
          <ul className="space-y-1">
            {notes.map((n) => (
              <li key={n.id}>
                <button onClick={() => setSelected(n.id)}
                  className={`flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition ${
                    selected === n.id ? 'bg-accent/10' : 'hover:bg-line/30'
                  }`}>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-[2px]"
                    style={{ background: subjectColor(db, n.subjectId) }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{n.title}</span>
                    <span className="block truncate text-[11px] text-muted">
                      {n.chapter || 'geen hoofdstuk'} · {formatShort(n.updatedAt.slice(0, 10))}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block sm:col-span-2">
              <span className="label">Titel</span>
              <input className="input mt-1" value={active.title}
                onChange={(e) => patch(active.id, { title: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Vak</span>
              <select className="input mt-1" value={active.subjectId ?? ''}
                onChange={(e) => patch(active.id, { subjectId: e.target.value || null })}>
                <option value="">Algemeen</option>
                {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Hoofdstuk</span>
              <input className="input mt-1" value={active.chapter} placeholder="Hfst. 3"
                onChange={(e) => patch(active.id, { chapter: e.target.value })} />
            </label>
            <label className="block sm:col-span-3">
              <span className="label">Link naar het originele bestand</span>
              <input className="input mt-1" value={active.link} placeholder="https://drive.google.com/…"
                onChange={(e) => patch(active.id, { link: e.target.value })} />
            </label>
            <div className="flex items-end gap-2">
              {active.link && (
                <a className="btn" href={active.link} target="_blank" rel="noreferrer noopener">
                  <ExternalLink size={14} /> Openen
                </a>
              )}
              <button className="btn hover:border-bad/60 hover:text-bad" onClick={() => remove(active.id)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <label className="block">
            <span className="label">Samenvatting</span>
            <textarea className="input mt-1 min-h-[420px] resize-y font-[inherit] leading-relaxed"
              value={active.content} placeholder="Typ of plak hier je samenvatting…"
              onChange={(e) => patch(active.id, { content: e.target.value })} />
          </label>
          <p className="text-[11px] text-muted">
            Alles wat je hier typt is doorzoekbaar en staat ook op je gsm. Het originele bestand hou je
            in Drive of OneDrive en link je hierboven — zo blijft je database licht.
          </p>
        </div>
      ) : (
        <div className="panel flex items-center justify-center p-8">
          <p className="max-w-sm text-center text-sm text-muted">
            Kies links een samenvatting, of maak er een nieuwe. Tip: laat mij in Claude Code je
            samenvatting maken uit je cursus, en plak hem hier — dan staat hij meteen op je gsm.
          </p>
        </div>
      )}
    </div>
  )
}
