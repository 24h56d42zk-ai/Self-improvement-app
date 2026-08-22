import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { formatLong, monthName, todayKey, yearKeys } from '../lib/date'
import { dayHasData, dayScore } from '../lib/derive'
import { SCORE_RAMP, scoreColor } from '../lib/palette'

/** Elk vakje is één dag, gekleurd op je dagscore. Een jaar in één blik. */
export default function YearGrid() {
  const { db } = useStore()
  const today = todayKey()
  const [year, setYear] = useState(() => Number(today.slice(0, 4)))
  const [hover, setHover] = useState<string | null>(null)

  const cells = useMemo(
    () => yearKeys(year).map((key) => {
      const has = dayHasData(db, key)
      return { key, score: has ? dayScore(db, key) : 0, has, month: Number(key.slice(5, 7)) - 1 }
    }),
    [db, year],
  )

  const withData = cells.filter((c) => c.has)
  const average = withData.length === 0
    ? 0
    : Math.round(withData.reduce((n, c) => n + c.score, 0) / withData.length)
  const strong = withData.filter((c) => c.score >= 85).length

  const months = Array.from({ length: 12 }, (_, m) => cells.filter((c) => c.month === m))
  const hovered = hover ? cells.find((c) => c.key === hover) : null

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1">
          <button className="btn px-2 py-1 text-xs" onClick={() => setYear(year - 1)}>{year - 1}</button>
          <span className="num px-2 text-sm text-ink">{year}</span>
          <button className="btn px-2 py-1 text-xs" onClick={() => setYear(year + 1)}>{year + 1}</button>
        </div>
        <span className="num text-[11px] text-muted">
          {withData.length} dagen gelogd · gemiddeld {average} · {strong} dagen boven 85
        </span>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted">
          <span>&lt;50</span>
          {SCORE_RAMP.map((c) => <span key={c} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: c }} />)}
          <span>90+</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[760px] gap-2">
          {months.map((days, m) => (
            <div key={m} className="flex-1">
              <div className="label mb-1 truncate">{monthName(m).slice(0, 3)}</div>
              <div className="grid grid-cols-4 gap-[3px]">
                {days.map((c) => (
                  <span
                    key={c.key}
                    onMouseEnter={() => setHover(c.key)}
                    onMouseLeave={() => setHover(null)}
                    title={`${c.key} · ${c.has ? c.score : 'geen data'}`}
                    className={`aspect-square rounded-[2px] ${c.key === today ? 'ring-1 ring-accent' : ''}`}
                    style={{ background: scoreColor(c.score, c.has) }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 h-4 text-[11px] text-muted">
        {hovered
          ? <>{formatLong(hovered.key)} — {hovered.has ? <span className="num text-ink">score {hovered.score}</span> : 'niets gelogd'}</>
          : 'Beweeg over een vakje voor die dag.'}
      </p>
    </div>
  )
}
