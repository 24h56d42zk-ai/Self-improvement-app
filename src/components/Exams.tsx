import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { formatLong, todayKey } from '../lib/date'
import { GRADE_KINDS, studyPlan, type Exam, type GradeKind } from '../lib/school'
import { upcomingExams } from '../lib/schoolDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Bar, Empty, Panel } from './Hud'

/** Toetsen die eraan komen, met een leerplan dat zich over de dagen verdeelt. */
export default function Exams() {
  const { db, update } = useStore()
  const today = todayKey()
  const [draft, setDraft] = useState({
    subjectId: '', title: '', date: today, kind: 'toets' as GradeKind, topics: '',
  })

  const exams = useMemo(() => upcomingExams(db, today), [db, today])
  const past = useMemo(
    () => db.exams.filter((e) => e.date < today).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [db.exams, today],
  )

  function add(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.title.trim()) return
    const exam: Exam = {
      id: crypto.randomUUID(),
      subjectId: draft.subjectId || null,
      title: draft.title.trim(),
      date: draft.date,
      kind: draft.kind,
      topics: draft.topics.split(',').map((t) => t.trim()).filter(Boolean),
      confidence: 0,
      note: '',
    }
    update((db) => { db.exams.push(exam) })
    setDraft({ ...draft, title: '', topics: '' })
  }

  function patch(id: string, changes: Partial<Exam>) {
    update((db) => {
      const e = db.exams.find((x) => x.id === id)
      if (e) Object.assign(e, changes)
    })
  }

  function remove(id: string) {
    update((db) => { db.exams = db.exams.filter((e) => e.id !== id) })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <select className="input" value={draft.subjectId} aria-label="Vak"
          onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}>
          <option value="">Kies vak…</option>
          {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input className="input" placeholder="Waarover?" value={draft.title} aria-label="Omschrijving"
          onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <select className="input" value={draft.kind} aria-label="Soort"
          onChange={(e) => setDraft({ ...draft, kind: e.target.value as GradeKind })}>
          {GRADE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <input type="date" className="input" value={draft.date} aria-label="Datum"
          onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <input className="input" placeholder="Hoofdstukken, met komma's" value={draft.topics} aria-label="Leerstof"
          onChange={(e) => setDraft({ ...draft, topics: e.target.value })} />
        <button className="btn-primary" type="submit"><Plus size={15} /> Toets</button>
      </form>

      {exams.length === 0 ? (
        <Empty>
          Geen toetsen ingepland. Zet ze erin zodra je ze weet — dan maakt de app er een leerplan bij
          dat de stof over de dagen verdeelt.
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {exams.map(({ exam, daysLeft, subject, color, cardsDue }) => {
            const plan = studyPlan(exam.topics, daysLeft)
            const urgent = daysLeft <= 3
            return (
              <Panel key={exam.id} hud={urgent} title={exam.title}
                right={
                  <button onClick={() => remove(exam.id)} aria-label="Toets verwijderen"
                    className="text-muted hover:text-bad"><Trash2 size={13} /></button>
                }>
                <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1.5 text-sm">
                    <span className="h-2 w-2 rounded-[2px]" style={{ background: color }} aria-hidden />
                    <span className="text-ink">{subject}</span>
                  </span>
                  <span className="text-[11px] text-muted">{formatLong(exam.date)}</span>
                  <span className="num ml-auto text-2xl font-bold"
                    style={{ color: urgent ? STATUS.critical : SERIES.blue }}>
                    {daysLeft}
                    <span className="text-[10px] font-normal text-muted"> dagen</span>
                  </span>
                </div>

                <div className="mb-3">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="label">Hoe klaar voel je je?</span>
                    <span className="num text-[11px] text-muted">{exam.confidence}/5</span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} aria-label={`${n} van 5`} aria-pressed={exam.confidence === n}
                        onClick={() => patch(exam.id, { confidence: exam.confidence === n ? 0 : n })}
                        className="h-6 flex-1 rounded-[3px] border transition"
                        style={{
                          background: exam.confidence >= n ? SERIES.blue : 'transparent',
                          borderColor: exam.confidence >= n ? 'transparent' : '#16283a',
                        }} />
                    ))}
                  </div>
                </div>

                {cardsDue > 0 && (
                  <p className="mb-3 text-sm" style={{ color: STATUS.warning }}>
                    ! {cardsDue} kaarten van dit vak wachten op een herhaling.
                  </p>
                )}

                {plan.length > 0 ? (
                  <div>
                    <div className="label mb-1.5">Leerplan</div>
                    <ul className="space-y-1">
                      {plan.map((p, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="num w-14 shrink-0 text-[11px]"
                            style={{ color: p.day <= 2 ? STATUS.serious : undefined }}>
                            {p.day === 1 ? 'morgen' : `nog ${p.day}d`}
                          </span>
                          <span className="min-w-0 flex-1 text-ink/85">{p.what}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : exam.topics.length === 0 ? (
                  <p className="text-[11px] text-muted">
                    Voeg de hoofdstukken toe bij het aanmaken, dan verdeelt de app ze over de dagen.
                  </p>
                ) : null}
              </Panel>
            )
          })}
        </div>
      )}

      {past.length > 0 && (
        <Panel title="Geweest">
          <ul className="space-y-1">
            {past.map((e) => (
              <li key={e.id} className="group flex items-center gap-2.5 rounded px-1.5 py-1 text-sm hover:bg-line/30">
                <span className="h-4 w-1 shrink-0 rounded-full"
                  style={{ background: db.subjects.find((s) => s.id === e.subjectId)?.color ?? '#6b8299' }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-ink">{e.title}</span>
                <span className="num text-[11px] text-muted">{formatLong(e.date)}</span>
                <button onClick={() => remove(e.id)} aria-label="Verwijderen"
                  className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {exams.length > 0 && (
        <Panel title="Alles wat eraan komt">
          <ul className="space-y-2.5">
            {exams.map(({ exam, daysLeft, subject, color }) => (
              <li key={exam.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate"><span className="text-ink">{exam.title}</span>
                    <span className="text-muted"> · {subject}</span></span>
                  <span className="num shrink-0 text-[11px] text-muted">nog {daysLeft} d</span>
                </div>
                <Bar value={Math.max(0, 30 - daysLeft)} max={30}
                  color={daysLeft <= 3 ? STATUS.critical : daysLeft <= 7 ? STATUS.warning : color} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">De balk vult zich naarmate de toets dichterbij komt.</p>
        </Panel>
      )}
    </div>
  )
}
