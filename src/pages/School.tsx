import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { addDays, daysBetween, formatShort, todayKey } from '../lib/date'
import {
  deckStats, overallAverage, projectStatus, reviewAccuracy, reviewTotals, riskSubjects,
  studyByWeek, studyMinutes, subjectAverages, subjectColor, upcomingExams, upcomingReviews,
} from '../lib/schoolDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Bar, Empty, Panel, ToneLine } from '../components/Hud'
import { ReviewForecast } from '../components/charts'
import { ChartLegend, RankBars, TimeSeries } from '../components/charts2'
import Grades, { scoreTone } from '../components/Grades'
import Exams from '../components/Exams'
import StudyLog from '../components/StudyLog'
import Notes from '../components/Notes'
import Study from '../components/Study'
import Projects from '../components/Projects'
import Slides from '../components/Slides'
import Subjects from '../components/Subjects'

const TABS = [
  'Overzicht', 'Punten', 'Toetsen', 'Studietijd', 'Samenvattingen', 'Overhoren', 'Projecten', 'Presentaties',
] as const
type Tab = (typeof TABS)[number]

export default function School() {
  const { db } = useStore()
  const today = todayKey()
  const [tab, setTab] = useState<Tab>('Overzicht')

  const stats = useMemo(() => deckStats(db.cards, today), [db.cards, today])
  const forecast = useMemo(
    () => upcomingReviews(db, 14, today).map((f) => ({ label: formatShort(f.key), kaarten: f.count })),
    [db, today],
  )
  const projects = useMemo(
    () => db.projects
      .map((p) => ({ project: p, status: projectStatus(p, today) }))
      .sort((a, b) => (a.project.deadline ?? '9999').localeCompare(b.project.deadline ?? '9999')),
    [db.projects, today],
  )
  const nextDeadline = projects.find((p) => p.status.daysLeft !== null && p.status.daysLeft >= 0)
  const average = useMemo(() => overallAverage(db), [db])
  const averages = useMemo(() => subjectAverages(db).filter((s) => s.count > 0), [db])
  const risks = useMemo(() => riskSubjects(db), [db])
  const exams = useMemo(() => upcomingExams(db, today), [db, today])
  const studyWeeks = useMemo(() => studyByWeek(db, 8, today), [db, today])
  const accuracy = useMemo(() => reviewAccuracy(db, 21, today), [db, today])
  const reviews = useMemo(() => reviewTotals(db), [db])
  const weekStudy = studyMinutes(db.study.filter((s) => s.date > addDays(today, -7)))

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="num text-2xl font-bold text-ink">SCHOOL</h1>
          <p className="text-sm text-muted">
            {db.subjects.length} vakken · {db.notes.length} samenvattingen · {stats.total} kaarten ·
            {' '}{db.projects.length} projecten
          </p>
        </div>
        <nav className="flex flex-wrap gap-1" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                tab === t ? 'bg-accent/12 text-accent' : 'text-muted hover:text-ink'
              }`}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'Overzicht' && (
        <>
          <div className="panel-hud relative grid grid-cols-2 gap-px overflow-hidden bg-line/40 lg:grid-cols-4">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
              <span className="block h-px w-1/3 animate-sweep bg-gradient-to-r from-transparent via-accent to-transparent" />
            </span>
            <div className="bg-panel p-4">
              <div className="label">Te herhalen vandaag</div>
              <div className="num mt-1 text-2xl font-bold"
                style={{ color: stats.due > 0 ? STATUS.warning : STATUS.good }}>{stats.due}</div>
              <div className="mt-1 text-[11px] text-muted">van {stats.total} kaarten</div>
            </div>
            <div className="bg-panel p-4">
              <div className="label">Vast in je hoofd</div>
              <div className="num mt-1 text-2xl font-bold" style={{ color: SERIES.blue }}>{stats.mature}</div>
              <div className="mt-1 text-[11px] text-muted">interval van 3 weken of meer</div>
            </div>
            <div className="bg-panel p-4">
              <div className="label">Gemiddeld</div>
              <div className="num mt-1 text-2xl font-bold"
                style={average === null ? undefined : { color: scoreTone(average) }}>
                {average === null ? '—' : `${Math.round(average)}%`}
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {db.grades.length > 0 ? `over ${db.grades.length} punten` : 'nog geen punten ingevoerd'}
              </div>
            </div>
            <div className="bg-panel p-4">
              <div className="label">{exams.length > 0 ? 'Eerstvolgende toets' : 'Eerstvolgende deadline'}</div>
              <div className="num mt-1 text-2xl font-bold"
                style={{ color: (exams[0]?.daysLeft ?? nextDeadline?.status.daysLeft ?? 99) <= 7 ? STATUS.serious : undefined }}>
                {exams[0] ? `${exams[0].daysLeft}d` : nextDeadline ? `${nextDeadline.status.daysLeft}d` : '—'}
              </div>
              <div className="mt-1 truncate text-[11px] text-muted">
                {exams[0]?.exam.title ?? nextDeadline?.project.name ?? 'niets ingepland'}
              </div>
            </div>
          </div>

          {(stats.due > 0 || projects.some((p) => p.status.behind) || risks.length > 0 || exams.some((e) => e.daysLeft <= 5)) && (
            <Panel hud title="Wat er nu moet">
              <ul className="space-y-1.5">
                {stats.due > 0 && (
                  <ToneLine tone="warn">
                    {stats.due} {stats.due === 1 ? 'kaart wacht' : 'kaarten wachten'} op een herhaling.
                    Uitstellen betekent dat ze morgen dubbel staan.
                  </ToneLine>
                )}
                {exams.filter((e) => e.daysLeft <= 5).map((e) => (
                  <ToneLine key={e.exam.id} tone={e.daysLeft <= 2 ? 'bad' : 'warn'}>
                    {e.exam.title} ({e.subject}) over {e.daysLeft} {e.daysLeft === 1 ? 'dag' : 'dagen'}
                    {e.exam.confidence < 3 && ' — en je voelt je er nog niet klaar voor'}.
                  </ToneLine>
                ))}
                {risks.map((r) => (
                  <ToneLine key={r.subjectId} tone="bad">
                    {r.name} staat op {Math.round(r.average ?? 0)}%
                    {(r.trend ?? 0) < -8 && ` en zakt (${Math.round(r.trend ?? 0)} punten)`}.
                  </ToneLine>
                ))}
                {projects.filter((p) => p.status.behind).map((p) => (
                  <ToneLine key={p.project.id} tone="bad">
                    {p.project.name} loopt achter: {p.status.percent}% klaar
                    {p.status.daysLeft !== null && ` met nog ${p.status.daysLeft} dagen`}.
                    Volgende fase: {p.status.nextPhase?.name ?? '—'}.
                  </ToneLine>
                ))}
              </ul>
            </Panel>
          )}

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Panel title="Herhalingen, komende 14 dagen">
              {stats.total > 0 ? (
                <>
                  <ReviewForecast data={forecast} />
                  <p className="mt-1 text-[11px] text-muted">
                    Elke dag een beetje houdt de stapel klein. Sla je dagen over, dan stapelt het op tot vlak voor een toets.
                  </p>
                </>
              ) : (
                <Empty>Nog geen kaarten. Maak een stapel bij Overhoren — een woordenlijst plak je er in één keer in.</Empty>
              )}
            </Panel>

            <Panel title="Projecten en deadlines">
              {projects.length === 0 ? (
                <Empty>Nog geen projecten. Begin met je eindwerk — dat is het grootste stuk van je zesde jaar.</Empty>
              ) : (
                <ul className="space-y-3">
                  {projects.slice(0, 6).map(({ project, status }) => (
                    <li key={project.id}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-[2px]"
                            style={{ background: subjectColor(db, project.subjectId) }} aria-hidden />
                          <span className="truncate text-sm text-ink">{project.name}</span>
                          {project.kind === 'eindwerk' && (
                            <span className="num shrink-0 rounded bg-accent/15 px-1 text-[9px] text-accent">GIP</span>
                          )}
                        </span>
                        <span className="num shrink-0 text-[11px] text-muted">
                          {status.percent}% · {project.deadline ? `${daysBetween(today, project.deadline)}d` : 'geen deadline'}
                        </span>
                      </div>
                      <Bar value={status.percent} max={100}
                        color={status.behind ? STATUS.serious : SERIES.blue} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          {(averages.length > 0 || reviews.total > 0 || weekStudy > 0) && (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {averages.length > 0 && (
                <Panel title="Gemiddelde per vak">
                  <RankBars
                    data={[...averages].sort((a, b) => (b.average ?? 0) - (a.average ?? 0)).map((s) => ({
                      label: s.name, value: Math.round(s.average ?? 0), color: scoreTone(s.average ?? 0),
                    }))}
                    format={(n) => `${n}%`}
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Groen vanaf 80, blauw vanaf 65, oranje vanaf 50, rood daaronder.
                  </p>
                </Panel>
              )}

              {weekStudy > 0 && (
                <Panel title="Studietijd per week"
                  right={<ChartLegend items={[
                    { label: 'leren', color: SERIES.blue },
                    { label: 'huiswerk', color: SERIES.orange },
                    { label: 'herhalen', color: SERIES.violet },
                  ]} />}>
                  <TimeSeries
                    data={studyWeeks}
                    series={[
                      { key: 'leren', label: 'leren', color: SERIES.blue },
                      { key: 'huiswerk', label: 'huiswerk', color: SERIES.orange },
                      { key: 'herhalen', label: 'herhalen', color: SERIES.violet },
                    ]}
                    format={(n) => `${n}u`}
                    height={170}
                  />
                </Panel>
              )}

              {reviews.total > 0 && (
                <Panel title="Hoeveel je wist bij het overhoren"
                  right={
                    <span className="num text-[11px]"
                      style={{ color: (reviews.accuracy ?? 0) >= 80 ? STATUS.good : STATUS.warning }}>
                      {reviews.accuracy === null ? '—' : `${Math.round(reviews.accuracy)}% totaal`}
                    </span>
                  }>
                  <TimeSeries
                    data={accuracy.filter((a) => a.kaarten > 0)}
                    series={[{ key: 'juist', label: 'juist', color: SERIES.blue }]}
                    type="line"
                    format={(n) => `${n}%`}
                    height={160}
                  />
                  <p className="mt-1 text-[11px] text-muted">
                    Zakt dit onder 70%, dan ga je te snel door nieuwe kaarten.
                  </p>
                </Panel>
              )}
            </div>
          )}

          <Panel title="Je vakken">
            <Subjects />
          </Panel>
        </>
      )}

      {tab === 'Punten' && <Panel hud title="Punten"><Grades /></Panel>}
      {tab === 'Toetsen' && <Panel hud title="Toetsen en leerplan"><Exams /></Panel>}
      {tab === 'Studietijd' && <Panel hud title="Studietijd"><StudyLog /></Panel>}
      {tab === 'Samenvattingen' && <Panel hud title="Samenvattingen"><Notes /></Panel>}
      {tab === 'Overhoren' && <Panel hud title="Overhoren"><Study /></Panel>}
      {tab === 'Projecten' && <Panel hud title="Projecten en eindwerk"><Projects /></Panel>}
      {tab === 'Presentaties' && <Panel hud title="Presentatiemaker"><Slides /></Panel>}
    </div>
  )
}
