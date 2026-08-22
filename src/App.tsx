import { useCallback, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Nav from './components/Nav'
import Boot from './components/Boot'
import Login from './components/Login'
import FirstRun from './components/FirstRun'
import Dashboard from './pages/Dashboard'
import Hard75 from './pages/Hard75'
import Instellingen from './pages/Instellingen'
import Training from './pages/Training'
import Business from './pages/Business'
import School from './pages/School'
import Boeken from './pages/Boeken'
import Planning from './pages/Planning'
import { useStore } from './lib/store'
import { todayKey } from './lib/date'

export default function App() {
  const { db, setSettings, cloudConfigured, email, ready } = useStore()
  const today = todayKey()
  const [booting, setBooting] = useState(() => db.settings.bootSeen !== today)

  const finishBoot = useCallback(() => {
    setBooting(false)
    setSettings({ bootSeen: today })
  }, [setSettings, today])

  // Rustige modus met de toets "r": handig als je moet focussen.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        setSettings({ calmMode: !db.settings.calmMode })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [db.settings.calmMode, setSettings])

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">Laden…</div>
  }
  if (cloudConfigured && !email) return <Login />
  if (!cloudConfigured && !db.settings.localOnly) return <FirstRun />
  if (booting) return <Boot onDone={finishBoot} />

  return (
    <div className="relative z-10 min-h-screen">
      <Nav />
      <main className="px-4 pb-24 pt-5 md:pb-8 md:pl-[184px] md:pr-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/75hard" element={<Hard75 />} />
          <Route path="/instellingen" element={<Instellingen />} />
          <Route path="/training" element={<Training />} />
          <Route path="/business" element={<Business />} />
          <Route path="/school" element={<School />} />
          <Route path="/boeken" element={<Boeken />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  )
}
