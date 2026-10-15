import type { DeltaTone, KpiDelta } from "@/components/shared/kpi-tile";

/**
 * Relative difference vs. a benchmark, with tone by meaning:
 * `higherIsBetter` true/false → good when favorable, bad otherwise; null → neutral.
 */
export function medianDelta(
  value: number,
  benchmark: number,
  higherIsBetter: boolean | null,
  noun = "median",
) {
  const diff = benchmark ? (value - benchmark) / benchmark : 0;
  const flat = Math.abs(diff) < 0.005;
  const tone: DeltaTone =
    flat || higherIsBetter === null
      ? "neutral"
      : (higherIsBetter ? diff > 0 : diff < 0)
        ? "good"
        : "bad";
  const pct = `${Math.abs(diff * 100).toFixed(0)}%`;
  const side = diff > 0 ? "above" : "below";

  const delta: KpiDelta = {
    label: flat ? "At median" : pct,
    direction: flat ? "flat" : diff > 0 ? "up" : "down",
    tone,
    srLabel: flat ? undefined : `${side} the peer ${noun}`,
  };

  return {
    diff,
    flat,
    tone,
    delta,
    /** "12% above" */
    short: flat ? `At ${noun}` : `${pct} ${side}`,
    /** "12% above median" */
    words: flat ? `At the ${noun}` : `${pct} ${side} ${noun}`,
  };
}

/** Growth from the first to the last point of a series, e.g. 0.12 for +12%. */
export function growth<T>(data: T[], pick: (d: T) => number) {
  const first = data[0];
  const last = data.at(-1);
  return first && last && pick(first) ? (pick(last) - pick(first)) / pick(first) : 0;
}

export const signedPct = (n: number) =>
  `${n >= 0 ? "+" : "−"}${Math.abs(n * 100).toFixed(0)}%`;

export function ordinal(n: number) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}
