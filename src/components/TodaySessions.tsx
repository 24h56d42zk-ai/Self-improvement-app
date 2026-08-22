import { Minus, Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { SESSION_STYLE, sessionsFor } from '../lib/schedule'
import { Empty } from './Hud'

/** De sessies van vandaag uit het vaste weekschema, met één tik af te vinken. */
export default function TodaySessions({ dateKey }: { dateKey: string }) {
  const { db, setDay } = useStore()
  const planned = sessionsFor(dateKey)
  const log = db.days[dateKey]
  const extra = log?.extra ?? 0

  function toggle(id: string) {
    setDay(dateKey, (d) => { d.sessions[id] = !d.sessions[id] })
  }

  function bumpExtra(delta: number) {
    setDay(dateKey, (d) => { d.extra = Math.max(0, d.extra + delta) })
  }

  return (
    <div>
      {planned.length === 0 ? (
        <Empty>Rustdag. Geen sessies gepland.</Empty>
      ) : (
        <ul className="space-y-1.5">
          {planned.map((s) => {
            const on = Boolean(log?.sessions[s.id])
            const style = SESSION_STYLE[s.kind]
            return (
              <li key={s.id}>
                <button
                  type="button" onClick={() => toggle(s.id)} aria-pressed={on}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition ${
                    on ? 'border-line bg-panel2 text-ink' : 'border-line/70 bg-panel2/40 text-muted hover:border-accent/50'
                  }`}
                >
                  <span className="h-6 w-1 shrink-0 rounded-full" style={{ background: style.color }} aria-hidden />
                  <span className="num w-7 shrink-0 text-[10px] uppercase tracking-wider text-muted">{s.slot}</span>
                  <span className={`flex-1 truncate text-sm font-medium ${on ? 'text-ink' : ''}`}>{style.label}</span>
                  <span
                    className={`num flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                      on ? 'border-transparent text-base' : 'border-line text-transparent'
                    }`}
                    style={on ? { background: style.color } : undefined}
                    aria-hidden
                  >
                    ✓
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-2 border-t border-line/60 pt-3">
        <span className="flex-1 text-[11px] text-muted">Extra sessie buiten het schema</span>
        <button className="btn px-2 py-1" onClick={() => bumpExtra(-1)} aria-label="Minder"><Minus size={13} /></button>
        <span className="num w-5 text-center text-sm">{extra}</span>
        <button className="btn px-2 py-1" onClick={() => bumpExtra(1)} aria-label="Meer"><Plus size={13} /></button>
      </div>
    </div>
  )
}
