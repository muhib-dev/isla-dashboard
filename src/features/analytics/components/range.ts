export const RANGE_OPTIONS = [2, 3, 5] as const;
export type RangeYears = (typeof RANGE_OPTIONS)[number];

/** Reads `?years=` (2 | 3 | 5), defaulting to 5. */
export function parseRange(value: unknown): RangeYears {
  const n = Number(value);
  return (RANGE_OPTIONS as readonly number[]).includes(n) ? (n as RangeYears) : 5;
}
