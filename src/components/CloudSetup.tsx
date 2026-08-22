import { useState } from 'react'
import { clearCloudConfig, cloudConfig, cloudFromEnv, saveCloudConfig, testCloudConfig } from '../lib/supabase'

/**
 * Supabase-gegevens invullen zonder aan de hosting te hoeven komen.
 * Beide waarden horen publiek te zijn; je data is beveiligd door de regels
 * op de tabel, niet door het geheim houden van deze sleutel.
 */
export default function CloudSetup({ compact = false }: { compact?: boolean }) {
  const [url, setUrl] = useState(cloudConfig?.url ?? '')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null)
    const problem = await testCloudConfig(url, key)
    if (problem) { setError(problem); setBusy(false); return }
    saveCloudConfig(url, key)
  }

  if (cloudFromEnv) {
    return (
      <p className="text-sm text-muted">
        De verbinding komt uit de instellingen van je hosting. Wil je hem hier overschrijven,
        haal dan de twee variabelen bij je hosting weg.
      </p>
    )
  }

  return (
    <form onSubmit={save} className="space-y-3">
      {!compact && (
        <p className="text-sm text-muted">
          Plak hier de twee waarden uit Supabase → <span className="text-ink">Connect</span> →
          <span className="text-ink"> App Frameworks</span>. Daarna kan je aanmelden en staat je data
          op al je toestellen.
        </p>
      )}

      <label className="block">
        <span className="label">Project URL</span>
        <input className="input mt-1" value={url} inputMode="url" placeholder="https://jouwproject.supabase.co"
          onChange={(e) => setUrl(e.target.value)} />
      </label>

      <label className="block">
        <span className="label">Anon / publishable key</span>
        <textarea className="input mt-1 min-h-[70px] resize-y break-all font-mono text-xs" value={key}
          placeholder="eyJhbGciOi… of sb_publishable_…"
          onChange={(e) => setKey(e.target.value)} />
      </label>

      {error && <p className="text-sm text-bad">✕ {error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? 'Controleren…' : 'Verbinden'}
        </button>
        {cloudConfig && (
          <button className="btn" type="button" onClick={clearCloudConfig}>Verbinding wissen</button>
        )}
      </div>

      <p className="text-[11px] text-muted">
        Gebruik nooit een sleutel met <span className="num">service_role</span> of
        {' '}<span className="num">secret</span> erin — die hoort niet in een website thuis.
      </p>
    </form>
  )
}
