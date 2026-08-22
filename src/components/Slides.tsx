import { useState } from 'react'
import { ChevronDown, ChevronUp, Download, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { LAYOUTS, emptySlide, type Presentation, type Slide, type SlideLayout } from '../lib/school'
import { exportPptx, type Theme } from '../lib/pptx'
import { Empty } from './Hud'
import { subjectColor } from '../lib/schoolDerive'

export default function Slides() {
  const { db, update } = useStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [theme, setTheme] = useState<Theme>('licht')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = db.presentations.find((p) => p.id === selected) ?? null

  function create() {
    const p: Presentation = {
      id: crypto.randomUUID(),
      title: 'Nieuwe presentatie',
      subtitle: '',
      subjectId: db.subjects[0]?.id ?? null,
      slides: [
        { ...emptySlide('titel'), heading: 'Titel van je presentatie', subheading: 'Noa' },
        emptySlide('opsomming'),
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    update((db) => { db.presentations.push(p) })
    setSelected(p.id)
  }

  function patch(id: string, changes: Partial<Presentation>) {
    update((db) => {
      const p = db.presentations.find((x) => x.id === id)
      if (p) Object.assign(p, changes, { updatedAt: new Date().toISOString() })
    })
  }

  function patchSlide(presentationId: string, slideId: string, changes: Partial<Slide>) {
    const p = db.presentations.find((x) => x.id === presentationId)
    if (!p) return
    patch(presentationId, { slides: p.slides.map((s) => (s.id === slideId ? { ...s, ...changes } : s)) })
  }

  function move(presentationId: string, index: number, delta: number) {
    const p = db.presentations.find((x) => x.id === presentationId)
    if (!p) return
    const next = [...p.slides]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    patch(presentationId, { slides: next })
  }

  async function download() {
    if (!active) return
    setBusy(true); setError(null)
    try {
      await exportPptx(active, theme)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Exporteren mislukt')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      <div className="space-y-3">
        <button className="btn-primary w-full" onClick={create}><Plus size={15} /> Presentatie</button>
        {db.presentations.length === 0 ? (
          <Empty>Nog geen presentaties.</Empty>
        ) : (
          <ul className="space-y-1">
            {[...db.presentations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((p) => (
              <li key={p.id}>
                <button onClick={() => setSelected(p.id)}
                  className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition ${
                    selected === p.id ? 'bg-accent/10' : 'hover:bg-line/30'
                  }`}>
                  <span className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{ background: subjectColor(db, p.subjectId) }} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{p.title}</span>
                    <span className="block text-[11px] text-muted">{p.slides.length} slides</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {active ? (
        <div className="space-y-4">
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
              <span className="label">Stijl van de export</span>
              <select className="input mt-1" value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
                <option value="licht">Licht (veilig op een beamer)</option>
                <option value="donker">Donker (zoals dit dashboard)</option>
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" onClick={download} disabled={busy}>
              <Download size={15} /> {busy ? 'Bezig…' : 'Download .pptx'}
            </button>
            <button className="btn" onClick={() => patch(active.id, { slides: [...active.slides, emptySlide()] })}>
              <Plus size={15} /> Slide
            </button>
            <button className="btn hover:border-bad/60 hover:text-bad"
              onClick={() => { update((db) => { db.presentations = db.presentations.filter((p) => p.id !== active.id) }); setSelected(null) }}>
              <Trash2 size={15} />
            </button>
            <span className="text-[11px] text-muted">
              Je krijgt een echt PowerPoint-bestand dat je gewoon verder kan bewerken.
            </span>
          </div>
          {error && <p className="text-sm text-bad">✕ {error}</p>}

          <ul className="space-y-3">
            {active.slides.map((slide, index) => (
              <li key={slide.id} className="panel p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="num w-6 shrink-0 text-[11px] text-muted">{index + 1}</span>
                  <select className="input w-auto py-1 text-xs" value={slide.layout}
                    aria-label="Soort slide"
                    onChange={(e) => patchSlide(active.id, slide.id, { layout: e.target.value as SlideLayout })}>
                    {LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.label} — {l.hint}</option>)}
                  </select>
                  <div className="ml-auto flex gap-1">
                    <button className="btn px-1.5 py-1" aria-label="Omhoog" onClick={() => move(active.id, index, -1)}>
                      <ChevronUp size={13} />
                    </button>
                    <button className="btn px-1.5 py-1" aria-label="Omlaag" onClick={() => move(active.id, index, 1)}>
                      <ChevronDown size={13} />
                    </button>
                    <button className="btn px-1.5 py-1 hover:border-bad/60 hover:text-bad" aria-label="Slide verwijderen"
                      onClick={() => patch(active.id, { slides: active.slides.filter((s) => s.id !== slide.id) })}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <input className="input" aria-label="Titel van de slide"
                  placeholder={slide.layout === 'citaat' ? 'Het citaat zelf' : 'Titel van de slide'}
                  value={slide.heading}
                  onChange={(e) => patchSlide(active.id, slide.id, { heading: e.target.value })} />

                {(slide.layout === 'titel' || slide.layout === 'citaat') && (
                  <input className="input mt-2" aria-label="Ondertitel"
                    placeholder={slide.layout === 'citaat' ? 'Wie zei het' : 'Ondertitel of je naam'}
                    value={slide.subheading}
                    onChange={(e) => patchSlide(active.id, slide.id, { subheading: e.target.value })} />
                )}

                {slide.layout === 'opsomming' && (
                  <div className="mt-2 space-y-1.5">
                    {slide.bullets.map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-muted" aria-hidden>•</span>
                        <input className="input" value={b} aria-label={`Punt ${i + 1}`}
                          placeholder="Punt…"
                          onChange={(e) => patchSlide(active.id, slide.id, {
                            bullets: slide.bullets.map((x, j) => (j === i ? e.target.value : x)),
                          })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const next = [...slide.bullets]
                              next.splice(i + 1, 0, '')
                              patchSlide(active.id, slide.id, { bullets: next })
                            }
                          }} />
                        <button className="shrink-0 text-muted hover:text-bad" aria-label={`Punt ${i + 1} verwijderen`}
                          onClick={() => patchSlide(active.id, slide.id, {
                            bullets: slide.bullets.filter((_, j) => j !== i),
                          })}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button className="btn px-2 py-1 text-xs"
                      onClick={() => patchSlide(active.id, slide.id, { bullets: [...slide.bullets, ''] })}>
                      <Plus size={12} /> Punt
                    </button>
                    {slide.bullets.filter((b) => b.trim()).length > 6 && (
                      <p className="text-[11px] text-warn">! Meer dan zes punten op één slide — splits hem beter.</p>
                    )}
                  </div>
                )}

                <input className="input mt-2 text-xs" aria-label="Spreeknotities"
                  placeholder="Spreeknotities (komen in PowerPoint onder de slide)"
                  value={slide.notes}
                  onChange={(e) => patchSlide(active.id, slide.id, { notes: e.target.value })} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="panel flex items-center justify-center p-8">
          <p className="max-w-sm text-center text-sm text-muted">
            Bouw hier je structuur — titel, punten, spreeknotities — en download er een echte
            PowerPoint van. Laat mij in Claude Code de inhoud schrijven en zet die hier neer.
          </p>
        </div>
      )}
    </div>
  )
}
