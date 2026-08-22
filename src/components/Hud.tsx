import type { ReactNode } from 'react'
import { CHROME } from '../lib/palette'

/** Hoekhaken: het HUD-detail dat het sci-fi gevoel draagt zonder iets te verstoren. */
function Corners() {
  const cls = 'pointer-events-none absolute h-2.5 w-2.5 border-accent/45'
  return (
    <>
      <span className={`${cls} left-0 top-0 border-l border-t`} />
      <span className={`${cls} right-0 top-0 border-r border-t`} />
      <span className={`${cls} bottom-0 left-0 border-b border-l`} />
      <span className={`${cls} bottom-0 right-0 border-b border-r`} />
    </>
  )
}

export function Panel({
  title, right, children, className = '', hud = false, accent,
}: {
  title?: string
  right?: ReactNode
  children: ReactNode
  className?: string
  hud?: boolean
  accent?: string
}) {
  return (
    <section className={`${hud ? 'panel-hud' : 'panel'} p-4 ${className}`}>
      {hud && <Corners />}
      {title && (
        <header className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="label" style={accent ? { color: accent } : undefined}>{title}</h2>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}

export function Stat({
  label, value, unit, sub, tone = 'default', accent,
}: {
  label: string
  value: string | number
  unit?: string
  sub?: string
  tone?: 'default' | 'good' | 'warn' | 'bad'
  accent?: string
}) {
  const toneClass = {
    default: 'text-ink',
    good: 'text-good',
    warn: 'text-warn',
    bad: 'text-bad',
  }[tone]
  return (
    <div className="min-w-0">
      <div className="label truncate">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`num text-2xl font-bold leading-none ${toneClass}`} style={accent ? { color: accent } : undefined}>
          {value}
        </span>
        {unit && <span className="num text-xs text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-1 truncate text-[11px] text-muted">{sub}</div>}
    </div>
  )
}

/** Ringmeter voor één waarde (0-100). Eén reeks, dus geen legende nodig. */
export function Ring({
  value, size = 132, stroke = 9, label, sub, color = CHROME.accent,
}: {
  value: number
  size?: number
  stroke?: number
  label?: string
  sub?: string
  color?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label ?? 'score'}: ${pct} van 100`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={CHROME.grid} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.2,.7,.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-3xl font-bold leading-none" style={{ color }}>{Math.round(pct)}</span>
        {label && <span className="label mt-1">{label}</span>}
        {sub && <span className="mt-0.5 text-[11px] text-muted">{sub}</span>}
      </div>
    </div>
  )
}

export function Bar({ value, max, color = CHROME.accent, height = 6 }: { value: number; max: number; color?: string; height?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full overflow-hidden rounded-full bg-line/60" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

/** Kleine tekstregel met statuskleur én een symbool, zodat kleur nooit alleen betekenis draagt. */
export function ToneLine({ tone, children }: { tone: 'neutral' | 'good' | 'warn' | 'bad'; children: ReactNode }) {
  const map = {
    neutral: { color: 'text-ink/80', mark: '·' },
    good:    { color: 'text-good',   mark: '✓' },
    warn:    { color: 'text-warn',   mark: '!' },
    bad:     { color: 'text-bad',    mark: '✕' },
  }[tone]
  return (
    <li className="flex gap-2 text-sm leading-relaxed">
      <span className={`num mt-[2px] w-3 shrink-0 text-center ${map.color}`} aria-hidden>{map.mark}</span>
      <span className={map.color}>{children}</span>
    </li>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted">{children}</p>
}
