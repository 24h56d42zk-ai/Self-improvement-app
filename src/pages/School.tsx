import { useState } from 'react'
import { useStore } from '../lib/store'
import { Panel } from '../components/Hud'
import Notes from '../components/Notes'
import Projects from '../components/Projects'
import Slides from '../components/Slides'
import Subjects from '../components/Subjects'

const TABS = ['Documenten', 'Projecten', 'Presentaties', 'Vakken'] as const
type Tab = (typeof TABS)[number]

/**
 * Geen dagelijkse module: je komt hier als je iets moet maken of opzoeken.
 * Documenten per vak, je projecten en eindwerk, en de presentatiemaker.
 */
export default function School() {
  const { db } = useStore()
  const [tab, setTab] = useState<Tab>('Documenten')

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="num text-2xl font-bold text-ink">SCHOOL</h1>
          <p className="text-sm text-muted">
            {db.notes.length} documenten · {db.projects.length} projecten · {db.presentations.length} presentaties
          </p>
        </div>
        <nav className="flex flex-wrap gap-1" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                tab === t ? 'bg-accent/12 text-accent' : 'text-muted hover:text-ink'
              }`}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'Documenten' && (
        <Panel hud title="Documenten en samenvattingen">
          <Notes />
        </Panel>
      )}
      {tab === 'Projecten' && (
        <Panel hud title="Projecten en eindwerk">
          <Projects />
        </Panel>
      )}
      {tab === 'Presentaties' && (
        <Panel hud title="Presentatiemaker">
          <Slides />
        </Panel>
      )}
      {tab === 'Vakken' && (
        <Panel hud title="Je vakken">
          <Subjects />
          <p className="mt-4 border-t border-line/60 pt-3 text-[11px] text-muted">
            De kleur van een vak komt terug bij je documenten, projecten en presentaties.
          </p>
        </Panel>
      )}
    </div>
  )
}
