import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Relative difference vs. a benchmark. `higherIsBetter` decides the color:
 * true/false → green when favorable, neutral otherwise; null → always neutral.
 */
export function DeltaPill({
  value,
  benchmark,
  higherIsBetter,
  className,
}: {
  value: number;
  benchmark: number;
  higherIsBetter: boolean | null;
  className?: string;
}) {
  const diff = benchmark ? (value - benchmark) / benchmark : 0;
  const flat = Math.abs(diff) < 0.005;
  const favorable =
    !flat && higherIsBetter !== null && (higherIsBetter ? diff > 0 : diff < 0);
  const Icon = flat
    ? MinusIcon
    : diff > 0
      ? ArrowUpRightIcon
      : ArrowDownRightIcon;

  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-sm font-semibold",
        favorable
          ? "bg-success/12 text-success"
          : "bg-muted text-foreground/80",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {flat ? "At median" : `${Math.abs(diff * 100).toFixed(0)}%`}
      <span className="sr-only">
        {flat ? "" : diff > 0 ? "above" : "below"} the peer median
      </span>
    </span>
  );
}
