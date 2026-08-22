import { useEffect, useRef, useState } from 'react'
import { euro } from '../lib/business'

/**
 * Bedrag dat je aanklikt om te wijzigen. Enter bewaart, Escape annuleert.
 * Blijft een gewoon getal om naar te kijken tot je er iets aan wil doen.
 */
export default function EditableMoney({
  value, onSave, color, size = 'lg', label, disabled = false, hint,
}: {
  value: number
  onSave: (amount: number) => void
  color?: string
  size?: 'lg' | 'sm'
  label?: string
  disabled?: boolean
  hint?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(Math.round(value)))
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(String(Math.round(value)))
      input.current?.focus()
      input.current?.select()
    }
    // value bewust niet in de deps: tijdens het typen mag hij niet terugspringen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])

  function commit() {
    const n = Number(draft.replace(/[^\d.,-]/g, '').replace(',', '.'))
    if (Number.isFinite(n)) onSave(n)
    setEditing(false)
  }

  const textSize = size === 'lg' ? 'text-2xl' : 'text-lg'

  if (editing) {
    return (
      <input
        ref={input}
        className={`input num ${textSize} w-full font-bold`}
        value={draft}
        inputMode="decimal"
        aria-label={label ?? 'Bedrag'}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
        }}
      />
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setEditing(true)}
      title={disabled ? hint : 'Klik om aan te passen'}
      className={`num ${textSize} block w-full text-left font-bold leading-none transition ${
        disabled ? 'cursor-default' : 'rounded px-1 -mx-1 hover:bg-accent/10 hover:text-accent'
      }`}
      style={color ? { color } : undefined}
    >
      {euro(value)}
    </button>
  )
}
