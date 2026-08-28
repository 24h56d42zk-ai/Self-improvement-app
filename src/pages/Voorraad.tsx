import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { formatShort, todayKey } from '../lib/date'
import { channelLabel, euro } from '../lib/business'
import { inventoryTotals, tradeProfit, tradeTotal } from '../lib/businessDerive'
import { inventoryFromList, wealth } from '../lib/wealth'
import { SERIES, STATUS } from '../lib/palette'
import { Empty, Panel } from '../components/Hud'
import QuickEntry from '../components/QuickEntry'
import Inventory from '../components/Inventory'
import Trades from '../components/Trades'
import ShopifySync from '../components/ShopifySync'

const TABS = ['Boeken', 'Voorraad', 'Geschiedenis', 'Shopify'] as const
type Tab = (typeof TABS)[number]

/**
 * De werkpagina voor je business: hier boek je wat je koopt en verkoopt,
 * en hier staat je voorraad. De cijfers en rapporten staan bij Business.
 */
export default function Voorraad() {
  const { db } = useStore()
  const today = todayKey()
  const [tab, setTab] = useState<Tab>('Boeken')

  const money = useMemo(() => wealth(db, today), [db, today])
  const totals = useMemo(() => inventoryTotals(db.inventory), [db.inventory])
  const fromList = useMemo(() => inventoryFromList(db), [db])

  const recent = useMemo(
    () => [...db.trades]
      .sort((a, b) => (b.at ?? b.date).localeCompare(a.at ?? a.date))
      .slice(0, 8),
    [db.trades],
  )

  const todaySales = db.trades.filter((t) => t.kind === 'verkoop' && t.date === today)
  const todayRevenue = todaySales.reduce((n, t) => n + tradeTotal(t), 0)
  const todayProfit = todaySales.reduce((n, t) => n + (tradeProfit(t) ?? 0), 0)

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="num text-2xl font-bold text-ink">VOORRAAD</h1>
          <p className="text-sm text-muted">
            {totals.lines} regels · {totals.units} stuks
            {todaySales.length > 0 && ` · vandaag ${todaySales.length} verkocht`}
          </p>
        </div>
        <nav className="flex gap-1" role="tablist">
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

      <div className="panel-hud relative grid grid-cols-2 gap-px overflow-hidden bg-line/40 lg:grid-cols-4">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
          <span className="block h-px w-1/3 animate-sweep bg-gradient-to-r from-transparent via-accent to-transparent" />
        </span>
        {[
          { label: 'Cash', value: euro(money.cash), color: SERIES.blue, sub: money.since ? `sinds meting ${formatShort(money.since)}` : 'nog geen meting' },
          {
            label: 'Voorraadwaarde', value: euro(money.inventory), color: SERIES.aqua,
            sub: fromList ? `uit je lijst · ingekocht voor ${euro(totals.cost)}` : `uit je meting · lijst dekt ${euro(totals.value)}`,
          },
          { label: 'Totaal', value: euro(money.total), color: undefined, sub: `${money.total > 0 ? Math.round((money.inventory / money.total) * 100) : 0}% zit in voorraad` },
          {
            label: 'Vandaag verkocht', value: euro(todayRevenue),
            color: todaySales.length > 0 ? STATUS.good : undefined,
            sub: todaySales.length > 0 ? `${todayProfit >= 0 ? '+' : ''}${euro(todayProfit)} winst` : 'nog niets geboekt',
          },
        ].map((s) => (
          <div key={s.label} className="bg-panel p-4">
            <div className="label truncate">{s.label}</div>
            <div className="num mt-1 text-2xl font-bold" style={s.color ? { color: s.color } : undefined}>{s.value}</div>
            <div className="mt-1 truncate text-[11px] text-muted">{s.sub}</div>
          </div>
        ))}
      </div>

      {tab === 'Boeken' && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,400px)]">
          <Panel hud title="Kopen of verkopen">
            <QuickEntry />
          </Panel>

          <Panel title="Net geboekt">
            {recent.length === 0 ? (
              <Empty>Nog niets geboekt. Wat je hiernaast invoert verschijnt hier meteen.</Empty>
            ) : (
              <ul className="space-y-1.5">
                {recent.map((t) => {
                  const profit = tradeProfit(t)
                  const fair = db.fairs.find((f) => f.id === t.fairId)
                  return (
                    <li key={t.id} className="flex items-center gap-2.5 rounded-md border border-line/60 bg-panel2/40 px-2.5 py-2">
                      <span className="h-7 w-1 shrink-0 rounded-full"
                        style={{ background: t.kind === 'verkoop' ? STATUS.good : STATUS.serious }} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{t.quantity}× {t.name}</span>
                        <span className="block truncate text-[10px] text-muted">
                          {formatShort(t.date)} · {fair ? fair.name : channelLabel(t.channel)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="num block text-sm"
                          style={{ color: t.kind === 'verkoop' ? SERIES.aqua : undefined }}>
                          {t.kind === 'aankoop' ? '−' : '+'}{euro(tradeTotal(t))}
                        </span>
                        {profit !== null && (
                          <span className="num block text-[10px]"
                            style={{ color: profit >= 0 ? STATUS.good : STATUS.critical }}>
                            {profit >= 0 ? '+' : ''}{euro(profit)}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {tab === 'Voorraad' && <Panel hud title="Alles wat je hebt liggen"><Inventory /></Panel>}
      {tab === 'Geschiedenis' && <Panel hud title="Alle aan- en verkopen"><Trades /></Panel>}
      {tab === 'Shopify' && <Panel hud title="Shopify-koppeling"><ShopifySync /></Panel>}
    </div>
  )
}
