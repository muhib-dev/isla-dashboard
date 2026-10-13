"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { RegionStats } from "@/features/analytics/schema";
import { REGION_LABELS } from "@/features/schools/schema";

const config = {
  active: { label: "Active", color: "var(--member-active)" },
  grace: { label: "Grace period", color: "var(--member-grace)" },
  lapsed: { label: "Lapsed", color: "var(--member-lapsed)" },
  non_member: { label: "Not a member", color: "var(--member-none)" },
} satisfies ChartConfig;

const KEYS = ["active", "grace", "lapsed", "non_member"] as const;

export function MembershipByRegion({ data }: { data: RegionStats[] }) {
  const rows = data.map((r) => ({
    region: REGION_LABELS[r.region],
    ...r.membership,
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-80 w-full">
      <BarChart
        data={rows}
        layout="vertical"
        stackOffset="expand"
        margin={{ top: 4, right: 8, left: 4, bottom: 0 }}
        barCategoryGap="28%"
        accessibilityLayer
      >
        <XAxis type="number" hide domain={[0, 1]} />
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
          content={<ChartTooltipContent indicator="dot" />}
        />
        <ChartLegend
          content={
            <ChartLegendContent className="flex-wrap gap-x-4 gap-y-1 text-sm" />
          }
        />
        {KEYS.map((key) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="m"
            fill={`var(--color-${key})`}
            fillOpacity={0.35}
            stroke={`var(--color-${key})`}
            strokeWidth={1.5}
            maxBarSize={26}
            radius={4}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
