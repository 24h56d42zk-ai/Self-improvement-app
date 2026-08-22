import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { PLAN_DAY_END, PLAN_DAY_START, fromMinutes, planDay } from '../lib/autoplan'
import { STATUS } from '../lib/palette'
import { Empty } from './Hud'

const KIND_LABEL: Record<string, string> = {
  les: 'Les', training: 'Training', taak: 'Taak', vrij: 'Vrij', slapen: 'Slapen',
}

/** Je dag als tijdlijn: wat vaststaat, en waar je taken tussen passen. */
export default function DayPlan({ dateKey }: { dateKey: string }) {
  const { db, update } = useStore()
  const { blocks, unplanned } = useMemo(() => planDay(db, dateKey), [db, dateKey])

  const span = PLAN_DAY_END - PLAN_DAY_START
  const busy = blocks.filter((b) => b.kind !== 'vrij')

  function toggleTask(id: string) {
    update((db) => {
      const t = db.tasks.find((x) => x.id === id)
      if (t) t.done = !t.done
    })
  }

  if (busy.length === 0) {
    return (
      <Empty>
        Niets ingepland voor deze dag. Zet je lesrooster erin en voeg taken toe,
        dan bouwt de app hier vanzelf een dagindeling.
      </Empty>
    )
  }

  return (
    <div>
      <div className="relative" style={{ height: 420 }}>
        {/* uurlijnen */}
        {Array.from({ length: Math.floor(span / 60) + 1 }, (_, i) => {
          const minute = PLAN_DAY_START + i * 60
          const top = ((minute - PLAN_DAY_START) / span) * 100
          return (
            <div key={i} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${top}%` }}>
              <span className="num w-9 shrink-0 text-[9px] text-muted">{fromMinutes(minute)}</span>
              <span className="h-px flex-1 bg-line/50" />
            </div>
          )
        })}

        {/* blokken */}
        <div className="absolute inset-y-0 left-11 right-0">
          {blocks.map((b, i) => {
            const top = ((b.start - PLAN_DAY_START) / span) * 100
            const height = ((b.end - b.start) / span) * 100
            const isFree = b.kind === 'vrij'
            return (
              <div key={i}
                className={`absolute left-0 right-0 overflow-hidden rounded-md border px-2 py-1 ${
                  isFree ? 'border-dashed border-line/70' : 'border-line'
                }`}
                style={{
                  top: `${top}%`,
                  height: `calc(${height}% - 2px)`,
                  background: isFree ? 'transparent' : `color-mix(in srgb, ${b.color} 14%, #080d16)`,
                  borderLeftWidth: isFree ? 1 : 3,
                  borderLeftColor: b.color,
                }}>
                <div className="flex items-baseline gap-2">
                  {b.taskId ? (
                    <button onClick={() => toggleTask(b.taskId!)}
                      className="num flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border border-line text-[9px] text-transparent hover:border-accent"
                      aria-label={`${b.label} afvinken`}>
                      ✓
                    </button>
                  ) : null}
                  <span className={`min-w-0 flex-1 truncate text-xs ${isFree ? 'text-muted' : 'text-ink'}`}>
                    {b.label}
                  </span>
                  <span className="num shrink-0 text-[9px] text-muted">
                    {fromMinutes(b.start)}–{fromMinutes(b.end)}
                  </span>
                </div>
                {b.detail && height > 5 && (
                  <div className="num truncate text-[9px] text-muted">{KIND_LABEL[b.kind]} · {b.detail}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {unplanned.length > 0 && (
        <div className="mt-3 border-t border-line/60 pt-3">
          <p className="mb-1.5 text-sm" style={{ color: STATUS.warning }}>
            ! {unplanned.length} {unplanned.length === 1 ? 'taak past' : 'taken passen'} er niet meer in vandaag.
          </p>
          <ul className="space-y-1">
            {unplanned.map((t) => (
              <li key={t.id} className="truncate text-[11px] text-muted">· {t.title}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-muted">
            Verplaats ze naar een andere dag, of schrap er een. Een dag die niet past is geen planning.
          </p>
        </div>
      )}
    </div>
  )
}
