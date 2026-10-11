"use client"

import { useId } from "react"
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis, type LabelProps } from "recharts"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { fmt } from "@/lib/format"

type Point = { year: number; school: number; peerMedian: number }

function growth(data: Point[], key: "school" | "peerMedian") {
  const first = data[0]?.[key]
  const last = data.at(-1)?.[key]
  return first && last ? (last - first) / first : 0
}

const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n * 100).toFixed(0)}%`

export function EnrollmentTrendChart({ data, schoolName }: { data: Point[]; schoolName: string }) {
  const gradientId = useId().replace(/:/g, "")
  const config = {
    school: { label: schoolName, color: "var(--chart-1)" },
    peerMedian: { label: "Peer median", color: "var(--chart-2)" },
  } satisfies ChartConfig

  const values = data.flatMap((d) => [d.school, d.peerMedian])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const step = Math.max(10, Math.ceil((max - min) / 4 / 10) * 10)
  const domain = [Math.max(0, Math.floor((min - step) / step) * step), Math.ceil((max + step / 2) / step) * step]

  const endLabel = (key: "school" | "peerMedian") =>
    function EndLabel({ x, y, index, value }: LabelProps) {
      if (index !== data.length - 1) return null
      return (
        <text
          x={Number(x) + 10}
          y={Number(y)}
          dy={4}
          className="tabular text-sm font-semibold"
          fill={`var(--color-${key})`}
        >
          {fmt.number(Math.round(Number(value)))}
        </text>
      )
    }

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <Summary color="bg-chart-1" label={schoolName} value={pct(growth(data, "school"))} since={data[0]?.year} />
        <Summary color="bg-chart-2" label="Peer median" value={pct(growth(data, "peerMedian"))} since={data[0]?.year} />
      </div>

      <ChartContainer config={config} className="aspect-auto h-72 w-full flex-1 xl:h-auto xl:min-h-72">
        <ComposedChart data={data} margin={{ top: 12, right: 48, left: 4, bottom: 0 }} accessibilityLayer>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-school)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--color-school)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={10} padding={{ left: 8, right: 8 }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            domain={domain}
            tickCount={5}
            tickFormatter={(v: number) => fmt.number(v)}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const point = payload[0].payload as Point
              const gap = point.school - point.peerMedian
              return (
                <div className="grid min-w-48 gap-2 rounded-lg border bg-popover px-3 py-2.5 text-sm shadow-lg">
                  <p className="font-semibold">Fall {label}</p>
                  <Row color="bg-chart-1" label={schoolName} value={fmt.number(point.school)} />
                  <Row color="bg-chart-2" label="Peer median" value={fmt.number(Math.round(point.peerMedian))} />
                  <p className="tabular border-t pt-2 text-muted-foreground">
                    {Math.round(gap) === 0 ? "Same as peers" : `${fmt.number(Math.round(Math.abs(gap)))} ${gap > 0 ? "above" : "below"} peers`}
                  </p>
                </div>
              )
            }}
          />
          <Area
            dataKey="school"
            type="monotone"
            stroke="var(--color-school)"
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={{ r: 4, fill: "var(--color-school)", stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
            label={endLabel("school")}
          />
          <Line
            dataKey="peerMedian"
            type="monotone"
            stroke="var(--color-peerMedian)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--color-peerMedian)", stroke: "var(--card)", strokeWidth: 2 }}
            activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 2 }}
            label={endLabel("peerMedian")}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  )
}

function Summary({ color, label, value, since }: { color: string; label: string; value: string; since?: number }) {
  return (
    <div className="space-y-0.5">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={`h-0.75 w-4 rounded-full ${color}`} aria-hidden />
        {label}
      </p>
      <p className="tabular text-xl font-semibold tracking-tight">
        {value} {since && <span className="text-sm font-normal text-muted-foreground">since {since}</span>}
      </p>
    </div>
  )
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className={`size-2.5 rounded-full ${color}`} aria-hidden />
        {label}
      </span>
      <span className="tabular font-semibold">{value}</span>
    </div>
  )
}
