import { HARD75_RULES, type Hard75Key } from '../lib/types'
import type { Hard75State } from '../lib/derive'
import { SERIES, STATUS } from '../lib/palette'
import { formatShort } from '../lib/date'

/** Grid van 75 vakjes. Voltooid = violet, deels = flauw, gemist = rood. */
export function Hard75Grid({ state, compact = false }: { state: Hard75State; compact?: boolean }) {
  if (!state.started) {
    return <p className="py-4 text-sm text-muted">Nog niet gestart — zet je startdatum bij Instellingen of hierboven.</p>
  }
  const cell = compact ? 'h-2.5 w-2.5' : 'h-4 w-4'
  return (
    <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-1.5'}`}>
      {state.grid.map((g) => {
        const missed = !g.future && !g.isToday && !g.complete
        const bg = g.complete
          ? SERIES.violet
          : missed
            ? STATUS.critical
            : g.partial > 0
              ? `color-mix(in srgb, ${SERIES.violet} ${g.partial * 18}%, #0f1720)`
              : '#0f1720'
        return (
          <span
            key={g.key}
            title={`Dag ${g.index} · ${formatShort(g.key)} · ${g.partial}/5`}
            className={`${cell} rounded-[3px] ${g.isToday ? 'ring-1 ring-accent ring-offset-1 ring-offset-panel' : ''}`}
            style={{ background: bg }}
          />
        )
      })}
    </div>
  )
}

/** Grote knoppen: op de gsm in drie seconden af te vinken. */
export function Hard75Checks({
  values, onToggle, size = 'lg',
}: {
  values: Record<Hard75Key, boolean>
  onToggle: (key: Hard75Key) => void
  size?: 'lg' | 'sm'
}) {
  return (
    <ul className={size === 'lg' ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-1.5'}>
      {HARD75_RULES.map((rule) => {
        const on = values[rule.key]
        return (
          <li key={rule.key}>
            <button
              type="button"
              onClick={() => onToggle(rule.key)}
              aria-pressed={on}
              className={`flex w-full items-center gap-3 rounded-md border px-3 text-left transition ${
                size === 'lg' ? 'py-3.5' : 'py-2'
              } ${
                on
                  ? 'border-[#9085e9]/60 bg-[#9085e9]/12 text-ink'
                  : 'border-line bg-panel2/60 text-muted hover:border-accent/50 hover:text-ink'
              }`}
            >
              <span
                className={`num flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                  on ? 'border-transparent text-base' : 'border-line text-transparent'
                }`}
                style={on ? { background: SERIES.violet } : undefined}
                aria-hidden
              >
                ✓
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-medium ${on ? 'text-ink' : ''}`}>{rule.label}</span>
                {size === 'lg' && <span className="block truncate text-[11px] text-muted">{rule.hint}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
