import { useCallback, useEffect, useState } from 'react'
import { Download, RefreshCw, Store } from 'lucide-react'
import { useStore } from '../lib/store'
import { todayKey } from '../lib/date'
import { euro, type ItemCategory } from '../lib/business'
import {
  fetchOrders, fetchProducts, fetchStatus, getSecret, setSecret,
  type ShopifyOrder, type ShopifyProduct, type ShopifyStatus,
} from '../lib/shopify'
import { SERIES, STATUS } from '../lib/palette'
import { Empty } from './Hud'

/**
 * Haalt je producten en bestellingen uit Shopify en boekt ze hier.
 * Bestellingen die al geboekt zijn worden overgeslagen, dus je kan
 * zo vaak synchroniseren als je wil.
 */
export default function ShopifySync() {
  const { db, update } = useStore()
  const today = todayKey()

  const [status, setStatus] = useState<ShopifyStatus | null>(null)
  const [secret, setSecretInput] = useState(getSecret())
  const [products, setProducts] = useState<ShopifyProduct[] | null>(null)
  const [orders, setOrders] = useState<ShopifyOrder[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus().then(setStatus).catch((e) => setError(e.message))
  }, [])

  const newOrders = (orders ?? []).filter((o) => !db.shopifyImported.includes(o.id))

  const run = useCallback(async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setError(null); setDone(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Er ging iets mis')
    } finally {
      setBusy(null)
    }
  }, [])

  function loadProducts() {
    return run('producten', async () => {
      const { items } = await fetchProducts()
      setProducts(items)
    })
  }

  function loadOrders() {
    return run('bestellingen', async () => {
      const { orders: list } = await fetchOrders()
      setOrders(list)
    })
  }

  /** Zet de producten uit Shopify in je inventaris, of werkt bestaande bij. */
  function importProducts() {
    if (!products) return
    let added = 0
    let updated = 0
    update((draft) => {
      for (const p of products) {
        if (p.quantity <= 0) continue
        const existing = draft.inventory.find(
          (i) => i.shopifyVariantId === p.variantId
            || (p.sku && i.sku === p.sku)
            || i.name.trim().toLowerCase() === p.name.trim().toLowerCase(),
        )
        if (existing) {
          existing.shopifyVariantId = p.variantId
          if (p.sku) existing.sku = p.sku
          existing.quantity = p.quantity
          existing.unitValue = p.price
          if (p.cost !== null && p.cost > 0) existing.unitCost = p.cost
          existing.valueUpdated = today
          updated++
        } else {
          draft.inventory.push({
            id: crypto.randomUUID(),
            name: p.name,
            set: '',
            category: p.category as ItemCategory,
            grade: '',
            quantity: p.quantity,
            unitCost: p.cost ?? 0,
            unitValue: p.price,
            buyDate: today,
            valueUpdated: today,
            note: 'uit Shopify',
            shopifyVariantId: p.variantId,
            sku: p.sku ?? undefined,
          })
          added++
        }
      }
      draft.shopifySyncedAt = new Date().toISOString()
    })
    setDone(`${added} nieuw toegevoegd, ${updated} bijgewerkt`)
  }

  /** Boekt elke bestelling die er nog niet in staat als verkoop. */
  function importOrders() {
    if (newOrders.length === 0) return
    let lines = 0
    let revenue = 0
    update((draft) => {
      for (const order of newOrders) {
        for (const line of order.lines) {
          const item = draft.inventory.find(
            (i) => (line.variantId && i.shopifyVariantId === line.variantId)
              || (line.sku && i.sku === line.sku)
              || i.name.trim().toLowerCase() === line.title.trim().toLowerCase(),
          )
          draft.trades.push({
            id: crypto.randomUUID(),
            kind: 'verkoop',
            date: order.createdAt.slice(0, 10),
            name: line.title,
            category: (item?.category ?? 'sealed') as ItemCategory,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            unitCost: item?.unitCost ?? 0,
            channel: 'online',
            fairId: null,
            itemId: item?.id ?? null,
            note: `Shopify ${order.name}`,
            at: order.createdAt,
            valueAtSale: item?.unitValue ?? line.unitPrice,
            shopifyOrderId: order.id,
          })
          if (item) {
            item.quantity -= line.quantity
            if (item.quantity <= 0) draft.inventory = draft.inventory.filter((i) => i.id !== item.id)
          }
          lines++
          revenue += line.quantity * line.unitPrice
        }
        draft.shopifyImported.push(order.id)
      }
      draft.shopifySyncedAt = new Date().toISOString()
    })
    setDone(`${newOrders.length} bestellingen geboekt · ${lines} regels · ${euro(revenue)}`)
  }

  /* ── Nog niet ingesteld ────────────────────────────────────────────────── */

  if (status && !status.configured) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">
          De koppeling staat klaar, maar de server kent je winkel nog niet. Dat stel je één keer in
          bij Vercel — zie <span className="text-ink">SETUP.md</span>, onderdeel Shopify. Je zet daar
          drie waarden: je winkeladres, een leestoken uit Shopify, en een zelfgekozen wachtwoord.
        </p>
        <p className="text-[11px] text-muted">
          Het token blijft op de server. Zet het nooit in de app zelf — alles wat hier staat is
          leesbaar voor iedereen die je adres opent.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-2 text-sm">
          <Store size={15} style={{ color: SERIES.aqua }} aria-hidden />
          <span className="text-ink">{status?.domain ?? 'verbinden…'}</span>
        </span>
        {db.shopifySyncedAt && (
          <span className="num text-[11px] text-muted">
            laatst gesynchroniseerd {new Date(db.shopifySyncedAt).toLocaleString('nl-BE')}
          </span>
        )}
      </div>

      {status?.needsSecret && !getSecret() && (
        <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); setSecret(secret); setError(null); void loadProducts() }}>
          <input className="input min-w-[220px] flex-1" type="password" value={secret}
            placeholder="Synchronisatiewachtwoord" aria-label="Synchronisatiewachtwoord"
            onChange={(e) => setSecretInput(e.target.value)} />
          <button className="btn-primary" type="submit">Bewaren</button>
          <p className="w-full text-[11px] text-muted">
            Dit is het wachtwoord dat je bij Vercel als SYNC_SECRET zette. Het beschermt je cijfers,
            het is niet je Shopify-token.
          </p>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <button className="btn" onClick={loadProducts} disabled={busy !== null}>
          <RefreshCw size={14} /> {busy === 'producten' ? 'Ophalen…' : 'Producten ophalen'}
        </button>
        <button className="btn" onClick={loadOrders} disabled={busy !== null}>
          <RefreshCw size={14} /> {busy === 'bestellingen' ? 'Ophalen…' : 'Bestellingen ophalen'}
        </button>
      </div>

      {error && <p className="text-sm text-bad">✕ {error}</p>}
      {done && <p className="text-sm" style={{ color: STATUS.good }}>✓ {done}</p>}

      {products && (
        <div className="panel p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="label">
              {products.length} varianten in Shopify · {products.filter((p) => p.quantity > 0).length} met voorraad
            </span>
            <button className="btn-primary py-1.5 text-xs" onClick={importProducts}>
              <Download size={13} /> Overnemen in je inventaris
            </button>
          </div>
          <ul className="max-h-[260px] space-y-1 overflow-y-auto">
            {products.filter((p) => p.quantity > 0).slice(0, 60).map((p) => (
              <li key={p.variantId} className="flex items-center gap-2.5 rounded px-1.5 py-1 text-sm hover:bg-line/30">
                <span className="num w-8 shrink-0 text-[11px] text-muted">{p.quantity}×</span>
                <span className="min-w-0 flex-1 truncate text-ink">{p.name}</span>
                <span className="num shrink-0 text-[10px] uppercase text-muted">{p.category}</span>
                <span className="num w-20 shrink-0 text-right" style={{ color: SERIES.aqua }}>{euro(p.price)}</span>
                <span className="num w-20 shrink-0 text-right text-[11px] text-muted">
                  {p.cost === null ? 'geen kostprijs' : `kost ${euro(p.cost)}`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">
            Vul je kostprijs in bij Shopify (Voorraad → Kostprijs per artikel), dan komt je marge hier
            vanzelf goed te staan. Staat er geen, dan zet ik hem op nul en pas je hem hier aan.
          </p>
        </div>
      )}

      {orders && (
        <div className="panel p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="label">
              {orders.length} bestellingen laatste 30 dagen · {newOrders.length} nog niet geboekt
            </span>
            <button className="btn-primary py-1.5 text-xs" onClick={importOrders} disabled={newOrders.length === 0}>
              <Download size={13} /> {newOrders.length} boeken als verkoop
            </button>
          </div>
          {orders.length === 0 ? (
            <Empty>Nog geen bestellingen in de laatste 30 dagen.</Empty>
          ) : (
            <ul className="max-h-[260px] space-y-1 overflow-y-auto">
              {orders.map((o) => {
                const imported = db.shopifyImported.includes(o.id)
                return (
                  <li key={o.id} className="flex items-center gap-2.5 rounded px-1.5 py-1 text-sm hover:bg-line/30">
                    <span className="num w-14 shrink-0 text-[11px] text-muted">{o.name}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {o.lines.map((l) => `${l.quantity}× ${l.title}`).join(', ')}
                    </span>
                    <span className="num w-20 shrink-0 text-right" style={{ color: SERIES.aqua }}>{euro(o.total)}</span>
                    <span className="num w-20 shrink-0 text-right text-[10px]"
                      style={{ color: imported ? STATUS.good : STATUS.warning }}>
                      {imported ? 'geboekt' : 'nieuw'}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted">
        Bestellingen die je al boekte worden overgeslagen, dus je kan zo vaak synchroniseren als je wil.
        Een geboekte bestelling haalt de stuks van je voorraad af en telt mee in je omzet, marge en
        maandcijfers — net als een verkoop die je zelf invoert.
      </p>
    </div>
  )
}
