import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { METRIC_META } from "@/features/analytics/lib";
import type {
  Distribution,
  MetricKey,
  SchoolComparison,
} from "@/features/analytics/schema";
import { formatMetric } from "@/lib/format";
import { cn } from "@/lib/utils";

const ROWS: MetricKey[] = [
  "studentTeacherRatio",
  "tuition",
  "avgTeacherSalary",
  "retentionRate",
  "enrollment",
];

/**
 * Benchmark strip per metric, each on its own scale:
 * full peer range (light band), middle 50% (darker band), peer median (tick),
 * and this school (marker). Shows *where* a school sits, not just above/below.
 */
export function BenchmarkRanges({
  comparison,
  schoolName,
}: {
  comparison: SchoolComparison;
  schoolName: string;
}) {
  return (
    <div className="space-y-6">
      <Legend schoolName={schoolName} />
      <ul className="space-y-7">
        {ROWS.map((key) => (
          <BenchmarkRow
            key={key}
            metric={key}
            value={comparison.school[key]}
            dist={comparison.distribution[key]}
            percentile={comparison.percentile[key]}
            peerCount={comparison.peerCount}
            schoolName={schoolName}
          />
        ))}
      </ul>
    </div>
  );
}

function BenchmarkRow({
  metric,
  value,
  dist,
  percentile,
  peerCount,
  schoolName,
}: {
  metric: MetricKey;
  value: number;
  dist: Distribution;
  percentile: number;
  peerCount: number;
  schoolName: string;
}) {
  const meta = METRIC_META[metric];
  const fmt = (n: number) => formatMetric(n, meta.format);

  // Scale padded around the peer range and the school's own value.
  const lo = Math.min(dist.min, value);
  const hi = Math.max(dist.max, value);
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.08;
  const domain = [lo - pad, hi + pad];
  const x = (n: number) =>
    `${((n - domain[0]) / (domain[1] - domain[0])) * 100}%`;
  const span = (a: number, b: number) => ({
    left: x(a),
    width: `calc(${x(b)} - ${x(a)})`,
  });

  const below = Math.round(percentile * peerCount);
  const favorable =
    meta.higherIsBetter === null
      ? null
      : meta.higherIsBetter
        ? percentile >= 0.5
        : percentile < 0.5;

  return (
    <li className="grid gap-x-8 gap-y-3 lg:grid-cols-[13rem_1fr_12rem] lg:items-center">
      <div>
        <p className="font-medium">{meta.label}</p>
        <p className="tabular text-[13px] text-muted-foreground">
          {fmt(value)}{" "}
          <span>
            vs median {fmt(dist.median)}
          </span>
        </p>
      </div>

      <div className="pt-6 pb-5">
        <div className="relative h-3">
          <div className="absolute inset-0 rounded-full bg-surface-2" />
          <div
            className="absolute inset-y-0 rounded-full bg-chart-median/12"
            style={span(dist.min, dist.max)}
          />
          <div
            className="absolute inset-y-0 rounded-full bg-chart-median/30"
            style={span(dist.p25, dist.p75)}
          />
          <div
            className="absolute -inset-y-1 w-0.75 -translate-x-1/2 rounded-full bg-chart-median"
            style={{ left: x(dist.median) }}
            aria-hidden
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-1 ring-2 ring-card outline-none focus-visible:ring-4 focus-visible:ring-ring/50"
                style={{ left: x(value) }}
                aria-label={`${schoolName}: ${fmt(value)}`}
              />
            </TooltipTrigger>
            <TooltipContent className="tabular">
              {schoolName}: {fmt(value)}
            </TooltipContent>
          </Tooltip>
          <span
            className="tabular absolute -top-6 -translate-x-1/2 text-[13px] font-semibold whitespace-nowrap text-chart-1"
            style={{ left: x(value) }}
          >
            {fmt(value)}
          </span>
        </div>
        <div className="tabular relative mt-2 h-4 text-xs text-chart-axis">
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: x(dist.min) }}
          >
            {fmt(dist.min)}
          </span>
          <span
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: x(dist.max) }}
          >
            {fmt(dist.max)}
          </span>
        </div>
      </div>

      <p className="text-[13px] lg:text-right">
        <span
          className={cn(
            "font-medium",
            favorable === true && "text-success",
            favorable === false && "text-foreground",
          )}
        >
          Higher than {below} of {peerCount}
        </span>
        <span className="block text-muted-foreground">peer schools</span>
      </p>
    </li>
  );
}

function Legend({ schoolName }: { schoolName: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption font-medium text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <span
          className="size-2.5 rounded-full bg-chart-1"
          aria-hidden
        />
        {schoolName}
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-3 w-0.5 rounded-full bg-chart-median" aria-hidden />
        Peer median
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-5 rounded-full bg-chart-median/30"
          aria-hidden
        />
        Middle 50% of peers
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          className="h-2.5 w-5 rounded-full bg-chart-median/12"
          aria-hidden
        />
        Full peer range
      </span>
    </div>
  );
}
