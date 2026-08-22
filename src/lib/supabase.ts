import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const CONFIG_KEY = 'noa.supabase.config'

export interface CloudConfig {
  url: string
  anonKey: string
}

function fromEnv(): CloudConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  return url && anonKey ? { url, anonKey } : null
}

function fromStorage(): CloudConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CloudConfig
    return parsed.url && parsed.anonKey ? parsed : null
  } catch {
    return null
  }
}

/**
 * De gegevens komen uit de omgevingsvariabelen van de hosting, of anders uit
 * wat je zelf in de app hebt ingevuld. Dat tweede maakt de app onafhankelijk
 * van hoe hij online is gezet.
 */
export const cloudConfig: CloudConfig | null = fromEnv() ?? fromStorage()
export const cloudConfigured = cloudConfig !== null
export const cloudFromEnv = fromEnv() !== null

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient | null {
  if (!cloudConfig) return null
  if (!client) client = createClient(cloudConfig.url, cloudConfig.anonKey)
  return client
}

/** Herlaadt de pagina, want de verbinding wordt bij het opstarten opgezet. */
export function saveCloudConfig(url: string, anonKey: string): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url: url.trim().replace(/\/+$/, ''), anonKey: anonKey.trim() }))
  window.location.reload()
}

export function clearCloudConfig(): void {
  localStorage.removeItem(CONFIG_KEY)
  window.location.reload()
}

/** Controleert de gegevens voor je ze bewaart, zodat een typfout meteen opvalt. */
export async function testCloudConfig(url: string, anonKey: string): Promise<string | null> {
  const clean = url.trim().replace(/\/+$/, '')
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(clean)) {
    return 'Het adres moet eruitzien als https://jouwproject.supabase.co'
  }
  if (anonKey.trim().length < 40) {
    return 'De sleutel lijkt onvolledig — hij is normaal heel lang.'
  }
  try {
    const probe = createClient(clean, anonKey.trim())
    const { error } = await probe.auth.getSession()
    if (error) return `Supabase antwoordt met: ${error.message}`
    return null
  } catch (err) {
    return err instanceof Error ? err.message : 'Kan Supabase niet bereiken'
  }
}

export const STATE_TABLE = 'dashboard_state'
