import { useMemo, useState } from 'react'
import { useStore } from '../lib/store'
import { addDays, formatShort, todayKey } from '../lib/date'
import { euro } from '../lib/business'
import {
  byCategory, daysInStock, fairReports, inventoryCoverage, inventoryTotals, itemValue,
  salesSummary, slowMovers, staleValues, wealthSeries,
} from '../lib/businessDerive'
import { inventoryFromList, setCash, setInventory, setTotal, wealth } from '../lib/wealth'
import EditableMoney from '../components/EditableMoney'
import { SERIES, STATUS } from '../lib/palette'
import { Bar, Empty, Legend, Panel, ToneLine } from '../components/Hud'
import { NetWorthArea, ProfitPerFair } from '../components/charts'
import { ChartLegend, Donut, RankBars, SERIES_ORDER, TimeSeries } from '../components/charts2'
import {
  bestsellers, byChannel, categoryPerformance, daysToSell, monthlyStats, stockAgeBuckets,
} from '../lib/businessDerive'
import Inventory from '../components/Inventory'
import Trades from '../components/Trades'
import Fairs from '../components/Fairs'

const TABS = ['Overzicht', 'Analyse', 'Inventaris', 'Transacties', 'Beurzen'] as const
type Tab = (typeof TABS)[number]

export default function Business() {
  const { db, update } = useStore()
  const today = todayKey()
  const [tab, setTab] = useState<Tab>('Overzicht')

  const totals = useMemo(() => inventoryTotals(db.inventory), [db.inventory])
  const money = useMemo(() => wealth(db, today), [db, today])
  const fromList = useMemo(() => inventoryFromList(db), [db])
  const wealthPoints = useMemo(() => wealthSeries(db, today), [db, today])
  const cats = useMemo(() => byCategory(db.inventory), [db.inventory])
  const reports = useMemo(() => fairReports(db), [db])
  const stale = useMemo(() => staleValues(db.inventory, 60, today), [db.inventory, today])
  const slow = useMemo(() => slowMovers(db.inventory, 90, today), [db.inventory, today])
  const sales30 = useMemo(() => salesSummary(db, addDays(today, -30)), [db, today])
  const coverage = useMemo(() => inventoryCoverage(db), [db])

  const inventoryShown = money.inventory
  const total = money.total
  const fairBars = reports.map((r) => ({
    name: r.fair.name,
    label: formatShort(r.fair.date),
    winst: Math.round(r.netProfit),
    omzet: Math.round(r.revenue),
    kosten: Math.round(r.costs),
  }))
  const chartWealth = wealthPoints.map((p) => ({ ...p, date: formatShort(p.date) }))

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
              <EditableMoney value={money.cash} color={SERIES.blue} label="Cash"
                onSave={(n) => update((db) => setCash(db, n))} />
              <div className="mt-1 text-[11px] text-muted">
                {money.since
                  ? <>meting {formatShort(money.since)} {money.movements >= 0 ? '+' : '−'}{euro(Math.abs(money.movements))} sindsdien</>
                  : 'klik om je cash te zetten'}
              </div>
            </div>
            <div className="bg-panel p-4">
              <div className="label">Voorraad</div>
              <EditableMoney value={inventoryShown} color={SERIES.aqua} label="Voorraad"
                disabled={fromList} hint="Komt uit je inventarislijst — pas die daar aan"
                onSave={(n) => update((db) => setInventory(db, n))} />
              <div className="mt-1 text-[11px] text-muted">
                {fromList
                  ? <>uit je lijst · ingekocht voor {euro(totals.cost)}</>
                  : <>uit je meting · lijst dekt {euro(totals.value)}</>}
              </div>
            </div>
            <div className="bg-panel p-4">
              <div className="label">Totaal vermogen</div>
              <EditableMoney value={total} label="Totaal vermogen"
                onSave={(n) => update((db) => setTotal(db, n))} />
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
              {!money.since && (
                <ToneLine tone="warn">
                  Nog geen cashmeting. Klik hierboven op het bedrag bij Cash en zet je startbedrag —
                  daarna rekent alles vanzelf verder.
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

      {tab === 'Analyse' && <Analyse />}

      {tab === 'Inventaris' && <Panel hud title="Inventaris"><Inventory /></Panel>}
      {tab === 'Transacties' && <Panel hud title="Aan- en verkopen"><Trades /></Panel>}
      {tab === 'Beurzen' && <Fairs />}
    </div>
  )
}

/* ── Analyse ────────────────────────────────────────────────────────────── */

function Analyse() {
  const { db } = useStore()
  const today = todayKey()

  const months = useMemo(() => monthlyStats(db, 12, today), [db, today])
  const channels = useMemo(() => byChannel(db), [db])
  const cats = useMemo(() => categoryPerformance(db), [db])
  const ages = useMemo(() => stockAgeBuckets(db, today), [db, today])
  const speed = useMemo(() => daysToSell(db), [db])
  const top = useMemo(() => bestsellers(db, 8), [db])

  const totalRevenue = months.reduce((n, m) => n + m.revenue, 0)
  const totalProfit = months.reduce((n, m) => n + m.profit, 0)
  const bestMonth = [...months].sort((a, b) => b.profit - a.profit)[0]
  const hasSales = totalRevenue > 0

  if (!hasSales) {
    return (
      <Panel hud title="Analyse">
        <Empty>
          Nog geen verkopen geboekt. Zodra je een paar verkopen invoert vullen deze grafieken zich vanzelf:
          omzet en winst per maand, marge per categorie en per kanaal, hoe snel dingen weggaan,
          en welke voorraad blijft liggen.
        </Empty>
      </Panel>
    )
  }

  return (
    <div className="space-y-4">
      <div className="panel-hud grid grid-cols-2 gap-px overflow-hidden bg-line/40 lg:grid-cols-4">
        {[
          { label: 'Omzet, 12 maanden', value: euro(totalRevenue), color: SERIES.aqua },
          { label: 'Winst, 12 maanden', value: `${totalProfit >= 0 ? '+' : ''}${euro(totalProfit)}`,
            color: totalProfit >= 0 ? STATUS.good : STATUS.critical },
          { label: 'Gemiddelde marge',
            value: totalRevenue === 0 ? '—' : `${Math.round((totalProfit / totalRevenue) * 100)}%`, color: undefined },
          { label: 'Beste maand', value: bestMonth ? `${bestMonth.label} · ${euro(bestMonth.profit)}` : '—', color: undefined },
        ].map((s) => (
          <div key={s.label} className="bg-panel p-4">
            <div className="label truncate">{s.label}</div>
            <div className="num mt-1 text-xl font-bold" style={s.color ? { color: s.color } : undefined}>{s.value}</div>
          </div>
        ))}
      </div>

      <Panel title="Omzet en winst per maand"
        right={<ChartLegend items={[
          { label: 'omzet', color: SERIES.aqua },
          { label: 'winst', color: SERIES.blue },
        ]} />}>
        <TimeSeries
          data={months.map((m) => ({ label: m.label, omzet: m.revenue, winst: m.profit }))}
          series={[
            { key: 'omzet', label: 'omzet', color: SERIES.aqua },
            { key: 'winst', label: 'winst', color: SERIES.blue },
          ]}
          format={(n) => (Math.abs(n) >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`)}
        />
        <p className="mt-1 text-[11px] text-muted">
          Winst is na aftrek van je beurskosten in die maand. Wat je inkoopt telt niet mee — dat wordt voorraad.
        </p>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Omzet per kanaal">
          {channels.length > 0 ? (
            <>
              <Donut
                data={channels.map((c, i) => ({ label: c.label, value: c.revenue, color: SERIES_ORDER[i % SERIES_ORDER.length] }))}
                format={euro}
                centerValue={euro(channels.reduce((n, c) => n + c.revenue, 0))}
                centerLabel="totaal"
              />
              <ul className="mt-2 space-y-1">
                {channels.map((c, i) => (
                  <li key={c.channel} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ background: SERIES_ORDER[i % SERIES_ORDER.length] }} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-ink">{c.label}</span>
                    <span className="num text-muted">{c.units} st</span>
                    <span className="num w-20 text-right" style={{ color: SERIES.aqua }}>{euro(c.revenue)}</span>
                    <span className="num w-12 text-right text-[11px]"
                      style={{ color: (c.margin ?? 0) >= 20 ? STATUS.good : STATUS.serious }}>
                      {c.margin === null ? '—' : `${Math.round(c.margin)}%`}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : <Empty>Nog geen verkopen per kanaal.</Empty>}
        </Panel>

        <Panel title="Marge per categorie">
          <RankBars
            data={cats.filter((c) => c.revenue > 0).map((c, i) => ({
              label: c.label,
              value: Math.round(c.margin ?? 0),
              color: SERIES_ORDER[i % SERIES_ORDER.length],
            }))}
            format={(n) => `${n}%`}
          />
          <ul className="mt-2 space-y-1 border-t border-line/60 pt-2">
            {cats.filter((c) => c.revenue > 0).map((c) => (
              <li key={c.id} className="flex items-center gap-2 text-[11px] text-muted">
                <span className="min-w-0 flex-1 truncate text-ink">{c.label}</span>
                <span className="num">omzet {euro(c.revenue)}</span>
                <span className="num">winst {euro(c.profit)}</span>
                <span className="num w-16 text-right">
                  {c.roi === null ? '' : `ROI ${Math.round(c.roi)}%`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted">
            ROI is je winst gedeeld door wat je voor die spullen betaalde — hoe hard je geld werkt.
          </p>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Hoe lang je voorraad al ligt">
          <TimeSeries
            data={ages.map((a) => ({ label: a.label, waarde: a.value }))}
            series={[{ key: 'waarde', label: 'voorraadwaarde', color: SERIES.aqua }]}
            format={(n) => (n >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`)}
            height={170}
          />
          <p className="mt-1 text-[11px] text-muted">
            Alles rechts van 90 dagen is geld dat stilstaat. {euro(ages.slice(3).reduce((n, a) => n + a.value, 0))} zit
            daar nu in.
          </p>
        </Panel>

        <Panel title="Gemiddelde tijd tot verkoop">
          {speed.length > 0 ? (
            <>
              <RankBars data={speed.map((s, i) => ({ ...s, color: SERIES_ORDER[i % SERIES_ORDER.length] }))}
                format={(n) => `${n} d`} />
              <p className="mt-1 text-[11px] text-muted">
                Gerekend van aankoop tot verkoop, alleen voor items die via je inventaris liepen.
              </p>
            </>
          ) : (
            <Empty>Nog te weinig gekoppelde aan- en verkopen om dit te berekenen.</Empty>
          )}
        </Panel>
      </div>

      <Panel title="Bestsellers" right={<span className="num text-[11px] text-muted">op omzet</span>}>
        <RankBars data={top.map((t) => ({ label: t.name.length > 22 ? `${t.name.slice(0, 21)}…` : t.name, value: t.revenue }))}
          format={euro} />
        <ul className="mt-2 space-y-1 border-t border-line/60 pt-2">
          {top.map((t) => (
            <li key={t.name} className="flex items-center gap-2 text-sm">
              <span className="num w-8 shrink-0 text-[11px] text-muted">{t.units}×</span>
              <span className="min-w-0 flex-1 truncate text-ink">{t.name}</span>
              <span className="num w-20 text-right" style={{ color: SERIES.aqua }}>{euro(t.revenue)}</span>
              <span className="num w-20 text-right text-[11px]"
                style={{ color: t.profit >= 0 ? STATUS.good : STATUS.critical }}>
                {t.profit >= 0 ? '+' : ''}{euro(t.profit)}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}
