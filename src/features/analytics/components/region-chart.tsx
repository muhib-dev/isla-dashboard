"use client"

import { useState } from "react"
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { NetworkOverview, RegionStats } from "@/features/analytics/schema"
import { REGION_LABELS } from "@/features/schools/schema"
import { fmt, formatMetric } from "@/lib/format"

const METRICS = {
  medianTuition: { label: "Tuition", title: "Median tuition", format: "currency", network: "tuition" },
  medianTeacherSalary: { label: "Teacher salary", title: "Median teacher salary", format: "currency", network: "teacherSalary" },
  medianEnrollment: { label: "Enrollment", title: "Median enrollment", format: "number", network: "enrollment" },
  medianRetention: { label: "Retention", title: "Median teacher retention", format: "percent", network: "retention" },
  lunchProgramShare: { label: "Lunch program", title: "Schools with a lunch program", format: "percent", network: "lunchProgramShare" },
} as const

type MetricKey = keyof typeof METRICS

/** Round steps (1, 2, 2.5, 5 × 10ⁿ) with at most `count` intervals, so the axis ends just past the data. */
function niceTicks(max: number, count = 5) {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => Math.ceil(max / s) <= count) ?? raw
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step)
}

const axisLabel = (v: number, format: "currency" | "number" | "percent") =>
  format === "currency" ? `$${v >= 1000 ? `${v / 1000}k` : v}` : formatMetric(v, format)

export function RegionChart({ data, network }: { data: RegionStats[]; network: NetworkOverview["medians"] }) {
  const [metric, setMetric] = useState<MetricKey>("medianTuition")
  const { title, format, network: networkKey } = METRICS[metric]
  const networkValue = network[networkKey]

  const rows = data
    .map((r) => ({ region: REGION_LABELS[r.region], value: r[metric], schools: r.schools, students: r.students }))
    .sort((a, b) => b.value - a.value)
  const ticks = niceTicks(Math.max(...rows.map((r) => r.value), networkValue) * 1.08)
  const config = { value: { label: title, color: "var(--chart-1)" } } satisfies ChartConfig

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
          <div className="-mx-4 overflow-x-auto px-4">
            <TabsList>
              {Object.entries(METRICS).map(([key, m]) => (
                <TabsTrigger key={key} value={key}>
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-4 w-0.5 rounded-full bg-foreground/50" aria-hidden />
          Network median <span className="tabular font-semibold text-foreground">{formatMetric(networkValue, format)}</span>
        </p>
      </div>

      <ChartContainer config={config} className="aspect-auto h-80 w-full">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 72, left: 4, bottom: 0 }} barCategoryGap="28%" accessibilityLayer>
          <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            ticks={ticks}
            domain={[0, ticks.at(-1)!]}
            tickFormatter={(v: number) => axisLabel(v, format)}
          />
          <YAxis
            type="category"
            dataKey="region"
            tickLine={false}
            axisLine={false}
            width={96}
            tick={{ fill: "var(--foreground)", fontSize: 14, fontWeight: 500 }}
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.7 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload as (typeof rows)[number]
              const diff = networkValue ? (row.value - networkValue) / networkValue : 0
              return (
                <div className="grid min-w-52 gap-1.5 rounded-lg border bg-popover px-3 py-2.5 text-sm shadow-lg">
                  <p className="font-semibold">{row.region}</p>
                  <div className="flex justify-between gap-6">
                    <span className="text-muted-foreground">{title}</span>
                    <span className="tabular font-semibold">{formatMetric(row.value, format)}</span>
                  </div>
                  <div className="flex justify-between gap-6">
                    <span className="text-muted-foreground">vs network</span>
                    <span className="tabular">
                      {Math.abs(diff) < 0.005 ? "At median" : `${diff > 0 ? "+" : "−"}${Math.abs(diff * 100).toFixed(0)}%`}
                    </span>
                  </div>
                  <p className="tabular border-t pt-1.5 text-muted-foreground">
                    {row.schools} schools · {fmt.number(row.students)} students
                  </p>
                </div>
              )
            }}
          />
          <ReferenceLine x={networkValue} stroke="var(--foreground)" strokeOpacity={0.5} strokeWidth={2} ifOverflow="extendDomain" />
          <Bar dataKey="value" fill="var(--color-value)" fillOpacity={0.35} stroke="var(--color-value)" strokeWidth={1.5} radius={[0, 4, 4, 0]} maxBarSize={26}>
            <LabelList
              dataKey="value"
              position="right"
              offset={10}
              className="tabular fill-foreground text-sm font-semibold"
              formatter={(v) => formatMetric(Number(v), format)}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
