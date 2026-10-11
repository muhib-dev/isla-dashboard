import { METRIC_META } from "@/features/analytics/lib"
import type { MetricKey, SchoolComparison } from "@/features/analytics/schema"
import { formatMetric } from "@/lib/format"
import { DeltaPill } from "./delta-pill"

const KPIS: MetricKey[] = ["enrollment", "tuition", "avgTeacherSalary", "retentionRate"]

export function ComparisonKpis({ comparison }: { comparison: SchoolComparison }) {
  const first = comparison.enrollmentTrend[0]
  const last = comparison.enrollmentTrend.at(-1)
  const growth = first && last && first.school ? (last.school - first.school) / first.school : null

  return (
    <div className="grid gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 sm:grid-cols-2 xl:grid-cols-4">
      {KPIS.map((key) => {
        const meta = METRIC_META[key]
        const value = comparison.school[key]
        const median = comparison.peerMedian[key]
        return (
          <div key={key} className="space-y-3 bg-card p-5">
            <p className="text-sm font-medium text-muted-foreground">{meta.label}</p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="tabular text-3xl font-semibold tracking-tight">{formatMetric(value, meta.format)}</span>
              <DeltaPill value={value} benchmark={median} higherIsBetter={meta.higherIsBetter} />
            </div>
            <p className="text-sm text-muted-foreground">
              Peer median <span className="tabular font-medium text-foreground">{formatMetric(median, meta.format)}</span>
              {key === "enrollment" && growth !== null && (
                <>
                  {" · "}
                  <span className="tabular">
                    {growth >= 0 ? "+" : "−"}
                    {Math.abs(growth * 100).toFixed(0)}% since {first.year}
                  </span>
                </>
              )}
            </p>
          </div>
        )
      })}
    </div>
  )
}
