import { useState } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { formatShort, todayKey } from '../lib/date'
import {
  GIP_PHASES, SOURCE_KINDS, citation, type Project, type Source,
} from '../lib/school'
import { projectStatus, subjectColor } from '../lib/schoolDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Bar, Empty } from './Hud'

export default function Projects() {
  const { db, update } = useStore()
  const today = todayKey()
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<'fases' | 'bronnen' | 'logboek'>('fases')

  const active = db.projects.find((p) => p.id === selected) ?? null

  function create(kind: Project['kind']) {
    const project: Project = {
      id: crypto.randomUUID(),
      name: kind === 'eindwerk' ? 'Eindwerk / GIP' : 'Nieuw project',
      subjectId: null,
      kind,
      deadline: null,
      description: '',
      phases: (kind === 'eindwerk' ? GIP_PHASES : ['Voorbereiden', 'Uitwerken', 'Afwerken'])
        .map((name) => ({ id: crypto.randomUUID(), name, due: null, done: false })),
      sources: [],
      log: [],
      createdAt: new Date().toISOString(),
    }
    update((db) => { db.projects.push(project) })
    setSelected(project.id)
  }

  function patch(id: string, changes: Partial<Project>) {
    update((db) => {
      const p = db.projects.find((x) => x.id === id)
      if (p) Object.assign(p, changes)
    })
  }

  function remove(id: string) {
    update((db) => { db.projects = db.projects.filter((p) => p.id !== id) })
    setSelected(null)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex gap-2">
          <button className="btn flex-1 text-xs" onClick={() => create('project')}><Plus size={14} /> Project</button>
          <button className="btn-primary flex-1 text-xs" onClick={() => create('eindwerk')}><Plus size={14} /> Eindwerk</button>
        </div>

        {db.projects.length === 0 ? (
          <Empty>Nog geen projecten.</Empty>
        ) : (
          <ul className="space-y-1.5">
            {[...db.projects]
              .sort((a, b) => (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
              .map((p) => {
                const st = projectStatus(p, today)
                return (
                  <li key={p.id}>
                    <button onClick={() => setSelected(p.id)}
                      className={`w-full rounded-md px-2.5 py-2 text-left transition ${
                        selected === p.id ? 'bg-accent/10' : 'hover:bg-line/30'
                      }`}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-[2px]"
                          style={{ background: subjectColor(db, p.subjectId) }} aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</span>
                        {p.kind === 'eindwerk' && (
                          <span className="num shrink-0 rounded bg-accent/15 px-1 py-0.5 text-[9px] text-accent">GIP</span>
                        )}
                      </div>
                      <div className="mt-1.5"><Bar value={st.percent} max={100}
                        color={st.behind ? STATUS.serious : SERIES.blue} height={4} /></div>
                      <div className="mt-1 flex justify-between text-[10px] text-muted">
                        <span>{st.done}/{st.total} fases</span>
                        <span className="num" style={st.behind ? { color: STATUS.serious } : undefined}>
                          {st.daysLeft === null ? 'geen deadline' : `nog ${st.daysLeft} d`}
                        </span>
                      </div>
                    </button>
                  </li>
                )
              })}
          </ul>
        )}
      </div>

      {active ? (
        <ProjectDetail
          project={active} tab={tab} setTab={setTab}
          onPatch={(c) => patch(active.id, c)} onRemove={() => remove(active.id)}
        />
      ) : (
        <div className="panel flex items-center justify-center p-8">
          <p className="max-w-sm text-center text-sm text-muted">
            Kies links een project. Een eindwerk komt met de negen fases van een GIP,
            een bronnenlijst en een logboek — dat laatste vraagt je school achteraf vaak.
          </p>
        </div>
      )}
    </div>
  )
}

function ProjectDetail({
  project, tab, setTab, onPatch, onRemove,
}: {
  project: Project
  tab: 'fases' | 'bronnen' | 'logboek'
  setTab: (t: 'fases' | 'bronnen' | 'logboek') => void
  onPatch: (changes: Partial<Project>) => void
  onRemove: () => void
}) {
  const { db } = useStore()
  const today = todayKey()
  const st = projectStatus(project, today)
  const [phaseName, setPhaseName] = useState('')
  const [log, setLog] = useState({ date: today, minutes: '45', what: '' })
  const [source, setSource] = useState<Omit<Source, 'id'>>({
    kind: 'boek', author: '', title: '', year: '', publisher: '', url: '', accessed: today, note: '',
  })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="label">Naam</span>
          <input className="input mt-1" value={project.name} onChange={(e) => onPatch({ name: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">Vak</span>
          <select className="input mt-1" value={project.subjectId ?? ''}
            onChange={(e) => onPatch({ subjectId: e.target.value || null })}>
            <option value="">Algemeen</option>
            {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Deadline</span>
          <input type="date" className="input mt-1" value={project.deadline ?? ''}
            onChange={(e) => onPatch({ deadline: e.target.value || null })} />
        </label>
      </div>

      <div className="panel grid grid-cols-2 gap-3 p-3 sm:grid-cols-4">
        <div>
          <div className="label">Voortgang</div>
          <div className="num mt-0.5 text-xl font-bold" style={{ color: st.behind ? STATUS.serious : SERIES.blue }}>
            {st.percent}%
          </div>
        </div>
        <div>
          <div className="label">Volgende fase</div>
          <div className="mt-0.5 truncate text-sm text-ink">{st.nextPhase?.name ?? 'alles klaar'}</div>
        </div>
        <div>
          <div className="label">Tijd erin</div>
          <div className="num mt-0.5 text-xl font-bold text-ink">
            {Math.round(st.minutesLogged / 60)}<span className="text-xs"> u</span>
          </div>
        </div>
        <div>
          <div className="label">Nog</div>
          <div className="num mt-0.5 text-xl font-bold" style={{ color: st.behind ? STATUS.serious : undefined }}>
            {st.daysLeft === null ? '—' : `${st.daysLeft}d`}
          </div>
        </div>
        {st.behind && (
          <p className="col-span-2 text-sm sm:col-span-4" style={{ color: STATUS.serious }}>
            ! Je loopt achter op je eigen planning. Zet de eerstvolgende fase deze week af.
          </p>
        )}
      </div>

      <nav className="flex gap-1" role="tablist">
        {(['fases', 'bronnen', 'logboek'] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize transition ${
              tab === t ? 'bg-accent/12 text-accent' : 'text-muted hover:text-ink'
            }`}>
            {t}
          </button>
        ))}
        <button className="btn ml-auto hover:border-bad/60 hover:text-bad" onClick={onRemove}>
          <Trash2 size={14} />
        </button>
      </nav>

      {tab === 'fases' && (
        <div className="space-y-2">
          {project.phases.map((phase) => (
            <div key={phase.id} className="group flex items-center gap-2.5 rounded-md border border-line bg-panel2/40 px-3 py-2">
              <button
                onClick={() => onPatch({
                  phases: project.phases.map((p) => (p.id === phase.id ? { ...p, done: !p.done } : p)),
                })}
                aria-pressed={phase.done} aria-label={phase.done ? 'Markeer als niet klaar' : 'Markeer als klaar'}
                className={`num flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                  phase.done ? 'border-transparent bg-accent text-base' : 'border-line text-transparent hover:border-accent'
                }`}>
                ✓
              </button>
              <input className={`min-w-0 flex-1 bg-transparent text-sm focus:outline-none ${
                phase.done ? 'text-muted line-through' : 'text-ink'}`}
                value={phase.name} aria-label="Naam van de fase"
                onChange={(e) => onPatch({
                  phases: project.phases.map((p) => (p.id === phase.id ? { ...p, name: e.target.value } : p)),
                })} />
              <input type="date" className="input w-auto shrink-0 py-1 text-xs" value={phase.due ?? ''}
                aria-label="Deadline van de fase"
                onChange={(e) => onPatch({
                  phases: project.phases.map((p) => (p.id === phase.id ? { ...p, due: e.target.value || null } : p)),
                })} />
              <button onClick={() => onPatch({ phases: project.phases.filter((p) => p.id !== phase.id) })}
                aria-label="Fase verwijderen"
                className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault()
            if (!phaseName.trim()) return
            onPatch({ phases: [...project.phases, { id: crypto.randomUUID(), name: phaseName.trim(), due: null, done: false }] })
            setPhaseName('')
          }}>
            <input className="input" placeholder="Fase toevoegen…" value={phaseName}
              onChange={(e) => setPhaseName(e.target.value)} />
            <button className="btn shrink-0 px-2.5" type="submit"><Plus size={15} /></button>
          </form>
        </div>
      )}

      {tab === 'bronnen' && (
        <div className="space-y-3">
          <form className="panel grid gap-3 p-3 sm:grid-cols-3" onSubmit={(e) => {
            e.preventDefault()
            if (!source.title.trim()) return
            onPatch({ sources: [...project.sources, { ...source, id: crypto.randomUUID() }] })
            setSource({ ...source, author: '', title: '', year: '', publisher: '', url: '', note: '' })
          }}>
            <label className="block">
              <span className="label">Soort</span>
              <select className="input mt-1" value={source.kind}
                onChange={(e) => setSource({ ...source, kind: e.target.value as Source['kind'] })}>
                {SOURCE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label className="block"><span className="label">Auteur</span>
              <input className="input mt-1" value={source.author}
                onChange={(e) => setSource({ ...source, author: e.target.value })} placeholder="Achternaam, V." /></label>
            <label className="block"><span className="label">Jaar</span>
              <input className="input mt-1" value={source.year}
                onChange={(e) => setSource({ ...source, year: e.target.value })} placeholder="2024" /></label>
            <label className="block sm:col-span-2"><span className="label">Titel</span>
              <input className="input mt-1" value={source.title}
                onChange={(e) => setSource({ ...source, title: e.target.value })} /></label>
            <label className="block"><span className="label">Uitgever</span>
              <input className="input mt-1" value={source.publisher}
                onChange={(e) => setSource({ ...source, publisher: e.target.value })} /></label>
            <label className="block sm:col-span-2"><span className="label">Link</span>
              <input className="input mt-1" value={source.url}
                onChange={(e) => setSource({ ...source, url: e.target.value })} /></label>
            <div className="flex items-end"><button className="btn-primary" type="submit">Bron toevoegen</button></div>
          </form>

          {project.sources.length === 0 ? (
            <Empty>Nog geen bronnen. Voeg ze toe terwijl je leest — achteraf terugzoeken kost veel meer tijd.</Empty>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="label">Bronnenlijst (APA)</span>
                <button className="btn px-2 py-1 text-xs"
                  onClick={() => navigator.clipboard?.writeText(
                    project.sources.map(citation).sort().join('\n\n'))}>
                  <Copy size={12} /> Kopieer alles
                </button>
              </div>
              <ul className="space-y-1.5">
                {project.sources.map((s) => (
                  <li key={s.id} className="group flex items-start gap-2.5 rounded px-1.5 py-1.5 hover:bg-line/30">
                    <span className="num w-16 shrink-0 text-[10px] uppercase text-muted">{s.kind}</span>
                    <span className="min-w-0 flex-1 text-sm text-ink/85">{citation(s)}</span>
                    <button onClick={() => onPatch({ sources: project.sources.filter((x) => x.id !== s.id) })}
                      aria-label="Bron verwijderen"
                      className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                      <Trash2 size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {tab === 'logboek' && (
        <div className="space-y-3">
          <form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => {
            e.preventDefault()
            if (!log.what.trim()) return
            onPatch({ log: [...project.log, { id: crypto.randomUUID(), date: log.date, minutes: Number(log.minutes) || 0, what: log.what.trim() }] })
            setLog({ ...log, what: '' })
          }}>
            <label className="block"><span className="label">Datum</span>
              <input type="date" className="input mt-1" value={log.date}
                onChange={(e) => setLog({ ...log, date: e.target.value })} /></label>
            <label className="block"><span className="label">Minuten</span>
              <input type="number" className="input mt-1" value={log.minutes}
                onChange={(e) => setLog({ ...log, minutes: e.target.value })} /></label>
            <label className="block sm:col-span-2"><span className="label">Wat heb je gedaan?</span>
              <input className="input mt-1" value={log.what} placeholder="bv. drie bronnen gelezen en samengevat"
                onChange={(e) => setLog({ ...log, what: e.target.value })} /></label>
            <div className="sm:col-span-4"><button className="btn-primary" type="submit">Toevoegen</button></div>
          </form>

          {project.log.length === 0 ? (
            <Empty>Nog niets gelogd. Eén regel per werksessie is genoeg — je school vraagt dit vaak achteraf.</Empty>
          ) : (
            <ul className="space-y-1">
              {[...project.log].sort((a, b) => b.date.localeCompare(a.date)).map((l) => (
                <li key={l.id} className="group flex items-center gap-3 rounded px-1.5 py-1 text-sm hover:bg-line/30">
                  <span className="num w-11 shrink-0 text-[11px] text-muted">{formatShort(l.date)}</span>
                  <span className="num w-12 shrink-0 text-[11px] text-muted">{l.minutes}m</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{l.what}</span>
                  <button onClick={() => onPatch({ log: project.log.filter((x) => x.id !== l.id) })}
                    aria-label="Regel verwijderen"
                    className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                    <Trash2 size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
