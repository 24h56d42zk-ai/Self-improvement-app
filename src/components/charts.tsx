import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
  Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { CHROME, SERIES, STATUS } from '../lib/palette'
import { SESSION_STYLE } from '../lib/schedule'

const axisStyle = { fill: CHROME.axis, fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }

function TipBox({ label, rows }: { label: string; rows: { name: string; value: string; color: string }[] }) {
  return (
    <div className="rounded-md border border-line bg-panel2/95 px-3 py-2 shadow-hud backdrop-blur">
      <div className="label mb-1">{label}</div>
      <ul className="space-y-0.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center gap-2 text-xs text-ink">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: r.color }} aria-hidden />
            <span className="text-muted">{r.name}</span>
            <span className="num ml-auto font-medium">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const euro = (n: number) => `€${Math.round(n).toLocaleString('nl-BE')}`

/* ── Dagscore, laatste 14 dagen ─────────────────────────────────────────── */

export function ScoreTrend({ data }: { data: { label: string; score: number | null }[] }) {
  const tip = ({ active, payload, label }: TooltipProps<number, string>) =>
    active && payload?.length
      ? <TipBox label={String(label)} rows={[{ name: 'dagscore', value: String(payload[0].value), color: CHROME.accent }]} />
      : null

  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHROME.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHROME.accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHROME.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={axisStyle} axisLine={false} tickLine={false} width={30} />
        <Tooltip content={tip} cursor={{ stroke: CHROME.accent, strokeWidth: 1, strokeDasharray: '3 3' }} />
        <Area type="monotone" dataKey="score" stroke={CHROME.accent} strokeWidth={2}
          fill="url(#scoreFill)" dot={false} activeDot={{ r: 4, stroke: CHROME.surface, strokeWidth: 2 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Sessies per weekdag, gestapeld per type ────────────────────────────── */

export interface WeekBar { day: string; zwem: number; loop: number; hyrox: number; gepland: number; gemist: number }

export function WeekSessions({ data }: { data: WeekBar[] }) {
  const tip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload as WeekBar
    const rows = (['zwem', 'loop', 'hyrox'] as const)
      .filter((k) => row[k] > 0)
      .map((k) => ({ name: SESSION_STYLE[k].label, value: String(row[k]), color: SESSION_STYLE[k].color }))
    if (row.gemist > 0) rows.push({ name: 'niet gedaan', value: String(row.gemist), color: CHROME.grid })
    rows.push({ name: 'gepland', value: String(row.gepland), color: CHROME.axis })
    return <TipBox label={String(label)} rows={rows} />
  }

  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }} barCategoryGap="30%">
        <CartesianGrid stroke={CHROME.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="day" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis
          allowDecimals={false} tick={axisStyle} axisLine={false} tickLine={false} width={22}
          domain={[0, (max: number) => Math.max(2, Math.ceil(max))]}
        />
        <Tooltip content={tip} cursor={{ fill: 'rgba(34,211,238,.06)' }} />
        {/* Volle balkhoogte = wat gepland stond; het grijze restant bovenaan is wat je liet liggen. */}
        <Bar dataKey="zwem"   stackId="d" fill={SESSION_STYLE.zwem.color}  stroke={CHROME.surface} strokeWidth={2} radius={4} isAnimationActive={false} />
        <Bar dataKey="loop"   stackId="d" fill={SESSION_STYLE.loop.color}  stroke={CHROME.surface} strokeWidth={2} radius={4} isAnimationActive={false} />
        <Bar dataKey="hyrox"  stackId="d" fill={SESSION_STYLE.hyrox.color} stroke={CHROME.surface} strokeWidth={2} radius={4} isAnimationActive={false} />
        <Bar dataKey="gemist" stackId="d" fill={CHROME.grid}               stroke={CHROME.surface} strokeWidth={2} radius={4} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Vermogen over tijd: cash + voorraad, gestapeld ─────────────────────── */

export function NetWorthArea({ data }: { data: { date: string; cash: number; inventory: number; total: number }[] }) {
  const tip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload as { cash: number; inventory: number; total: number }
    return (
      <TipBox
        label={String(label)}
        rows={[
          { name: 'cash', value: euro(row.cash), color: SERIES.blue },
          { name: 'voorraad', value: euro(row.inventory), color: SERIES.aqua },
          { name: 'totaal', value: euro(row.total), color: CHROME.ink },
        ]}
      />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES.blue} stopOpacity={0.4} />
            <stop offset="100%" stopColor={SERIES.blue} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="invFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES.aqua} stopOpacity={0.4} />
            <stop offset="100%" stopColor={SERIES.aqua} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHROME.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={58}
          tickFormatter={(v: number) => `€${Math.round(v / 1000)}k`} />
        <Tooltip content={tip} cursor={{ stroke: CHROME.accent, strokeWidth: 1, strokeDasharray: '3 3' }} />
        <Area type="monotone" dataKey="inventory" stackId="w" stroke={SERIES.aqua} strokeWidth={2} fill="url(#invFill)" isAnimationActive={false} />
        <Area type="monotone" dataKey="cash" stackId="w" stroke={SERIES.blue} strokeWidth={2} fill="url(#cashFill)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Hyrox-stations: prestatie tegenover je eigen doeltijd ──────────────── */

export interface RadarPoint { short: string; label: string; score: number; doel: number }

export function StationRadar({ data }: { data: RadarPoint[] }) {
  const tip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload as RadarPoint
    return (
      <TipBox
        label={row.label}
        rows={[
          { name: 'jouw score', value: row.score === 0 ? 'niet getest' : `${row.score}`, color: SERIES.orange },
          { name: 'doel', value: '100', color: CHROME.axis },
        ]}
      />
    )
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke={CHROME.grid} />
        <PolarAngleAxis dataKey="short" tick={{ ...axisStyle, fontSize: 9 }} />
        <PolarRadiusAxis domain={[0, 130]} tick={false} axisLine={false} />
        <Tooltip content={tip} />
        <Radar name="doel" dataKey="doel" stroke={CHROME.axis} strokeWidth={1}
          strokeDasharray="3 3" fill="none" isAnimationActive={false} />
        <Radar name="jouw score" dataKey="score" stroke={SERIES.orange} strokeWidth={2}
          fill={SERIES.orange} fillOpacity={0.22} isAnimationActive={false} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

/* ── Weekvolume: kilometers en tonnage, elk op hun eigen schaal ─────────── */

export interface VolumePoint { label: string; loopKm: number; zwemKm: number; tonnage: number; load: number }

export function VolumeKm({ data }: { data: VolumePoint[] }) {
  const tip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload as VolumePoint
    return (
      <TipBox label={`week van ${label}`} rows={[
        { name: 'lopen', value: `${row.loopKm} km`, color: SESSION_STYLE.loop.color },
        { name: 'zwemmen', value: `${row.zwemKm} km`, color: SESSION_STYLE.zwem.color },
      ]} />
    )
  }
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }} barCategoryGap="26%">
        <CartesianGrid stroke={CHROME.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={12} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={30} unit="" />
        <Tooltip content={tip} cursor={{ fill: 'rgba(34,211,238,.06)' }} />
        <Bar dataKey="loopKm" stackId="v" fill={SESSION_STYLE.loop.color} stroke={CHROME.surface} strokeWidth={2} radius={4} isAnimationActive={false} />
        <Bar dataKey="zwemKm" stackId="v" fill={SESSION_STYLE.zwem.color} stroke={CHROME.surface} strokeWidth={2} radius={4} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TonnageChart({ data }: { data: VolumePoint[] }) {
  const tip = ({ active, payload, label }: TooltipProps<number, string>) =>
    active && payload?.length
      ? <TipBox label={`week van ${label}`} rows={[
          { name: 'getild', value: `${Number(payload[0].value).toLocaleString('nl-BE')} kg`, color: SERIES.aqua },
        ]} />
      : null
  return (
    <ResponsiveContainer width="100%" height={170}>
      <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }} barCategoryGap="26%">
        <CartesianGrid stroke={CHROME.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={12} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={44}
          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}t` : String(v))} />
        <Tooltip content={tip} cursor={{ fill: 'rgba(34,211,238,.06)' }} />
        <Bar dataKey="tonnage" fill={SERIES.aqua} stroke={CHROME.surface} strokeWidth={2} radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LoadTrend({ data }: { data: VolumePoint[] }) {
  const tip = ({ active, payload, label }: TooltipProps<number, string>) =>
    active && payload?.length
      ? <TipBox label={`week van ${label}`} rows={[
          { name: 'belasting', value: String(payload[0].value), color: CHROME.accent },
        ]} />
      : null
  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="loadFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHROME.accent} stopOpacity={0.32} />
            <stop offset="100%" stopColor={CHROME.accent} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={CHROME.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={12} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={tip} cursor={{ stroke: CHROME.accent, strokeWidth: 1, strokeDasharray: '3 3' }} />
        <Area type="monotone" dataKey="load" stroke={CHROME.accent} strokeWidth={2}
          fill="url(#loadFill)" dot={false} activeDot={{ r: 4, stroke: CHROME.surface, strokeWidth: 2 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ── Winst per beurs ────────────────────────────────────────────────────── */

export interface FairBar { name: string; label: string; winst: number; omzet: number; kosten: number }

export function ProfitPerFair({ data }: { data: FairBar[] }) {
  const tip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload as FairBar
    return (
      <TipBox label={row.name} rows={[
        { name: 'omzet', value: euro(row.omzet), color: CHROME.axis },
        { name: 'kosten', value: euro(row.kosten), color: STATUS.serious },
        { name: 'netto winst', value: euro(row.winst), color: row.winst >= 0 ? SERIES.aqua : STATUS.critical },
      ]} />
    )
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 6 }} barCategoryGap="26%">
        <CartesianGrid stroke={CHROME.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={8} />
        {/* Nul altijd in beeld: anders leest één verliesbeurs als een schaal zonder ijkpunt. */}
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={52}
          domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]}
          tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `€${Math.round(v / 1000)}k` : `€${v}`)} />
        <Tooltip content={tip} cursor={{ fill: 'rgba(34,211,238,.06)' }} />
        <ReferenceLine y={0} stroke={CHROME.axis} strokeWidth={1} />
        <Bar dataKey="winst" stroke={CHROME.surface} strokeWidth={2} radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.winst >= 0 ? SERIES.aqua : STATUS.critical} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
