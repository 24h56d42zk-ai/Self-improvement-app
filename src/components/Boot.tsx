import { useEffect, useState } from 'react'
import { EVENTS } from '../lib/events'
import { daysBetween, todayKey } from '../lib/date'

const LINES = [
  'NOA//OS  v0.1  — persoonlijk besturingssysteem',
  'geheugen geladen · dagen, sessies, doelen',
  'trainingsschema gekoppeld · 9 sessies/week',
  'wedstrijdklokken gesynchroniseerd',
]

/** Korte opstartsequentie: sfeer, maar overslaanbaar en max ~1,2s. */
export default function Boot({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const today = todayKey()
  const next = EVENTS
    .filter((e) => daysBetween(today, e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  useEffect(() => {
    if (step >= LINES.length) {
      const t = window.setTimeout(onDone, 260)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setStep((s) => s + 1), 230)
    return () => window.clearTimeout(t)
  }, [step, onDone])

  useEffect(() => {
    const skip = () => onDone()
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
    }
  }, [onDone])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base">
      <div className="w-full max-w-md px-6">
        <div className="mb-6 flex items-baseline gap-3">
          <span className="num text-4xl font-bold tracking-tight text-accent">NOA</span>
          <span className="label">systeemstart</span>
        </div>
        <ul className="space-y-1.5">
          {LINES.slice(0, step).map((l) => (
            <li key={l} className="num animate-riseIn text-xs text-muted">
              <span className="text-accent">›</span> {l}
            </li>
          ))}
        </ul>
        {next && step >= LINES.length && (
          <p className="num mt-6 animate-riseIn text-sm text-ink">
            {next.label} {next.sub} over{' '}
            <span className="font-bold text-accent">{daysBetween(today, next.date)}</span> dagen
          </p>
        )}
        <p className="mt-8 text-[11px] text-muted/70">klik of druk een toets om over te slaan</p>
      </div>
    </div>
  )
}
