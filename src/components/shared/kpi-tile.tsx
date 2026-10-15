import { ArrowDownIcon, ArrowUpIcon, InfoIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Delta tone follows meaning, not direction: "good" is green even when the number went down. */
export type DeltaTone = "good" | "bad" | "neutral";

export type KpiDelta = {
  label: React.ReactNode;
  direction: "up" | "down" | "flat";
  tone: DeltaTone;
  /** Screen-reader text, e.g. "up 12% on last year". */
  srLabel?: string;
};

const TONE: Record<DeltaTone, string> = {
  good: "text-success",
  bad: "text-destructive",
  neutral: "text-muted-foreground",
};

export function KpiDeltaText({ delta }: { delta: KpiDelta }) {
  const Icon =
    delta.direction === "up"
      ? ArrowUpIcon
      : delta.direction === "down"
        ? ArrowDownIcon
        : null;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 text-[15px] font-medium",
        TONE[delta.tone],
      )}
    >
      {Icon && <Icon className="size-3.5" aria-hidden />}
      {delta.label}
      {delta.srLabel && <span className="sr-only">{delta.srLabel}</span>}
    </span>
  );
}

/** Tiny trend line, navy at 2px over a 8% area. Purely decorative: values live in the tile text. */
export function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  // A flat series sits mid-height rather than on the baseline.
  const y = (v: number) => (span ? 32 - ((v - min) / span) * 28 : 18);
  const line = values
    .map(
      (v, i) =>
        `${i ? "L" : "M"}${((i * 200) / (values.length - 1)).toFixed(1)} ${y(v).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      viewBox="0 0 200 36"
      preserveAspectRatio="none"
      className={cn("block h-9 w-full", className)}
      aria-hidden
    >
      <path d={`${line} L200 36 L0 36 Z`} fill="var(--chart-1)" opacity={0.08} />
      <path
        d={line}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * KPI stat tile: label, big value + delta, optional visual (sparkline / median bar),
 * optional footer. Same footprint as its loading skeleton.
 */
export function KpiTile({
  label,
  info,
  value,
  delta,
  children,
  footer,
  className,
}: {
  label: React.ReactNode;
  info?: React.ReactNode;
  value: React.ReactNode;
  delta?: KpiDelta;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2.5 rounded-lg border bg-card px-5 py-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[15px] font-medium text-muted-foreground">
        <span
          className="min-w-0 truncate"
          title={typeof label === "string" ? label : undefined}
        >
          {label}
        </span>
        {info && (
          <Tooltip>
            <TooltipTrigger
              className="-m-1 rounded-sm p-1 hover:text-foreground"
              aria-label="About this metric"
            >
              <InfoIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{info}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="tabular text-h1 font-semibold tracking-[-0.015em]">
          {value}
        </span>
        {delta && <KpiDeltaText delta={delta} />}
      </div>
      {children}
      {footer && (
        <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2.5 text-caption text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}

/** Your value vs. the peer median on one track (median = neutral tick). */
export function MedianBar({
  value,
  median,
  max,
}: {
  value: number;
  median: number;
  max: number;
}) {
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / (max || 1)) * 100))}%`;
  return (
    <div className="relative h-2 rounded-full bg-muted" aria-hidden>
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-chart-1"
        style={{ width: pct(value) }}
      />
      <div
        className="absolute -top-1 h-4 w-0.5 bg-chart-median"
        style={{ left: pct(median) }}
      />
    </div>
  );
}

export function KpiGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
