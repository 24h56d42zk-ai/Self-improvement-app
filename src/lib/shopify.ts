import type { ItemCategory } from './business'

/**
 * Praat met de serverfunctie, nooit rechtstreeks met Shopify. Het wachtwoord
 * hieronder beschermt alleen die functie; het is niet je Shopify-token.
 */

const SECRET_KEY = 'noa.shopify.secret'

export interface ShopifyProduct {
  variantId: string
  productId: string
  name: string
  sku: string | null
  category: ItemCategory
  quantity: number
  price: number
  cost: number | null
  status: string
}

export interface ShopifyOrderLine {
  title: string
  quantity: number
  sku: string | null
  variantId: string | null
  unitPrice: number
}

export interface ShopifyOrder {
  id: string
  name: string
  createdAt: string
  total: number
  lines: ShopifyOrderLine[]
}

export interface ShopifyStatus {
  configured: boolean
  needsSecret: boolean
  domain: string | null
}

export function getSecret(): string {
  try {
    return localStorage.getItem(SECRET_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setSecret(value: string): void {
  try {
    if (value) localStorage.setItem(SECRET_KEY, value)
    else localStorage.removeItem(SECRET_KEY)
  } catch {
    /* privémodus: dan vraagt hij het gewoon opnieuw */
  }
}

async function call<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ action, ...params })
  const res = await fetch(`/api/shopify?${query}`, {
    headers: getSecret() ? { 'x-sync-secret': getSecret() } : {},
  })
  const text = await res.text()
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    // Zonder serverfunctie serveert Vercel de index-pagina terug.
    throw new Error('De serverfunctie draait nog niet. Zie SETUP.md, onderdeel Shopify.')
  }
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Fout ${res.status}`)
  return body as T
}

export function fetchStatus(): Promise<ShopifyStatus> {
  return call<ShopifyStatus>('status')
}

export function fetchProducts(): Promise<{ items: ShopifyProduct[] }> {
  return call<{ items: ShopifyProduct[] }>('products')
}

export function fetchOrders(since?: string): Promise<{ orders: ShopifyOrder[] }> {
  return call<{ orders: ShopifyOrder[] }>('orders', since ? { since } : {})
}
