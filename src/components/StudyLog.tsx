import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { addDays, formatShort, todayKey } from '../lib/date'
import { STUDY_KINDS, type StudyKind, type StudySession } from '../lib/school'
import { studyByWeek, studyBySubject, studyMinutes } from '../lib/schoolDerive'
import { SERIES } from '../lib/palette'
import { Empty, Panel } from './Hud'
import { ChartLegend, Donut, TimeSeries } from './charts2'

const KIND_COLOR: Record<StudyKind, string> = {
  leren: SERIES.blue,
  huiswerk: SERIES.orange,
  herhalen: SERIES.violet,
}

/** Studietijd loggen. Twee tikken, want anders hou je het niet vol. */
export default function StudyLog() {
  const { db, update } = useStore()
  const today = todayKey()
  const [draft, setDraft] = useState({
    subjectId: '', minutes: '45', kind: 'leren' as StudyKind, what: '', date: today,
  })

  const weeks = useMemo(() => studyByWeek(db, 12, today), [db, today])
  const last30 = useMemo(() => studyBySubject(db, addDays(today, -30)), [db, today])
  const todayMinutes = studyMinutes(db.study.filter((s) => s.date === today))
  const weekMinutes = studyMinutes(db.study.filter((s) => s.date > addDays(today, -7)))
  const recent = [...db.study].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)

  function add(e: React.FormEvent) {
    e.preventDefault()
    const minutes = Number(draft.minutes)
    if (!Number.isFinite(minutes) || minutes <= 0) return
    const session: StudySession = {
      id: crypto.randomUUID(),
      subjectId: draft.subjectId || null,
      date: draft.date,
      minutes,
      kind: draft.kind,
      what: draft.what.trim(),
    }
    update((db) => { db.study.push(session) })
    setDraft({ ...draft, what: '' })
  }

  function remove(id: string) {
    update((db) => { db.study = db.study.filter((s) => s.id !== id) })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Vandaag', value: `${Math.round(todayMinutes / 6) / 10} u`, color: SERIES.blue },
          { label: 'Laatste 7 dagen', value: `${Math.round(weekMinutes / 6) / 10} u`, color: undefined },
          {
            label: 'Meest gestudeerd, 30 d',
            value: last30[0]?.label ?? '—',
            color: last30[0]?.color,
          },
        ].map((s) => (
          <div key={s.label} className="panel p-3">
            <div className="label truncate">{s.label}</div>
            <div className="num mt-1 truncate text-xl font-bold" style={s.color ? { color: s.color } : undefined}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={add} className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <select className="input" value={draft.subjectId} aria-label="Vak"
          onChange={(e) => setDraft({ ...draft, subjectId: e.target.value })}>
          <option value="">Kies vak…</option>
          {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="input" value={draft.kind} aria-label="Soort"
          onChange={(e) => setDraft({ ...draft, kind: e.target.value as StudyKind })}>
          {STUDY_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
        </select>
        <div className="flex items-center gap-1">
          <input type="number" className="input num" value={draft.minutes} aria-label="Minuten"
            onChange={(e) => setDraft({ ...draft, minutes: e.target.value })} />
          <span className="text-[11px] text-muted">min</span>
        </div>
        <input className="input sm:col-span-2" placeholder="Waaraan? (optioneel)" value={draft.what}
          aria-label="Omschrijving" onChange={(e) => setDraft({ ...draft, what: e.target.value })} />
        <div className="flex gap-1">
          <input type="date" className="input" value={draft.date} aria-label="Datum"
            onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <button className="btn shrink-0 px-2.5" type="submit" aria-label="Toevoegen"><Plus size={16} /></button>
        </div>
      </form>

      <div className="flex flex-wrap gap-1.5">
        <span className="self-center text-[11px] text-muted">Snel:</span>
        {[25, 45, 60, 90].map((m) => (
          <button key={m} className="btn px-2 py-1 text-xs"
            onClick={() => setDraft({ ...draft, minutes: String(m) })}>
            {m} min
          </button>
        ))}
      </div>

      {db.study.length === 0 ? (
        <Empty>
          Nog niets gelogd. Eén regel per studeersessie is genoeg — na twee weken zie je waar je tijd
          echt naartoe gaat, en dat is bijna nooit waar je denkt.
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
            <Panel title="Uren per week"
              right={<ChartLegend items={STUDY_KINDS.map((k) => ({ label: k.label, color: KIND_COLOR[k.id] }))} />}>
              <TimeSeries
                data={weeks}
                series={STUDY_KINDS.map((k) => ({ key: k.id, label: k.label, color: KIND_COLOR[k.id] }))}
                format={(n) => `${n}u`}
              />
            </Panel>

            <Panel title="Verdeling over je vakken" right={<span className="num text-[11px] text-muted">30 dagen</span>}>
              {last30.length > 0 ? (
                <Donut data={last30.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
                  format={(n) => `${n} u`}
                  centerValue={`${Math.round(last30.reduce((n, s) => n + s.value, 0) * 10) / 10} u`}
                  centerLabel="totaal" />
              ) : <Empty>Nog geen sessies in de laatste 30 dagen.</Empty>}
            </Panel>
          </div>

          <Panel title="Laatste sessies">
            <ul className="space-y-1">
              {recent.map((s) => {
                const subject = db.subjects.find((x) => x.id === s.subjectId)
                return (
                  <li key={s.id} className="group flex items-center gap-2.5 rounded px-1.5 py-1 text-sm hover:bg-line/30">
                    <span className="num w-11 shrink-0 text-[11px] text-muted">{formatShort(s.date)}</span>
                    <span className="h-4 w-1 shrink-0 rounded-full"
                      style={{ background: subject?.color ?? '#6b8299' }} aria-hidden />
                    <span className="w-24 shrink-0 truncate text-ink">{subject?.name ?? 'Algemeen'}</span>
                    <span className="num w-16 shrink-0 text-[11px]" style={{ color: KIND_COLOR[s.kind] }}>{s.kind}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{s.what}</span>
                    <span className="num shrink-0">{s.minutes} min</span>
                    <button onClick={() => remove(s.id)} aria-label="Verwijderen"
                      className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                      <Trash2 size={12} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </Panel>
        </>
      )}
    </div>
  )
}
