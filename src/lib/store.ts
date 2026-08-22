import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react'
import type { Database, DayLog, Settings } from './types'
import { emptyDatabase, emptyDay } from './types'
import { todayKey } from './date'
import { cloudConfigured, STATE_TABLE, supabase } from './supabase'

const LOCAL_KEY = 'noa.dashboard.v1'

type SyncState = 'local' | 'signed-out' | 'syncing' | 'synced' | 'error'

interface StoreValue {
  db: Database
  /** Muteer de database met een recept; slaat automatisch op. */
  update: (recipe: (draft: Database) => void) => void
  day: (dateKey?: string) => DayLog
  setDay: (dateKey: string, recipe: (draft: DayLog) => void) => void
  setSettings: (patch: Partial<Settings>) => void
  sync: SyncState
  syncError: string | null
  cloudConfigured: boolean
  email: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  exportJson: () => string
  importJson: (raw: string) => void
  ready: boolean
}

const StoreContext = createContext<StoreValue | null>(null)

function readLocal(): Database {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return emptyDatabase()
    const parsed = JSON.parse(raw) as Database
    return { ...emptyDatabase(), ...parsed }
  } catch {
    return emptyDatabase()
  }
}

function writeLocal(db: Database) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(db))
  } catch {
    /* quota vol of privémodus: de app blijft werken, alleen zonder bewaren */
  }
}

/** Diepe kloon zonder externe library; onze data is puur JSON. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<Database>(() => readLocal())
  const [sync, setSync] = useState<SyncState>(cloudConfigured ? 'signed-out' : 'local')
  const [syncError, setSyncError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [ready, setReady] = useState(!cloudConfigured)
  const pushTimer = useRef<number | null>(null)
  const userId = useRef<string | null>(null)

  const pull = useCallback(async (uid: string) => {
    const sb = supabase()
    if (!sb) return
    setSync('syncing')
    const { data, error } = await sb
      .from(STATE_TABLE)
      .select('data')
      .eq('user_id', uid)
      .maybeSingle()
    if (error) {
      setSyncError(error.message)
      setSync('error')
      return
    }
    const remote = data?.data as Database | undefined
    setDb((local) => {
      if (!remote) return local
      // Nieuwste wint. Bij gelijkspel houden we lokaal, dat voelt het minst verrassend.
      const merged = remote.updatedAt > local.updatedAt ? { ...emptyDatabase(), ...remote } : local
      writeLocal(merged)
      return merged
    })
    setSync('synced')
  }, [])

  // Bestaande sessie herstellen bij het openen van de app.
  useEffect(() => {
    const sb = supabase()
    if (!sb) { setReady(true); return }
    let cancelled = false
    sb.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const user = data.session?.user
      if (user) {
        userId.current = user.id
        setEmail(user.email ?? null)
        void pull(user.id)
      }
      setReady(true)
    })
    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      userId.current = user?.id ?? null
      setEmail(user?.email ?? null)
      if (user) void pull(user.id)
      else setSync('signed-out')
    })
    return () => { cancelled = true; listener.subscription.unsubscribe() }
  }, [pull])

  const push = useCallback((next: Database) => {
    const sb = supabase()
    const uid = userId.current
    if (!sb || !uid) return
    if (pushTimer.current) window.clearTimeout(pushTimer.current)
    pushTimer.current = window.setTimeout(async () => {
      setSync('syncing')
      const { error } = await sb
        .from(STATE_TABLE)
        .upsert({ user_id: uid, data: next, updated_at: next.updatedAt }, { onConflict: 'user_id' })
      if (error) { setSyncError(error.message); setSync('error') }
      else { setSyncError(null); setSync('synced') }
    }, 800)
  }, [])

  const update = useCallback((recipe: (draft: Database) => void) => {
    setDb((current) => {
      const draft = clone(current)
      recipe(draft)
      draft.updatedAt = new Date().toISOString()
      writeLocal(draft)
      push(draft)
      return draft
    })
  }, [push])

  const day = useCallback((dateKey?: string) => {
    const key = dateKey ?? todayKey()
    return db.days[key] ?? emptyDay(key)
  }, [db])

  const setDay = useCallback((dateKey: string, recipe: (draft: DayLog) => void) => {
    update((draft) => {
      const existing = draft.days[dateKey] ?? emptyDay(dateKey)
      recipe(existing)
      draft.days[dateKey] = existing
    })
  }, [update])

  const setSettings = useCallback((patch: Partial<Settings>) => {
    update((draft) => { draft.settings = { ...draft.settings, ...patch } })
  }, [update])

  const signIn = useCallback(async (mail: string, password: string) => {
    const sb = supabase()
    if (!sb) throw new Error('Cloud is niet ingesteld')
    const { error } = await sb.auth.signInWithPassword({ email: mail, password })
    if (error) throw new Error(error.message)
  }, [])

  const signUp = useCallback(async (mail: string, password: string) => {
    const sb = supabase()
    if (!sb) throw new Error('Cloud is niet ingesteld')
    const { error } = await sb.auth.signUp({ email: mail, password })
    if (error) throw new Error(error.message)
  }, [])

  const signOut = useCallback(async () => {
    const sb = supabase()
    if (sb) await sb.auth.signOut()
  }, [])

  const exportJson = useCallback(() => JSON.stringify(db, null, 2), [db])

  const importJson = useCallback((raw: string) => {
    const parsed = JSON.parse(raw) as Database
    if (typeof parsed !== 'object' || parsed === null || !('days' in parsed)) {
      throw new Error('Dit bestand ziet er niet uit als een export van dit dashboard.')
    }
    update((draft) => {
      Object.assign(draft, { ...emptyDatabase(), ...parsed })
    })
  }, [update])

  // Rustige modus schakelt animaties uit via een attribuut op <body>.
  useEffect(() => {
    document.body.dataset.calm = String(db.settings.calmMode)
  }, [db.settings.calmMode])

  const value = useMemo<StoreValue>(() => ({
    db, update, day, setDay, setSettings,
    sync, syncError, cloudConfigured, email,
    signIn, signUp, signOut, exportJson, importJson, ready,
  }), [db, update, day, setDay, setSettings, sync, syncError, email, signIn, signUp, signOut, exportJson, importJson, ready])

  return React.createElement(StoreContext.Provider, { value }, children)
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore moet binnen <StoreProvider> gebruikt worden')
  return ctx
}
