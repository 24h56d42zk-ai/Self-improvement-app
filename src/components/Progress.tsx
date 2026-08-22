import { useMemo } from 'react'
import { Flame } from 'lucide-react'
import { useStore } from '../lib/store'
import { todayKey } from '../lib/date'
import { achievements, effortSplit, levelFor, momentum, streaks, totalXp, xpBreakdown } from '../lib/progress'
import { STATUS } from '../lib/palette'
import { Bar, Panel, ToneLine } from './Hud'
import { Donut, RankBars } from './charts2'

/** Niveau, reeksen en prestaties: het bewijs dat volhouden ergens toe leidt. */
export function LevelPanel() {
  const { db } = useStore()
  const today = todayKey()
  const xp = useMemo(() => totalXp(db), [db])
  const level = useMemo(() => levelFor(xp), [xp])
  const parts = useMemo(() => xpBreakdown(db).sort((a, b) => b.xp - a.xp), [db])
  const mo = useMemo(() => momentum(db, today), [db, today])

  return (
    <Panel hud title="Niveau" right={<span className="num text-[11px] text-muted">{xp.toLocaleString('nl-BE')} xp</span>}>
      <div className="flex items-end gap-4">
        <div>
          <div className="num text-4xl font-bold leading-none text-accent">{level.level}</div>
          <div className="label mt-1">niveau</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline justify-between text-[11px] text-muted">
            <span>naar niveau {level.level + 1}</span>
            <span className="num">{level.intoLevel} / {level.needed}</span>
          </div>
          <Bar value={level.percent} max={100} height={8} />
        </div>
      </div>

      <ul className="mt-3 border-t border-line/60 pt-3">
        <ToneLine tone={mo.tone === 'neutral' ? 'neutral' : mo.tone}>
          {mo.recent > 0 && `Laatste week ${mo.recent} tegenover ${mo.before} daarvoor. `}{mo.message}
        </ToneLine>
      </ul>

      {parts.length > 0 && (
        <div className="mt-3 border-t border-line/60 pt-3">
          <div className="label mb-2">Waar je xp vandaan komt</div>
          <ul className="space-y-1.5">
            {parts.slice(0, 5).map((p) => (
              <li key={p.label} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: p.color }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-ink">{p.label}</span>
                <span className="num text-muted">{p.xp.toLocaleString('nl-BE')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  )
}

export function StreaksPanel() {
  const { db } = useStore()
  const list = useMemo(() => streaks(db, todayKey()), [db])
  const best = Math.max(...list.map((s) => s.days), 1)

  return (
    <Panel title="Reeksen" right={<span className="num text-[11px] text-muted">dagen op rij</span>}>
      <ul className="space-y-2.5">
        {list.map((s) => (
          <li key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5">
                {s.days >= 7 && <Flame size={12} style={{ color: s.color }} aria-hidden />}
                <span className="truncate text-sm text-ink">{s.label}</span>
              </span>
              <span className="num shrink-0 text-sm" style={{ color: s.days > 0 ? s.color : undefined }}>
                {s.days}
              </span>
            </div>
            <Bar value={s.days} max={best} color={s.color} height={4} />
            <p className="mt-0.5 text-[10px] text-muted">{s.hint}</p>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function AchievementsPanel({ compact = false }: { compact?: boolean }) {
  const { db } = useStore()
  const list = useMemo(() => achievements(db, todayKey()), [db])
  const done = list.filter((a) => a.done)
  const next = list.filter((a) => !a.done).sort((a, b) => (b.progress / b.target) - (a.progress / a.target))
  const shown = compact ? [...done.slice(-3), ...next.slice(0, 5)] : [...done, ...next]

  return (
    <Panel title="Prestaties" right={<span className="num text-[11px] text-muted">{done.length}/{list.length}</span>}>
      <ul className={`grid gap-2 ${compact ? '' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {shown.map((a) => (
          <li key={a.id}
            className={`rounded-md border p-2.5 ${a.done ? 'border-line bg-panel2/60' : 'border-line/60'}`}>
            <div className="flex items-baseline justify-between gap-2">
              <span className={`truncate text-sm ${a.done ? 'text-ink' : 'text-muted'}`}>{a.label}</span>
              {a.done
                ? <span className="num shrink-0 text-xs" style={{ color: STATUS.good }}>✓</span>
                : <span className="num shrink-0 text-[10px] text-muted">{a.progress}/{a.target}</span>}
            </div>
            <p className="mt-0.5 truncate text-[10px] text-muted">{a.hint}</p>
            {!a.done && (
              <div className="mt-1.5"><Bar value={a.progress} max={a.target} color={a.color} height={3} /></div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  )
}

export function EffortPanel() {
  const { db } = useStore()
  const split = useMemo(() => effortSplit(db, 30, todayKey()), [db])
  const total = split.reduce((n, s) => n + s.value, 0)

  if (split.length === 0) {
    return (
      <Panel title="Waar je tijd naartoe gaat">
        <p className="py-6 text-center text-sm text-muted">
          Log wat trainingen, studietijd of leessessies, dan verschijnt hier de verdeling.
        </p>
      </Panel>
    )
  }

  return (
    <Panel title="Waar je tijd naartoe gaat" right={<span className="num text-[11px] text-muted">30 dagen</span>}>
      <Donut data={split} format={(n) => `${n} u`} centerValue={`${total} u`} centerLabel="totaal" />
      <div className="mt-2">
        <RankBars data={split.map((s) => ({ label: s.label, value: s.value, color: s.color }))}
          format={(n) => `${n} u`} height={130} />
      </div>
    </Panel>
  )
}
