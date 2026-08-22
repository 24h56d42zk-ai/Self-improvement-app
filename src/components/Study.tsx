import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { todayKey } from '../lib/date'
import { GRADES, parseCards, type CardDeck, type CardGrade } from '../lib/school'
import { deckStats, dueCards, newCard, recordReview, schedule, subjectColor } from '../lib/schoolDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Bar, Empty } from './Hud'

export default function Study() {
  const { db, update } = useStore()
  const today = todayKey()
  const [active, setActive] = useState<string | null>(null)
  const [mode, setMode] = useState<'lijst' | 'overhoren' | 'toevoegen'>('lijst')

  const decks = useMemo(
    () => db.decks.map((d) => ({ deck: d, stats: deckStats(db.cards.filter((c) => c.deckId === d.id), today) })),
    [db.decks, db.cards, today],
  )
  const totalDue = decks.reduce((n, d) => n + d.stats.due, 0)

  function createDeck() {
    const deck: CardDeck = {
      id: crypto.randomUUID(),
      subjectId: db.subjects[0]?.id ?? null,
      name: 'Nieuwe stapel',
      createdAt: new Date().toISOString(),
    }
    update((db) => { db.decks.push(deck) })
    setActive(deck.id)
    setMode('toevoegen')
  }

  function removeDeck(id: string) {
    update((db) => {
      db.decks = db.decks.filter((d) => d.id !== id)
      db.cards = db.cards.filter((c) => c.deckId !== id)
    })
    if (active === id) setActive(null)
  }

  if (active && mode === 'overhoren') {
    return <Review deckId={active} onDone={() => setMode('lijst')} />
  }
  if (active && mode === 'toevoegen') {
    return <AddCards deckId={active} onDone={() => setMode('lijst')} />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {totalDue === 0
            ? 'Niets te herhalen vandaag.'
            : <><span className="num text-accent">{totalDue}</span> {totalDue === 1 ? 'kaart staat' : 'kaarten staan'} klaar om te herhalen.</>}
        </p>
        <button className="btn-primary shrink-0" onClick={createDeck}><Plus size={15} /> Stapel</button>
      </div>

      {decks.length === 0 ? (
        <Empty>
          Nog geen stapels. Maak er een voor bijvoorbeeld Latijnse woordenschat of wiskundeformules —
          je kan een hele lijst in één keer plakken.
        </Empty>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {decks.map(({ deck, stats }) => (
            <li key={deck.id} className="panel group p-4">
              <div className="mb-2 flex items-start gap-2">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: subjectColor(db, deck.subjectId) }} aria-hidden />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink focus:outline-none"
                  value={deck.name} aria-label="Naam van de stapel"
                  onChange={(e) => update((db) => {
                    const d = db.decks.find((x) => x.id === deck.id)
                    if (d) d.name = e.target.value
                  })}
                />
                <button onClick={() => removeDeck(deck.id)} aria-label="Stapel verwijderen"
                  className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                  <Trash2 size={13} />
                </button>
              </div>

              <select className="input mb-3 py-1 text-xs" value={deck.subjectId ?? ''}
                aria-label="Vak"
                onChange={(e) => update((db) => {
                  const d = db.decks.find((x) => x.id === deck.id)
                  if (d) d.subjectId = e.target.value || null
                })}>
                <option value="">Algemeen</option>
                {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <div className="mb-1 flex items-baseline justify-between text-[11px] text-muted">
                <span>{stats.total} kaarten</span>
                <span className="num" style={{ color: stats.due > 0 ? STATUS.warning : STATUS.good }}>
                  {stats.due} te doen
                </span>
              </div>
              <Bar value={stats.mature} max={Math.max(1, stats.total)} color={SERIES.blue} />
              <div className="mt-1 flex gap-3 text-[10px] text-muted">
                <span>{stats.fresh} nieuw</span>
                <span>{stats.learning} bezig</span>
                <span>{stats.mature} vast</span>
              </div>

              <div className="mt-3 flex gap-2">
                <button className="btn-primary flex-1 py-1.5 text-xs" disabled={stats.due === 0}
                  onClick={() => { setActive(deck.id); setMode('overhoren') }}>
                  Overhoren
                </button>
                <button className="btn py-1.5 text-xs"
                  onClick={() => { setActive(deck.id); setMode('toevoegen') }}>
                  Kaarten
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Overhoormodus ──────────────────────────────────────────────────────── */

function Review({ deckId, onDone }: { deckId: string; onDone: () => void }) {
  const { db, update } = useStore()
  const today = todayKey()
  const [revealed, setRevealed] = useState(false)
  const [done, setDone] = useState(0)

  const queue = dueCards(db, deckId, today)
  const card = queue[0]
  const deck = db.decks.find((d) => d.id === deckId)

  function answer(grade: CardGrade) {
    if (!card) return
    update((db) => {
      const target = db.cards.find((c) => c.id === card.id)
      if (target) Object.assign(target, schedule(target, grade, today))
      recordReview(db, deckId, grade, today)
    })
    setRevealed(false)
    setDone(done + 1)
  }

  if (!card) {
    return (
      <div className="panel-hud flex flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="num text-3xl font-bold text-accent">{done}</p>
        <p className="text-sm text-ink">kaarten herhaald. Klaar voor vandaag.</p>
        <button className="btn-primary" onClick={onDone}>Terug naar stapels</button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>{deck?.name}</span>
        <span className="num">{done} gedaan · {queue.length} te gaan</span>
      </div>
      <Bar value={done} max={done + queue.length} color={SERIES.blue} />

      <div className="panel-hud flex min-h-[280px] flex-col items-center justify-center gap-6 p-8 text-center">
        <p className="text-xl text-ink">{card.front}</p>
        {revealed ? (
          <p className="border-t border-line pt-6 text-lg" style={{ color: SERIES.blue }}>{card.back}</p>
        ) : (
          <button className="btn-primary" onClick={() => setRevealed(true)}>Toon antwoord</button>
        )}
      </div>

      {revealed && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GRADES.map((g) => (
            <button key={g.id} className="btn flex-col gap-0 py-2.5" onClick={() => answer(g.id)}>
              <span className="text-sm">{g.label}</span>
              <span className="text-[10px] text-muted">{g.hint}</span>
            </button>
          ))}
        </div>
      )}

      <button className="btn w-full" onClick={onDone}>Stoppen</button>
      <p className="text-center text-[11px] text-muted">
        Wat je goed kent komt steeds later terug; wat je mist meteen weer.
      </p>
    </div>
  )
}

/* ── Kaarten beheren en inladen ─────────────────────────────────────────── */

function AddCards({ deckId, onDone }: { deckId: string; onDone: () => void }) {
  const { db, update } = useStore()
  const today = todayKey()
  const [bulk, setBulk] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')

  const deck = db.decks.find((d) => d.id === deckId)
  const cards = db.cards.filter((c) => c.deckId === deckId)
  const preview = parseCards(bulk)

  function addOne(e: React.FormEvent) {
    e.preventDefault()
    if (!front.trim() || !back.trim()) return
    update((db) => { db.cards.push(newCard(deckId, front.trim(), back.trim(), today)) })
    setFront(''); setBack('')
  }

  function addBulk() {
    if (preview.length === 0) return
    update((db) => {
      for (const p of preview) db.cards.push(newCard(deckId, p.front, p.back, today))
    })
    setBulk('')
  }

  function removeCard(id: string) {
    update((db) => { db.cards = db.cards.filter((c) => c.id !== id) })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm text-ink">{deck?.name} — {cards.length} kaarten</h3>
        <button className="btn" onClick={onDone}>Terug</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <span className="label mb-2 block">Lijst plakken</span>
          <p className="mb-2 text-[11px] text-muted">
            Eén per regel, met <span className="num">=</span>, <span className="num">-</span> of een tab ertussen.
            Bijvoorbeeld <span className="num">bellum = oorlog</span>.
          </p>
          <textarea className="input min-h-[180px] resize-y" value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={'bellum = oorlog\nvirtus = moed, deugd\nimperium = heerschappij'} />
          <div className="mt-2 flex items-center gap-3">
            <button className="btn-primary" onClick={addBulk} disabled={preview.length === 0}>
              {preview.length} {preview.length === 1 ? 'kaart' : 'kaarten'} toevoegen
            </button>
            {bulk.trim() && preview.length === 0 && (
              <span className="text-xs text-warn">! Geen regel herkend — staat er een = of - tussen?</span>
            )}
          </div>
        </div>

        <form onSubmit={addOne} className="panel p-4">
          <span className="label mb-2 block">Eén kaart</span>
          <label className="block">
            <span className="label">Voorkant</span>
            <input className="input mt-1" value={front} onChange={(e) => setFront(e.target.value)} />
          </label>
          <label className="mt-3 block">
            <span className="label">Achterkant</span>
            <input className="input mt-1" value={back} onChange={(e) => setBack(e.target.value)} />
          </label>
          <button className="btn-primary mt-3" type="submit">Toevoegen</button>
        </form>
      </div>

      {cards.length > 0 && (
        <div className="panel p-4">
          <span className="label mb-2 block">Alle kaarten</span>
          <ul className="max-h-[360px] space-y-1 overflow-y-auto">
            {cards.map((c) => (
              <li key={c.id} className="group flex items-center gap-3 rounded px-1.5 py-1 text-sm hover:bg-line/30">
                <span className="min-w-0 flex-1 truncate text-ink">{c.front}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{c.back}</span>
                <span className="num w-20 shrink-0 text-right text-[10px] text-muted">
                  {c.reps === 0 ? 'nieuw' : `${c.interval}d`}
                </span>
                <button onClick={() => removeCard(c.id)} aria-label="Kaart verwijderen"
                  className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
