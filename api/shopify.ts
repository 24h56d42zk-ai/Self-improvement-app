/**
 * Serverfunctie op Vercel die met Shopify praat.
 *
 * Het toegangstoken staat hier in een omgevingsvariabele en verlaat de server
 * nooit: de webapp krijgt alleen het resultaat te zien. Zou het token in de
 * app zelf staan, dan kon iedereen die het adres opent je store beheren.
 *
 * Nodig in Vercel:
 *   SHOPIFY_STORE_DOMAIN  jouwwinkel.myshopify.com
 *   SHOPIFY_ADMIN_TOKEN   shpat_...   (alleen leesrechten)
 *   SYNC_SECRET           zelfgekozen wachtwoord, ook in de app in te vullen
 */

export const config = { runtime: 'edge' }

const API_VERSION = '2025-07'

const PRODUCTS_QUERY = `
  query Products($cursor: String) {
    products(first: 100, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges { node {
        id title productType tags status
        variants(first: 10) { edges { node {
          id title sku price inventoryQuantity
          inventoryItem { unitCost { amount } }
        } } }
      } }
    }
  }`

const ORDERS_QUERY = `
  query Orders($cursor: String, $query: String) {
    orders(first: 50, after: $cursor, query: $query, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges { node {
        id name createdAt cancelledAt
        totalPriceSet { shopMoney { amount } }
        lineItems(first: 50) { edges { node {
          id title quantity sku
          variant { id }
          originalUnitPriceSet { shopMoney { amount } }
          discountedUnitPriceSet { shopMoney { amount } }
        } } }
      } }
    }
  }`

async function shopify(query: string, variables: Record<string, unknown>) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN
  const token = process.env.SHOPIFY_ADMIN_TOKEN
  if (!domain || !token) throw new Error('Shopify is nog niet ingesteld op de server')

  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Shopify antwoordde met ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0]?.message ?? 'Shopify gaf een fout terug')
  return json.data
}

/** Leidt een categorie af uit de labels en het producttype van Shopify. */
function categoryOf(tags: string[], productType: string): string {
  const lower = tags.map((t) => t.toLowerCase())
  const type = (productType || '').toLowerCase()
  if (lower.some((t) => t.includes('psa') || t.includes('graded') || t.includes('slab'))) return 'slab'
  if (lower.includes('sealed') || type.includes('sealed')) return 'sealed'
  if (lower.some((t) => t.includes('accessoire') || t.includes('accessory') || t.includes('sleeve'))) return 'accessoire'
  if (lower.includes('singles') || type.includes('single')) return 'single'
  return 'sealed'
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const action = url.searchParams.get('action') ?? 'status'

  const secret = process.env.SYNC_SECRET
  const given = request.headers.get('x-sync-secret')
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  if (action === 'status') {
    return json({
      configured: Boolean(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ADMIN_TOKEN),
      needsSecret: Boolean(secret),
      domain: process.env.SHOPIFY_STORE_DOMAIN ?? null,
    })
  }

  // Zonder deze controle zou iedereen die je adres kent je verkoopcijfers kunnen opvragen.
  if (secret && given !== secret) return json({ error: 'Verkeerd of ontbrekend wachtwoord' }, 401)

  try {
    if (action === 'products') {
      const items: unknown[] = []
      let cursor: string | null = null
      for (let page = 0; page < 10; page++) {
        const data: any = await shopify(PRODUCTS_QUERY, { cursor })
        for (const edge of data.products.edges) {
          const p = edge.node
          for (const v of p.variants.edges.map((e: any) => e.node)) {
            items.push({
              variantId: v.id,
              productId: p.id,
              name: v.title && v.title !== 'Default Title' && v.title !== 'Default'
                ? `${p.title} — ${v.title}`
                : p.title,
              sku: v.sku ?? null,
              category: categoryOf(p.tags ?? [], p.productType ?? ''),
              quantity: v.inventoryQuantity ?? 0,
              price: Number(v.price ?? 0),
              cost: v.inventoryItem?.unitCost ? Number(v.inventoryItem.unitCost.amount) : null,
              status: p.status,
            })
          }
        }
        if (!data.products.pageInfo.hasNextPage) break
        cursor = data.products.pageInfo.endCursor
      }
      return json({ items })
    }

    if (action === 'orders') {
      const since = url.searchParams.get('since')
      const query = since ? `created_at:>='${since}'` : 'created_at:>=-30d'
      const orders: unknown[] = []
      let cursor: string | null = null
      for (let page = 0; page < 5; page++) {
        const data: any = await shopify(ORDERS_QUERY, { cursor, query })
        for (const edge of data.orders.edges) {
          const o = edge.node
          if (o.cancelledAt) continue
          orders.push({
            id: o.id,
            name: o.name,
            createdAt: o.createdAt,
            total: Number(o.totalPriceSet?.shopMoney?.amount ?? 0),
            // Bewust geen klantgegevens: die horen niet in dit dashboard.
            lines: o.lineItems.edges.map((e: any) => ({
              title: e.node.title,
              quantity: e.node.quantity,
              sku: e.node.sku ?? null,
              variantId: e.node.variant?.id ?? null,
              unitPrice: Number(
                e.node.discountedUnitPriceSet?.shopMoney?.amount
                ?? e.node.originalUnitPriceSet?.shopMoney?.amount
                ?? 0,
              ),
            })),
          })
        }
        if (!data.orders.pageInfo.hasNextPage) break
        cursor = data.orders.pageInfo.endCursor
      }
      return json({ orders })
    }

    return json({ error: `Onbekende actie: ${action}` }, 400)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Onbekende fout' }, 500)
  }
}
