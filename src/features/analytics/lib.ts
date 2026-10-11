import type { School } from "@/features/schools/schema"
import type { MetricKey, SizeBand } from "./schema"

/** Linear-interpolated quantile (q in 0–1). */
export function quantile(values: number[], q: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

export function median(values: number[]): number {
  return quantile(values, 0.5)
}

export function distribution(values: number[]) {
  return {
    min: values.length ? Math.min(...values) : 0,
    p25: quantile(values, 0.25),
    median: quantile(values, 0.5),
    p75: quantile(values, 0.75),
    max: values.length ? Math.max(...values) : 0,
  }
}

export function metricValues(school: School): Record<MetricKey, number> {
  const m = school.metrics
  return {
    enrollment: m.enrollment,
    studentTeacherRatio: m.teachers ? Math.round((m.enrollment / m.teachers) * 10) / 10 : 0,
    tuition: m.tuition,
    avgTeacherSalary: m.avgTeacherSalary,
    retentionRate: m.retentionRate,
  }
}

export function inSizeBand(enrollment: number, band: SizeBand) {
  if (band === "small") return enrollment < 200
  if (band === "medium") return enrollment >= 200 && enrollment < 500
  if (band === "large") return enrollment >= 500
  return true
}

export const METRIC_META: Record<
  MetricKey,
  { label: string; format: "number" | "currency" | "percent" | "ratio"; higherIsBetter: boolean | null }
> = {
  enrollment: { label: "Enrollment", format: "number", higherIsBetter: null },
  studentTeacherRatio: { label: "Students per teacher", format: "ratio", higherIsBetter: false },
  tuition: { label: "Annual tuition", format: "currency", higherIsBetter: null },
  avgTeacherSalary: { label: "Avg. teacher salary", format: "currency", higherIsBetter: true },
  retentionRate: { label: "Teacher retention", format: "percent", higherIsBetter: true },
}
