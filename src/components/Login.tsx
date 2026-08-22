import { useState } from 'react'
import { useStore } from '../lib/store'
import CloudSetup from './CloudSetup'

export default function Login() {
  const { signIn, signUp } = useStore()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null); setNotice(null)
    try {
      if (mode === 'in') await signIn(email, password)
      else {
        await signUp(email, password)
        setNotice('Account aangemaakt. Bevestig eventueel je e-mail en log daarna in.')
        setMode('in')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Aanmelden mislukt')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="panel-hud w-full max-w-sm p-6">
        <div className="num text-2xl font-bold text-accent">NOA//OS</div>
        <p className="mt-1 text-sm text-muted">
          {mode === 'in' ? 'Meld je aan om je data te laden.' : 'Maak eenmalig een account aan.'}
        </p>

        <label className="label mt-5 block" htmlFor="email">E-mail</label>
        <input id="email" type="email" required autoComplete="email" className="input mt-1"
          value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="label mt-4 block" htmlFor="pw">Wachtwoord</label>
        <input id="pw" type="password" required minLength={8}
          autoComplete={mode === 'in' ? 'current-password' : 'new-password'} className="input mt-1"
          value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <p className="mt-3 text-sm text-bad">✕ {error}</p>}
        {notice && <p className="mt-3 text-sm text-good">✓ {notice}</p>}

        <button type="submit" disabled={busy} className="btn-primary mt-5 w-full disabled:opacity-50">
          {busy ? 'Bezig…' : mode === 'in' ? 'Aanmelden' : 'Account aanmaken'}
        </button>

        <button type="button" className="mt-3 w-full text-xs text-muted hover:text-accent"
          onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(null) }}>
          {mode === 'in' ? 'Nog geen account? Aanmaken' : 'Al een account? Aanmelden'}
        </button>

        <details className="mt-5 border-t border-line/60 pt-4">
          <summary className="cursor-pointer text-xs text-muted hover:text-accent">
            Verbinding met Supabase aanpassen
          </summary>
          <div className="mt-3"><CloudSetup compact /></div>
        </details>
      </form>
    </main>
  )
}
