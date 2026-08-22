import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { addDays, formatShort, todayKey } from '../lib/date'
import { euro } from '../lib/business'
import {
  byCategory, cashNow, daysInStock, fairReports, inventoryCoverage, inventoryTotals, itemValue,
  salesSummary, slowMovers, staleValues, wealthSeries,
} from '../lib/businessDerive'
import { SERIES, STATUS } from '../lib/palette'
import { Bar, Empty, Legend, Panel, ToneLine } from '../components/Hud'
import { NetWorthArea, ProfitPerFair } from '../components/charts'
import Inventory from '../components/Inventory'
import Trades from '../components/Trades'
import Fairs from '../components/Fairs'

const TABS = ['Overzicht', 'Inventaris', 'Transacties', 'Beurzen'] as const
type Tab = (typeof TABS)[number]

export default function Business() {
  const { db } = useStore()
  const today = todayKey()
  const [tab, setTab] = useState<Tab>('Overzicht')

  const totals = useMemo(() => inventoryTotals(db.inventory), [db.inventory])
  const cash = useMemo(() => cashNow(db, today), [db, today])
  const wealth = useMemo(() => wealthSeries(db, today), [db, today])
  const cats = useMemo(() => byCategory(db.inventory), [db.inventory])
  const reports = useMemo(() => fairReports(db), [db])
  const stale = useMemo(() => staleValues(db.inventory, 60, today), [db.inventory, today])
  const slow = useMemo(() => slowMovers(db.inventory, 90, today), [db.inventory, today])
  const sales30 = useMemo(() => salesSummary(db, addDays(today, -30)), [db, today])
  const coverage = useMemo(() => inventoryCoverage(db), [db])

  const inventoryShown = coverage.complete ? totals.value : Math.max(totals.value, coverage.measured)
  const total = cash.amount + inventoryShown
  const fairBars = reports.map((r) => ({
    name: r.fair.name,
    label: formatShort(r.fair.date),
    winst: Math.round(r.netProfit),
    omzet: Math.round(r.revenue),
    kosten: Math.round(r.costs),
  }))
  const chartWealth = wealth.map((p) => ({ ...p, date: formatShort(p.date) }))

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="num text-2xl font-bold text-ink">BUSINESS</h1>
          <p className="text-sm text-muted">
            {totals.lines} regels · {totals.units} stuks · {reports.length} beurzen geboekt
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

      {tab === 'Overzicht' && (
        <>
          <div className="panel-hud relative grid grid-cols-2 gap-px overflow-hidden bg-line/40 lg:grid-cols-4">
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden">
              <span className="block h-px w-1/3 animate-sweep bg-gradient-to-r from-transparent via-accent to-transparent" />
            </span>
            <div className="bg-panel p-4">
              <div className="label">Cash nu</div>
              <div className="num mt-1 text-2xl font-bold" style={{ color: SERIES.blue }}>{euro(cash.amount)}</div>
              <div className="mt-1 text-[11px] text-muted">
                {cash.since
                  ? <>meting {formatShort(cash.since)} {cash.movements >= 0 ? '+' : '−'}{euro(Math.abs(cash.movements))} sindsdien</>
                  : 'nog geen meting ingevoerd'}
              </div>
            </div>
            <div className="bg-panel p-4">
              <div className="label">Voorraad</div>
              <div className="num mt-1 text-2xl font-bold" style={{ color: SERIES.aqua }}>
                {euro(coverage.complete ? totals.value : Math.max(totals.value, coverage.measured))}
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {coverage.complete
                  ? <>ingekocht voor {euro(totals.cost)}</>
                  : <>uit je meting · lijst dekt {euro(totals.value)}</>}
              </div>
            </div>
            <div className="bg-panel p-4">
              <div className="label">Totaal vermogen</div>
              <div className="num mt-1 text-2xl font-bold text-ink">{euro(total)}</div>
              <div className="mt-1 text-[11px] text-muted">
                {total > 0 ? `${Math.round((inventoryShown / total) * 100)}% zit vast in voorraad` : '—'}
              </div>
            </div>
            <div className="bg-panel p-4">
              <div className="label">Ongerealiseerde winst</div>
              <div className="num mt-1 text-2xl font-bold"
                style={{ color: totals.unrealised >= 0 ? STATUS.good : STATUS.critical }}>
                {totals.unrealised >= 0 ? '+' : ''}{euro(totals.unrealised)}
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {totals.margin === null ? '—' : `marge ${Math.round(totals.margin)}% op huidige waarde`}
              </div>
            </div>
          </div>

          <Panel hud title="Wat er nu opvalt">
            <ul className="space-y-1.5">
              {!coverage.complete && coverage.measured > 0 && (
                <ToneLine tone="warn">
                  Je inventarislijst telt {euro(coverage.live)} op, tegenover {euro(coverage.measured)} in je laatste
                  meting. Zolang dat gat er is rekent de grafiek met je metingen, niet met de lijst — vul de lijst aan
                  of werk je meting bij.
                </ToneLine>
              )}
              {!cash.since && (
                <ToneLine tone="warn">
                  Nog geen cashmeting. Zet er één bij Instellingen → Vermogen, dan rekent alles daarna vanzelf verder.
                </ToneLine>
              )}
              {stale.length > 0 && (
                <ToneLine tone="warn">
                  {stale.length} {stale.length === 1 ? 'item is' : 'items zijn'} langer dan 60 dagen niet bijgewerkt —
                  samen {euro(stale.reduce((n, i) => n + itemValue(i), 0))} aan verouderde cijfers.
                </ToneLine>
              )}
              {slow.length > 0 && (
                <ToneLine tone="warn">
                  {euro(slow.reduce((n, i) => n + itemValue(i), 0))} ligt 90 dagen of langer stil
                  ({slow.length} {slow.length === 1 ? 'regel' : 'regels'}). Dat is geld dat niet werkt.
                </ToneLine>
              )}
              {sales30.transactions > 0 && (
                <ToneLine tone={sales30.profit >= 0 ? 'good' : 'bad'}>
                  Laatste 30 dagen: {euro(sales30.revenue)} omzet, {sales30.profit >= 0 ? '+' : ''}{euro(sales30.profit)} winst
                  over {sales30.transactions} verkopen
                  {sales30.margin !== null && ` (marge ${Math.round(sales30.margin)}%)`}.
                </ToneLine>
              )}
              {reports.length > 0 && (() => {
                const best = [...reports].sort((a, b) => b.netProfit - a.netProfit)[0]
                return (
                  <ToneLine tone="neutral">
                    Beste beurs tot nu: {best.fair.name} met {euro(best.netProfit)} netto
                    {best.profitPerHour !== null && ` (${euro(best.profitPerHour)} per uur)`}.
                  </ToneLine>
                )
              })()}
              {db.inventory.length === 0 && (
                <ToneLine tone="neutral">
                  Nog geen inventaris. Begin bij je grootste posities — die bepalen je waarde toch het meest.
                </ToneLine>
              )}
            </ul>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-2">
            <Panel title="Vermogen over tijd"
              right={<Legend items={[
                { label: 'cash', color: SERIES.blue },
                { label: 'voorraad', color: SERIES.aqua },
              ]} />}>
              {chartWealth.length >= 2 ? (
                <>
                  <NetWorthArea data={chartWealth} />
                  <p className="mt-1 text-[11px] text-muted">
                    {coverage.complete
                      ? 'Historische punten komen uit je metingen; het laatste punt rekent live met je inventaris en cash.'
                      : 'Alle punten komen uit je handmatige metingen — je inventarislijst dekt nog te weinig om mee te rekenen.'}
                  </p>
                </>
              ) : (
                <Empty>Voeg minstens twee metingen toe bij Instellingen → Vermogen.</Empty>
              )}
            </Panel>

            <Panel title="Netto winst per beurs">
              {fairBars.length > 0 ? (
                <>
                  <ProfitPerFair data={fairBars} />
                  <p className="mt-1 text-[11px] text-muted">
                    Netto = winst op je verkopen min standhuur, transport en overige kosten.
                    Wat je er inkoopt telt niet als kost — dat wordt voorraad.
                  </p>
                </>
              ) : (
                <Empty>Nog geen beurzen geboekt. Voeg er één toe bij het tabblad Beurzen.</Empty>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel title="Verdeling van je voorraad">
              {totals.value === 0 ? (
                <Empty>Nog geen items.</Empty>
              ) : (
                <ul className="space-y-2.5">
                  {cats.filter((c) => c.value > 0).map((c) => (
                    <li key={c.id}>
                      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                        <span className="text-ink">{c.label} <span className="text-[11px] text-muted">· {c.units} stuks</span></span>
                        <span className="num text-muted">
                          {euro(c.value)} <span className="text-[10px]">({Math.round((c.value / totals.value) * 100)}%)</span>
                        </span>
                      </div>
                      <Bar value={c.value} max={totals.value} color={SERIES.aqua} />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Langst in stock" right={<span className="num text-[11px] text-muted">90 dagen of meer</span>}>
              {slow.length === 0 ? (
                <Empty>Niets ligt langer dan 90 dagen stil. Goed.</Empty>
              ) : (
                <ul className="space-y-1">
                  {slow.slice(0, 8).map((i) => (
                    <li key={i.id} className="flex items-center gap-2.5 text-sm">
                      <span className="num w-12 shrink-0 text-[11px]" style={{ color: STATUS.serious }}>
                        {daysInStock(i, today)}d
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ink">{i.name}</span>
                      <span className="num shrink-0 text-muted">{euro(itemValue(i))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}

      {tab === 'Inventaris' && <Panel hud title="Inventaris"><Inventory /></Panel>}
      {tab === 'Transacties' && <Panel hud title="Aan- en verkopen"><Trades /></Panel>}
      {tab === 'Beurzen' && <Fairs />}
    </div>
  )
}
