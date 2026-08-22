import {
  Bar, BarChart, CartesianGrid, Cell, Legend as RLegend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import type { TooltipProps } from 'recharts'
import { CHROME, SERIES, STATUS } from '../lib/palette'

/**
 * Herbruikbare grafiekvormen. Alle kleuren komen uit het gevalideerde palet,
 * en elke grafiek heeft een tooltip — een grafiek zonder cijfers erbij is
 * een plaatje, geen bron.
 */

const axisStyle = { fill: CHROME.axis, fontSize: 10, fontFamily: '"JetBrains Mono", monospace' }

export const SERIES_ORDER = [SERIES.blue, SERIES.orange, SERIES.aqua, SERIES.violet, SERIES.magenta]

export function TipBox({ label, rows }: { label: string; rows: { name: string; value: string; color: string }[] }) {
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

/* ── Reeksen over tijd, zelfde eenheid ──────────────────────────────────── */

export interface MultiSeries {
  key: string
  label: string
  color: string
}

export function TimeSeries({
  data, series, height = 190, format = (n: number) => String(n), type = 'bar',
}: {
  data: Record<string, string | number>[]
  series: MultiSeries[]
  height?: number
  format?: (n: number) => string
  type?: 'bar' | 'line'
}) {
  const tip = ({ active, payload, label }: TooltipProps<number, string>) =>
    active && payload?.length
      ? <TipBox label={String(label)} rows={payload.map((p) => ({
          name: series.find((s) => s.key === p.dataKey)?.label ?? String(p.dataKey),
          value: format(Number(p.value)),
          color: String(p.color),
        }))} />
      : null

  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={CHROME.grid} strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={12} />
          <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={48} tickFormatter={format} />
          <Tooltip content={tip} cursor={{ stroke: CHROME.accent, strokeWidth: 1, strokeDasharray: '3 3' }} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2}
              dot={false} activeDot={{ r: 4, stroke: CHROME.surface, strokeWidth: 2 }}
              isAnimationActive={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap="24%">
        <CartesianGrid stroke={CHROME.grid} strokeDasharray="2 4" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} minTickGap={8} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={48} tickFormatter={format} />
        <Tooltip content={tip} cursor={{ fill: 'rgba(34,211,238,.06)' }} />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} fill={s.color} stroke={CHROME.surface} strokeWidth={2}
            radius={[4, 4, 0, 0]} isAnimationActive={false} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Rangschikking: horizontale balken ──────────────────────────────────── */

export function RankBars({
  data, height, format = (n: number) => String(n), color = SERIES.aqua, labelWidth = 150,
}: {
  data: { label: string; value: number; color?: string }[]
  height?: number
  format?: (n: number) => string
  color?: string
  labelWidth?: number
}) {
  const h = height ?? Math.max(90, data.length * 30 + 20)
  const tip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload as { label: string; value: number; color?: string }
    return <TipBox label={row.label} rows={[{ name: 'waarde', value: format(row.value), color: row.color ?? color }]} />
  }
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 2, right: 12, bottom: 2, left: 0 }} barCategoryGap="22%">
        <CartesianGrid stroke={CHROME.grid} strokeDasharray="2 4" horizontal={false} />
        <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} tickFormatter={format} />
        <YAxis type="category" dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} width={labelWidth} />
        <Tooltip content={tip} cursor={{ fill: 'rgba(34,211,238,.06)' }} />
        <Bar dataKey="value" stroke={CHROME.surface} strokeWidth={2} radius={[0, 4, 4, 0]} isAnimationActive={false}>
          {data.map((d, i) => <Cell key={i} fill={d.color ?? color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ── Verdeling: ring ────────────────────────────────────────────────────── */

export function Donut({
  data, height = 200, format = (n: number) => String(n), centerLabel, centerValue,
}: {
  data: { label: string; value: number; color: string }[]
  height?: number
  format?: (n: number) => string
  centerLabel?: string
  centerValue?: string
}) {
  const total = data.reduce((n, d) => n + d.value, 0)
  const tip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload as { label: string; value: number; color: string }
    const share = total > 0 ? Math.round((row.value / total) * 100) : 0
    return <TipBox label={row.label} rows={[{ name: `${share}% van totaal`, value: format(row.value), color: row.color }]} />
  }
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="82%"
            stroke={CHROME.surface} strokeWidth={2} paddingAngle={1} isAnimationActive={false}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Pie>
          <Tooltip content={tip} />
        </PieChart>
      </ResponsiveContainer>
      {(centerValue || centerLabel) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <span className="num text-xl font-bold text-ink">{centerValue}</span>}
          {centerLabel && <span className="label mt-0.5">{centerLabel}</span>}
        </div>
      )}
    </div>
  )
}

/* ── Verband tussen twee metingen ───────────────────────────────────────── */

export function Correlation({
  data, xLabel, yLabel, height = 220, color = CHROME.accent,
}: {
  data: { x: number; y: number; label: string }[]
  xLabel: string
  yLabel: string
  height?: number
  color?: string
}) {
  const tip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload?.length) return null
    const row = payload[0].payload as { x: number; y: number; label: string }
    return <TipBox label={row.label} rows={[
      { name: xLabel, value: String(row.x), color },
      { name: yLabel, value: String(row.y), color: CHROME.ink },
    ]} />
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
        <CartesianGrid stroke={CHROME.grid} strokeDasharray="2 4" />
        <XAxis type="number" dataKey="x" name={xLabel} tick={axisStyle} axisLine={false} tickLine={false}
          label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: CHROME.axis, fontSize: 10 }} />
        <YAxis type="number" dataKey="y" name={yLabel} tick={axisStyle} axisLine={false} tickLine={false} width={40} />
        <ZAxis range={[60, 60]} />
        <Tooltip content={tip} cursor={{ strokeDasharray: '3 3', stroke: CHROME.accent }} />
        <Scatter data={data} fill={color} stroke={CHROME.surface} strokeWidth={1.5} isAnimationActive={false} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

/* ── Legende die bij de nieuwe grafieken past ───────────────────────────── */

export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="h-2 w-2 rounded-[2px]" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

export { RLegend, STATUS }
