import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { formatShort, todayKey } from '../lib/date'
import { GRADE_KINDS, gradePercent, type Grade, type GradeKind } from '../lib/school'
import { gradeProgress, subjectAverages, weightedAverage } from '../lib/schoolDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Bar, Empty, Panel } from './Hud'
import { ChartLegend, RankBars, TimeSeries } from './charts2'

/** Kleur op de schaal van je rapport: 50 is net, 80 is goed. */
export function scoreTone(percent: number): string {
  if (percent >= 80) return STATUS.good
  if (percent >= 65) return SERIES.blue
  if (percent >= 50) return STATUS.warning
  return STATUS.critical
}

export default function Grades() {
  const { db, update } = useStore()
  const today = todayKey()
  const [filter, setFilter] = useState<string>('alle')
  const [showAll, setShowAll] = useState(false)
  const [draft, setDraft] = useState({
    subjectId: '', title: '', date: today, score: '', max: '20', kind: 'toets' as GradeKind,
  })

  const averages = useMemo(() => subjectAverages(db).filter((s) => s.count > 0), [db])
  const overall = useMemo(() => weightedAverage(db.grades), [db.grades])
  const progress = useMemo(
    () => gradeProgress(db, filter === 'alle' ? undefined : filter),
    [db, filter],
  )
  const list = useMemo(
    () => db.grades
      .filter((g) => filter === 'alle' || g.subjectId === filter)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [db.grades, filter],
  )

  function add(e: React.FormEvent) {
    e.preventDefault()
    const score = Number(draft.score)
    const max = Number(draft.max)
    if (!Number.isFinite(score) || !Number.isFinite(max) || max <= 0) return
    const grade: Grade = {
      id: crypto.randomUUID(),
      subjectId: draft.subjectId || null,
      title: draft.title.trim() || GRADE_KINDS.find((k) => k.id === draft.kind)!.label,
      date: draft.date,
      score,
      max,
      weight: GRADE_KINDS.find((k) => k.id === draft.kind)!.weight,
      kind: draft.kind,
      note: '',
    }
    update((db) => { db.grades.push(grade) })
    setDraft({ ...draft, title: '', score: '' })
  }

  function remove(id: string) {
    update((db) => { db.grades = db.grades.filter((g) => g.id !== id) })
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Gemiddeld', value: overall === null ? '—' : `${Math.round(overall)}%`,
            color: overall === null ? undefined : scoreTone(overall),
          },
          { label: 'Punten ingevoerd', value: String(db.grades.length), color: undefined },
          {
            label: 'Beste vak',
            value: averages.length ? [...averages].sort((a, b) => (b.average ?? 0) - (a.average ?? 0))[0].name : '—',
            color: STATUS.good,
          },
          {
            label: 'Zwakste vak',
            value: averages.length ? [...averages].sort((a, b) => (a.average ?? 0) - (b.average ?? 0))[0].name : '—',
            color: STATUS.serious,
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
        <input className="input sm:col-span-2" placeholder="Waarover? bv. Hfst. 3 afgeleiden"
          value={draft.title} aria-label="Omschrijving"
          onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        <select className="input" value={draft.kind} aria-label="Soort"
          onChange={(e) => setDraft({ ...draft, kind: e.target.value as GradeKind })}>
          {GRADE_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label} (×{k.weight})</option>)}
        </select>
        <div className="flex items-center gap-1">
          <input type="number" step="0.5" className="input num" placeholder="score" value={draft.score}
            aria-label="Behaald" onChange={(e) => setDraft({ ...draft, score: e.target.value })} />
          <span className="text-muted">/</span>
          <input type="number" className="input num w-16" value={draft.max} aria-label="Op"
            onChange={(e) => setDraft({ ...draft, max: e.target.value })} />
        </div>
        <div className="flex gap-1">
          <input type="date" className="input" value={draft.date} aria-label="Datum"
            onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          <button className="btn shrink-0 px-2.5" type="submit" aria-label="Punt toevoegen"><Plus size={16} /></button>
        </div>
      </form>

      {db.grades.length === 0 ? (
        <Empty>
          Nog geen punten. Voer ze in zodra je ze krijgt — na drie of vier punten per vak
          zie je meteen waar je staat en welk vak je laat zakken.
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Gemiddelde per vak">
              <RankBars
                data={[...averages].sort((a, b) => (b.average ?? 0) - (a.average ?? 0)).map((s) => ({
                  label: s.name,
                  value: Math.round(s.average ?? 0),
                  color: scoreTone(s.average ?? 0),
                }))}
                format={(n) => `${n}%`}
              />
              <ul className="mt-2 space-y-1 border-t border-line/60 pt-2">
                {averages.map((s) => (
                  <li key={s.subjectId} className="flex items-center gap-2 text-[11px]">
                    <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: s.color }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-ink">{s.name}</span>
                    <span className="num text-muted">{s.count} punten</span>
                    <span className="num w-12 text-right text-muted">
                      {s.lowest === null ? '' : `${Math.round(s.lowest)}–${Math.round(s.highest ?? 0)}`}
                    </span>
                    <span className="num w-12 text-right"
                      style={{ color: (s.trend ?? 0) >= 0 ? STATUS.good : STATUS.critical }}>
                      {s.trend === null ? '' : `${s.trend >= 0 ? '+' : ''}${Math.round(s.trend)}`}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-muted">
                De laatste kolom is je richting: het verschil tussen je laatste drie punten en alles daarvoor.
              </p>
            </Panel>

            <Panel title="Verloop"
              right={
                <select className="input w-auto py-1 text-xs" value={filter}
                  onChange={(e) => setFilter(e.target.value)} aria-label="Vak kiezen">
                  <option value="alle">Alle vakken</option>
                  {db.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              }>
              {progress.length > 1 ? (
                <>
                  <TimeSeries
                    data={progress}
                    series={filter === 'alle'
                      ? [{ key: 'gemiddelde', label: 'gemiddelde tot dan', color: SERIES.blue }]
                      : [
                          { key: 'punt', label: 'punt', color: SERIES.violet },
                          { key: 'gemiddelde', label: 'gemiddelde tot dan', color: SERIES.blue },
                        ]}
                    type="line"
                    format={(n) => `${n}%`}
                  />
                  <div className="mt-1">
                    <ChartLegend items={filter === 'alle'
                      ? [{ label: 'gemiddelde tot dan', color: SERIES.blue }]
                      : [
                          { label: 'los punt', color: SERIES.violet },
                          { label: 'gemiddelde tot dan', color: SERIES.blue },
                        ]} />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {filter === 'alle'
                      ? 'Kies een vak om ook de losse punten te zien — over alle vakken samen zegt een los punt weinig.'
                      : 'De blauwe lijn is je gemiddelde tot op dat moment.'}
                  </p>
                </>
              ) : (
                <Empty>Vanaf twee punten zie je hier je verloop.</Empty>
              )}
            </Panel>
          </div>

          <Panel title="Alle punten" right={<span className="num text-[11px] text-muted">{list.length}</span>}>
            <ul className="space-y-1">
              {(showAll ? list : list.slice(0, 15)).map((g) => {
                const pct = gradePercent(g)
                const subject = db.subjects.find((s) => s.id === g.subjectId)
                return (
                  <li key={g.id} className="group flex items-center gap-2.5 rounded px-1.5 py-1.5 hover:bg-line/30">
                    <span className="num w-11 shrink-0 text-[11px] text-muted">{formatShort(g.date)}</span>
                    <span className="h-5 w-1 shrink-0 rounded-full" style={{ background: subject?.color ?? '#6b8299' }} aria-hidden />
                    <span className="w-24 shrink-0 truncate text-sm text-ink">{subject?.name ?? 'Algemeen'}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-muted">{g.title}</span>
                    <span className="num shrink-0 text-[10px] uppercase text-muted">{g.kind}</span>
                    <span className="w-20 shrink-0"><Bar value={pct} max={100} color={scoreTone(pct)} /></span>
                    <span className="num w-20 shrink-0 text-right text-sm" style={{ color: scoreTone(pct) }}>
                      {g.score}/{g.max} · {Math.round(pct)}%
                    </span>
                    <button onClick={() => remove(g.id)} aria-label="Punt verwijderen"
                      className="shrink-0 text-muted opacity-0 transition group-hover:opacity-100 hover:text-bad">
                      <Trash2 size={13} />
                    </button>
                  </li>
                )
              })}
            </ul>
            {list.length > 15 && (
              <button className="btn mt-3 w-full" onClick={() => setShowAll(!showAll)}>
                {showAll ? 'Minder tonen' : `Alle ${list.length} punten tonen`}
              </button>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}
