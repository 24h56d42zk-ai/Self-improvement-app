import { useStore } from '../lib/store'
import CloudSetup from './CloudSetup'

/**
 * Eerste start zonder cloudgegevens. Beter één keer bewust kiezen dan later
 * ontdekken dat alles alleen in één browser stond.
 */
export default function FirstRun() {
  const { setSettings } = useStore()

  return (
    <main className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
      <div className="panel-hud w-full max-w-lg p-6">
        <div className="num text-2xl font-bold text-accent">NOA//OS</div>
        <p className="mt-1 text-sm text-muted">Eén keer instellen, daarna nooit meer.</p>

        <div className="mt-6">
          <h2 className="label mb-2">Sync tussen laptop en gsm</h2>
          <CloudSetup />
        </div>

        <div className="mt-6 border-t border-line/60 pt-4">
          <h2 className="label mb-2">Of eerst gewoon proberen</h2>
          <p className="mb-3 text-sm text-muted">
            Alles werkt dan, maar je data blijft in <span className="text-ink">deze ene browser</span>.
            Geen sync, en weg als je je browsergegevens wist. Je kan later alsnog verbinden bij Instellingen.
          </p>
          <button className="btn" onClick={() => setSettings({ localOnly: true })}>
            Zonder sync starten
          </button>
        </div>
      </div>
    </main>
  )
}
