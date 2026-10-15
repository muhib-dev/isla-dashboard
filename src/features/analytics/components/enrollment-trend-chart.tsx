"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";
import { fmt } from "@/lib/format";
import { medianDelta } from "./median-delta";

type Point = {
  year: number;
  school: number;
  peerMedian: number;
  peerP25?: number;
  peerP75?: number;
};

const AXIS_TICK = { fill: "var(--chart-axis)", fontSize: 12 };

/** School enrollment (solid navy + 7% area) against the peer median (neutral, dashed). */
export function EnrollmentTrendChart({
  data,
  schoolName,
}: {
  data: Point[];
  schoolName: string;
}) {
  const config = {
    school: { label: schoolName, color: "var(--chart-1)" },
    peerMedian: { label: "Peer median", color: "var(--chart-median)" },
  } satisfies ChartConfig;

  const hasBand = data.every((d) => d.peerP25 !== undefined && d.peerP75 !== undefined);
  const rows = data.map((d) => ({
    ...d,
    band: hasBand ? ([d.peerP25!, d.peerP75!] as [number, number]) : undefined,
  }));
  const values = data.flatMap((d) => [
    d.school,
    d.peerMedian,
    ...(hasBand ? [d.peerP25!, d.peerP75!] : []),
  ]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = Math.max(10, Math.ceil((max - min) / 4 / 10) * 10);
  const domain = [
    Math.max(0, Math.floor((min - step) / step) * step),
    Math.ceil((max + step / 2) / step) * step,
  ];

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-72 w-full flex-1 xl:h-auto xl:min-h-72"
    >
      <ComposedChart
        data={rows}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        accessibilityLayer
      >
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
        <XAxis
          dataKey="year"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tick={AXIS_TICK}
          padding={{ left: 8, right: 8 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={48}
          domain={domain}
          tickCount={5}
          tick={AXIS_TICK}
          tickFormatter={(v: number) => fmt.number(v)}
        />
        {hasBand && (
          <Area
            dataKey="band"
            type="linear"
            stroke="none"
            fill="var(--chart-median)"
            fillOpacity={0.12}
            isAnimationActive={false}
            activeDot={false}
          />
        )}
        <ChartTooltip
          // Open on the latest year so the comparison reads without hovering.
          defaultIndex={data.length - 1}
          cursor={{ stroke: "var(--chart-grid-strong)", strokeWidth: 1 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as Point;
            const vs = medianDelta(point.school, point.peerMedian, null);
            return (
              <div className="grid min-w-48 gap-2 rounded-lg border bg-popover px-3 py-2.5 text-[13px] text-popover-foreground shadow-md">
                <p className="font-medium text-muted-foreground">Fall {label}</p>
                <Row
                  swatch="bg-chart-1"
                  label={schoolName}
                  value={fmt.number(point.school)}
                />
                <Row
                  swatch="bg-chart-median"
                  label="Peer median"
                  value={fmt.number(Math.round(point.peerMedian))}
                />
                {point.peerP25 !== undefined && point.peerP75 !== undefined && (
                  <p className="tabular text-muted-foreground">
                    Middle 50%: {fmt.number(Math.round(point.peerP25))}–
                    {fmt.number(Math.round(point.peerP75))}
                  </p>
                )}
                <p className={`tabular border-t pt-2 font-medium ${vs.diff > 0 ? "text-success" : ""}`}>
                  {vs.words}
                </p>
              </div>
            );
          }}
        />
        <Area
          dataKey="school"
          type="linear"
          stroke="var(--color-school)"
          strokeWidth={2.25}
          fill="var(--color-school)"
          fillOpacity={0.07}
          dot={false}
          activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
        />
        <Line
          dataKey="peerMedian"
          type="linear"
          stroke="var(--color-peerMedian)"
          strokeWidth={1.75}
          strokeDasharray="5 4"
          // Recharts' draw-in animation overwrites the dash pattern and leaves gaps.
          isAnimationActive={false}
          dot={false}
          activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
        />
      </ComposedChart>
    </ChartContainer>
  );
}

function Row({
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
