"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Distribution } from "@/features/analytics/schema";
import { fmt } from "@/lib/format";
import { medianDelta } from "./median-delta";

const AXIS_TICK = { fill: "var(--chart-axis)", fontSize: 12 };

type Row = { label: string; school: number; median: number };

/**
 * Teacher turnover (1 − retention) for the school vs. the peer median, grouped bars —
 * one group per year when `trend` is given, else this year only with the middle-50%
 * peer band behind the bars. Lower is better.
 */
export function TurnoverChart({
  retention,
  peerRetention,
  trend,
  schoolName,
}: {
  retention: number;
  peerRetention: Distribution;
  trend?: { year: number; school: number; peerMedian: number }[];
  schoolName: string;
}) {
  const config = {
    school: { label: schoolName, color: "var(--chart-1)" },
    median: { label: "Peer median", color: "var(--chart-8)" },
  } satisfies ChartConfig;

  const byYear = trend && trend.length > 1;
  const rows: Row[] = byYear
    ? trend.map((t) => ({ label: String(t.year), school: t.school, median: t.peerMedian }))
    : [{ label: "This year", school: 1 - retention, median: 1 - peerRetention.median }];
  // Retention's 75th percentile is turnover's 25th, and vice versa.
  const band = [1 - peerRetention.p75, 1 - peerRetention.p25] as const;
  const top = Math.max(...rows.flatMap((r) => [r.school, r.median]), byYear ? 0 : band[1]);
  const ceiling = Math.max(0.05, Math.ceil((top * 1.15) / 0.05) * 0.05);

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-72 w-full flex-1 xl:h-auto xl:min-h-72"
    >
      <BarChart
        data={rows}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        barGap={2}
        barCategoryGap={byYear ? "30%" : "22%"}
        accessibilityLayer
      >
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tick={AXIS_TICK}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          domain={[0, ceiling]}
          tickCount={5}
          tick={AXIS_TICK}
          tickFormatter={(v: number) => fmt.percent(v)}
        />
        {!byYear && (
          <ReferenceArea
            y1={band[0]}
            y2={band[1]}
            fill="var(--chart-median)"
            fillOpacity={0.12}
            stroke="none"
            ifOverflow="extendDomain"
          />
        )}
        <ChartTooltip
          cursor={{ fill: "var(--surface-2)", opacity: 0.6 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as Row;
            const vs = medianDelta(row.school, row.median, false);
            return (
              <div className="grid min-w-52 gap-2 rounded-lg border bg-popover px-3 py-2.5 text-[13px] text-popover-foreground shadow-md">
                <p className="font-medium text-muted-foreground">
                  Teachers leaving · {row.label}
                </p>
                <TooltipRow swatch="bg-chart-1" label={schoolName} value={fmt.percent(row.school)} />
                <TooltipRow
                  swatch="bg-chart-8"
                  label="Peer median"
                  value={fmt.percent(row.median)}
                />
                {!byYear && (
                  <p className="tabular text-muted-foreground">
                    Middle 50%: {fmt.percent(band[0])}–{fmt.percent(band[1])}
                  </p>
                )}
                <p className="tabular border-t pt-2 font-medium">
                  {vs.words}
                  {!vs.flat && (
                    <span
                      className={vs.tone === "good" ? "text-success" : "text-destructive"}
                    >
                      {" "}
                      · {vs.tone === "good" ? "better" : "worse"} than peers
                    </span>
                  )}
                </p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="school"
          fill="var(--color-school)"
          radius={[3, 3, 0, 0]}
          maxBarSize={byYear ? 28 : 56}
        />
        <Bar
          dataKey="median"
          fill="var(--color-median)"
          fillOpacity={0.55}
          radius={[3, 3, 0, 0]}
          maxBarSize={byYear ? 28 : 56}
        />
      </BarChart>
    </ChartContainer>
  );
}

function TooltipRow({
  swatch,
  label,
  value,
}: {
  swatch: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className={`size-2 rounded-full ${swatch}`} aria-hidden />
        {label}
      </span>
      <span className="tabular font-semibold">{value}</span>
    </div>
  );
}
