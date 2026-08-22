import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'

const FIELDS = [
  { key: 'good' as const,     label: 'Wat ging goed?' },
  { key: 'bad' as const,      label: 'Wat ging niet?' },
  { key: 'tomorrow' as const, label: 'Wat doe je morgen anders?' },
]

/** Avondreflectie: drie korte vragen, samen goed voor één minuut. */
export default function Reflection({ dateKey }: { dateKey: string }) {
  const { db, setDay } = useStore()
  const saved = db.days[dateKey]?.reflection
  const [draft, setDraft] = useState({ good: '', bad: '', tomorrow: '' })

  useEffect(() => {
    setDraft(saved ?? { good: '', bad: '', tomorrow: '' })
  }, [saved, dateKey])

  const dirty =
    draft.good !== (saved?.good ?? '') ||
    draft.bad !== (saved?.bad ?? '') ||
    draft.tomorrow !== (saved?.tomorrow ?? '')

  function save() {
    setDay(dateKey, (d) => {
      d.reflection = { ...draft }
    })
  }

  return (
    <div className="space-y-3">
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="label mb-1 block" htmlFor={`refl-${f.key}`}>{f.label}</label>
          <textarea
            id={`refl-${f.key}`} rows={2} className="input resize-none"
            value={draft[f.key]}
            onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
          />
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={save} disabled={!dirty}>Opslaan</button>
        {!dirty && saved && <span className="text-xs text-good">✓ bewaard</span>}
      </div>
    </div>
  )
}
