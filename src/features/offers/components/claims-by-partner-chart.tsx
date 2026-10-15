"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

type Row = { partner: string; claimed: number; redeemed: number };

const config = {
  total: { label: "Claims", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** One series (total claims) per partner; the redeemed split lives in the tooltip. */
export function ClaimsByPartnerChart({ data }: { data: Row[] }) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No claims yet.
      </p>
    );
  }

  const rows = data.map((r) => ({ ...r, total: r.claimed + r.redeemed }));

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height: Math.max(160, rows.length * 44) }}
    >
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 0, right: 40, left: 4, bottom: 0 }}
        barCategoryGap="28%"
        accessibilityLayer
      >
        <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
        <XAxis type="number" hide allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="partner"
          tickLine={false}
          axisLine={false}
          width={170}
          tick={{ fill: "var(--foreground)", fontSize: 13 }}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.7 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as (typeof rows)[number];
            return (
              <div className="grid min-w-44 gap-1.5 rounded-lg border bg-popover px-3 py-2.5 text-sm shadow-lg">
                <p className="font-semibold">{row.partner}</p>
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Claims</span>
                  <span className="tabular font-semibold">{row.total}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">Redeemed</span>
                  <span className="tabular">{row.redeemed}</span>
                </div>
              </div>
            );
          }}
        />
        <Bar
          dataKey="total"
          fill="var(--color-total)"
          fillOpacity={0.35}
          stroke="var(--color-total)"
          strokeWidth={1.5}
          radius={[0, 4, 4, 0]}
          maxBarSize={24}
        >
          <LabelList
            dataKey="total"
            position="right"
            offset={10}
            className="tabular fill-foreground text-sm font-semibold"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
