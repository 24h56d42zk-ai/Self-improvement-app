import { useMemo, useState } from 'react'
import { BookOpen, Plus, Quote as QuoteIcon, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { formatShort, todayKey } from '../lib/date'
import { STATUSES, coverColor, progressPercent, type Book, type BookStatus } from '../lib/books'
import { bookStats } from '../lib/booksDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Bar, Empty, Panel, Ring } from '../components/Hud'

export default function Boeken() {
  const { db, update, setDay } = useStore()
  const today = todayKey()
  const [selected, setSelected] = useState<string | null>(null)
  const [filter, setFilter] = useState<BookStatus | 'alle'>('alle')

  const stats = useMemo(() => bookStats(db, today), [db, today])
  const books = useMemo(
    () => db.books
      .filter((b) => filter === 'alle' || b.status === filter)
      .sort((a, b) => {
        const order: BookStatus[] = ['bezig', 'wil-lezen', 'gelezen', 'gestopt']
        return order.indexOf(a.status) - order.indexOf(b.status) ||
          (b.finished ?? b.createdAt).localeCompare(a.finished ?? a.createdAt)
      }),
    [db.books, filter],
  )
  const active = db.books.find((b) => b.id === selected) ?? null

  function create() {
    const book: Book = {
      id: crypto.randomUUID(),
      title: 'Nieuw boek', author: '', category: '',
      pages: null, currentPage: 0, status: 'bezig',
      started: today, finished: null, rating: null, coverUrl: '',
      coreIdea: '', summary: '', quotes: [],
      createdAt: new Date().toISOString(),
    }
    update((db) => { db.books.push(book) })
    setSelected(book.id)
  }

  function patch(id: string, changes: Partial<Book>) {
    update((db) => {
      const b = db.books.find((x) => x.id === id)
      if (b) Object.assign(b, changes)
    })
  }

  /** Leesvoortgang loggen vinkt meteen de leesregel van 75 Hard af. */
  function logReading(book: Book, pages: number, minutes: number) {
    update((db) => {
      db.reading.push({ id: crypto.randomUUID(), date: today, bookId: book.id, pages, minutes })
      const b = db.books.find((x) => x.id === book.id)
      if (b) {
        b.currentPage = Math.max(b.currentPage, b.currentPage + pages)
        if (b.pages && b.currentPage >= b.pages) {
          b.status = 'gelezen'
          b.finished = b.finished ?? today
        }
      }
    })
    if (minutes >= 10) setDay(today, (d) => { d.hard75.read = true })
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="num text-2xl font-bold text-ink">BOEKEN</h1>
          <p className="text-sm text-muted">
            {stats.finishedThisYear} dit jaar gelezen · {stats.reading} bezig · {stats.quotes} citaten bewaard
          </p>
        </div>
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value as BookStatus | 'alle')}
          aria-label="Filter">
          <option value="alle">Alles</option>
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
        <Panel hud title="Jaardoel" className="flex flex-col items-center justify-center">
          <Ring
            value={stats.goal > 0 ? (stats.finishedThisYear / stats.goal) * 100 : 0}
            color={SERIES.magenta}
            label="van je doel"
            sub={`${stats.finishedThisYear} / ${stats.goal}`}
          />
          <label className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            doel dit jaar
            <input type="number" min="1" className="input num w-16 px-2 py-1 text-xs" value={db.bookGoal}
              onChange={(e) => update((db) => { db.bookGoal = Math.max(1, Number(e.target.value) || 1) })} />
          </label>
        </Panel>

        <Panel title="Dit jaar">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Gelezen', value: stats.finishedThisYear, color: SERIES.magenta },
              { label: 'Pagina\'s', value: stats.pagesThisYear.toLocaleString('nl-BE'), color: undefined },
              { label: 'Aan het lezen', value: stats.reading, color: undefined },
              { label: 'Op dit tempo', value: stats.pace === null ? '—' : `${stats.pace}/jaar`, color: stats.pace !== null && stats.pace >= db.bookGoal ? STATUS.good : STATUS.warning },
            ].map((s) => (
              <div key={s.label}>
                <div className="label truncate">{s.label}</div>
                <div className="num mt-0.5 text-xl font-bold" style={s.color ? { color: s.color } : undefined}>{s.value}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-line/60 pt-3 text-[11px] text-muted">
            Log je 10 minuten lezen bij een boek, dan vinkt dat meteen je leesregel van 75 Hard af.
          </p>
        </Panel>
      </div>

      <Panel hud title="Je boekenplank"
        right={<button className="btn px-2 py-1 text-xs" onClick={create}><Plus size={13} /> Boek</button>}>
        {books.length === 0 ? (
          <Empty>Nog geen boeken. Voeg het boek toe dat je nu leest.</Empty>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
            {books.map((b) => {
              const percent = progressPercent(b)
              return (
                <li key={b.id}>
                  <button onClick={() => setSelected(b.id === selected ? null : b.id)}
                    className={`group block w-full text-left transition ${b.id === selected ? 'opacity-100' : 'opacity-90 hover:opacity-100'}`}>
                    <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-md border ${
                      b.id === selected ? 'border-accent shadow-hud' : 'border-line'
                    }`}
                      style={{ background: coverColor(b.title) }}>
                      {b.coverUrl ? (
                        <img src={b.coverUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full flex-col justify-between p-2.5">
                          <span className="line-clamp-4 text-[11px] font-semibold leading-tight text-white/90">{b.title}</span>
                          <span className="truncate text-[10px] text-white/60">{b.author}</span>
                        </div>
                      )}
                      {b.status === 'gelezen' && (
                        <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white">✓</span>
                      )}
                      {(b.status === 'wil-lezen' || b.status === 'gestopt') && (
                        <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1 py-0.5 text-[8px] uppercase tracking-wider text-white/70">
                          {b.status === 'wil-lezen' ? 'later' : 'gestopt'}
                        </span>
                      )}
                      {b.status === 'bezig' && percent > 0 && (
                        <span className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
                          <span className="block h-full" style={{ width: `${percent}%`, background: SERIES.magenta }} />
                        </span>
                      )}
                    </div>
                    {b.coverUrl && (
                      <>
                        <p className="mt-1.5 truncate text-[11px] text-ink">{b.title}</p>
                        <p className="truncate text-[10px] text-muted">{b.author || '—'}</p>
                      </>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {active && <BookDetail book={active} onPatch={(c) => patch(active.id, c)} onLog={logReading}
        onClose={() => setSelected(null)}
        onRemove={() => { update((db) => { db.books = db.books.filter((b) => b.id !== active.id) }); setSelected(null) }} />}
    </div>
  )
}

function BookDetail({
  book, onPatch, onLog, onClose, onRemove,
}: {
  book: Book
  onPatch: (changes: Partial<Book>) => void
  onLog: (book: Book, pages: number, minutes: number) => void
  onClose: () => void
  onRemove: () => void
}) {
  const [quote, setQuote] = useState({ text: '', page: '' })
  const [session, setSession] = useState({ pages: '15', minutes: '15' })
  const percent = progressPercent(book)

  return (
    <Panel hud title={book.title}
      right={
        <div className="flex gap-1">
          <button className="btn px-2 py-1 text-xs" onClick={onClose}>Sluiten</button>
          <button className="btn px-2 py-1 text-xs hover:border-bad/60 hover:text-bad" onClick={onRemove}>
            <Trash2 size={12} />
          </button>
        </div>
      }>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block sm:col-span-2"><span className="label">Titel</span>
              <input className="input mt-1" value={book.title} onChange={(e) => onPatch({ title: e.target.value })} /></label>
            <label className="block"><span className="label">Auteur</span>
              <input className="input mt-1" value={book.author} onChange={(e) => onPatch({ author: e.target.value })} /></label>
            <label className="block"><span className="label">Categorie</span>
              <input className="input mt-1" value={book.category} placeholder="non-fictie, roman…"
                onChange={(e) => onPatch({ category: e.target.value })} /></label>
            <label className="block"><span className="label">Status</span>
              <select className="input mt-1" value={book.status}
                onChange={(e) => {
                  const status = e.target.value as BookStatus
                  onPatch({ status, finished: status === 'gelezen' ? (book.finished ?? todayKey()) : null })
                }}>
                {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select></label>
            <label className="block"><span className="label">Cover-link (optioneel)</span>
              <input className="input mt-1" value={book.coverUrl} placeholder="https://…"
                onChange={(e) => onPatch({ coverUrl: e.target.value })} /></label>
          </div>

          <label className="block"><span className="label">Kernidee — in één of twee zinnen</span>
            <textarea className="input mt-1 min-h-[70px] resize-y" value={book.coreIdea}
              placeholder="Waar komt dit boek op neer?"
              onChange={(e) => onPatch({ coreIdea: e.target.value })} /></label>

          <label className="block"><span className="label">Samenvatting</span>
            <textarea className="input mt-1 min-h-[220px] resize-y leading-relaxed" value={book.summary}
              placeholder="Typ of plak hier je samenvatting…"
              onChange={(e) => onPatch({ summary: e.target.value })} /></label>
        </div>

        <div className="space-y-4">
          <div className="panel p-3">
            <span className="label mb-2 block">Voortgang</span>
            <div className="mb-2 flex items-center gap-2">
              <input type="number" className="input num w-20" value={book.currentPage} aria-label="Huidige pagina"
                onChange={(e) => onPatch({ currentPage: Math.max(0, Number(e.target.value) || 0) })} />
              <span className="text-sm text-muted">van</span>
              <input type="number" className="input num w-20" value={book.pages ?? ''} placeholder="?" aria-label="Aantal pagina's"
                onChange={(e) => onPatch({ pages: e.target.value ? Number(e.target.value) : null })} />
              <span className="num ml-auto text-sm" style={{ color: SERIES.magenta }}>{percent}%</span>
            </div>
            <Bar value={percent} max={100} color={SERIES.magenta} />

            <div className="mt-3 border-t border-line/60 pt-3">
              <span className="label mb-2 block">Leessessie loggen</span>
              <div className="flex items-end gap-2">
                <label className="block flex-1"><span className="text-[10px] text-muted">pagina's</span>
                  <input type="number" className="input num mt-0.5 py-1" value={session.pages}
                    onChange={(e) => setSession({ ...session, pages: e.target.value })} /></label>
                <label className="block flex-1"><span className="text-[10px] text-muted">minuten</span>
                  <input type="number" className="input num mt-0.5 py-1" value={session.minutes}
                    onChange={(e) => setSession({ ...session, minutes: e.target.value })} /></label>
                <button className="btn-primary shrink-0 py-1.5 text-xs"
                  onClick={() => onLog(book, Number(session.pages) || 0, Number(session.minutes) || 0)}>
                  <BookOpen size={13} /> Log
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-muted">Vanaf 10 minuten vinkt dit je 75 Hard-leesregel af.</p>
            </div>

            <div className="mt-3 flex items-center gap-2 border-t border-line/60 pt-3">
              <span className="label">Rating</span>
              <div className="ml-auto flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} aria-label={`${n} van 5`} aria-pressed={book.rating === n}
                    onClick={() => onPatch({ rating: book.rating === n ? null : n })}
                    className="text-sm transition"
                    style={{ color: (book.rating ?? 0) >= n ? SERIES.magenta : '#16283a' }}>
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="panel p-3">
            <span className="label mb-2 block">Citaten</span>
            <form className="space-y-2" onSubmit={(e) => {
              e.preventDefault()
              if (!quote.text.trim()) return
              onPatch({ quotes: [...book.quotes, { id: crypto.randomUUID(), text: quote.text.trim(), page: quote.page }] })
              setQuote({ text: '', page: '' })
            }}>
              <textarea className="input min-h-[60px] resize-y" value={quote.text} placeholder="Een zin die je wil onthouden…"
                onChange={(e) => setQuote({ ...quote, text: e.target.value })} />
              <div className="flex gap-2">
                <input className="input num w-20" value={quote.page} placeholder="p." aria-label="Pagina"
                  onChange={(e) => setQuote({ ...quote, page: e.target.value })} />
                <button className="btn-primary flex-1" type="submit"><QuoteIcon size={13} /> Bewaren</button>
              </div>
            </form>

            {book.quotes.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-line/60 pt-3">
                {book.quotes.map((q) => (
                  <li key={q.id} className="group flex gap-2">
                    <span className="shrink-0 text-lg leading-none" style={{ color: SERIES.magenta }} aria-hidden>"</span>
                    <span className="min-w-0 flex-1 text-sm italic text-ink/85">{q.text}</span>
                    {q.page && <span className="num shrink-0 text-[10px] text-muted">p.{q.page}</span>}
                    <button aria-label="Citaat verwijderen"
                      onClick={() => onPatch({ quotes: book.quotes.filter((x) => x.id !== q.id) })}
                      className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                      <Trash2 size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {book.finished && (
            <p className="text-[11px] text-muted">Uitgelezen op {formatShort(book.finished)}.</p>
          )}
        </div>
      </div>
    </Panel>
  )
}
