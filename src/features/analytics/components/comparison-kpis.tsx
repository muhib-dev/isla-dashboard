import { KpiGrid, KpiTile, MedianBar } from "@/components/shared/kpi-tile";
import { METRIC_META } from "@/features/analytics/lib";
import type {
  Distribution,
  MetricKey,
  SchoolComparison,
} from "@/features/analytics/schema";
import { formatMetric } from "@/lib/format";
import { cn } from "@/lib/utils";
import { growth, medianDelta, signedPct } from "./median-delta";

type Kpi = {
  key: string;
  label: string;
  format: Parameters<typeof formatMetric>[1];
  higherIsBetter: boolean | null;
  value: number;
  median: number;
  dist: Distribution;
  note?: string;
};

const fromMetric = (
  c: SchoolComparison,
  key: MetricKey,
  label = METRIC_META[key].label,
): Kpi => ({
  key,
  label,
  format: METRIC_META[key].format,
  higherIsBetter: METRIC_META[key].higherIsBetter,
  value: c.school[key],
  median: c.peerMedian[key],
  dist: c.distribution[key],
});

/** Turnover is 1 − retention, so the peer spread flips end for end. */
function turnover(c: SchoolComparison): Kpi {
  const r = c.distribution.retentionRate;
  return {
    key: "turnover",
    label: "Staff turnover",
    format: "percent",
    higherIsBetter: false,
    value: 1 - c.school.retentionRate,
    median: 1 - c.peerMedian.retentionRate,
    dist: {
      min: 1 - r.max,
      p25: 1 - r.p75,
      median: 1 - r.median,
      p75: 1 - r.p25,
      max: 1 - r.min,
    },
    note: "Share of teachers who left this school year.",
  };
}

/** Enrollment · Applications per vacancy · Staff turnover · Student : teacher (design order). */
export function comparisonKpis(c: SchoolComparison): Kpi[] {
  const apps = c.applicationsPerVacancy;
  return [
    fromMetric(c, "enrollment"),
    apps
      ? {
          key: "applicationsPerVacancy",
          label: "Applications per vacancy",
          format: "decimal",
          higherIsBetter: true,
          value: apps.school,
          median: apps.peerMedian,
          dist: apps.distribution,
          note: "Applicants per job posted on the ISLA Job Portal.",
        }
      : fromMetric(c, "tuition"),
    turnover(c),
    fromMetric(c, "studentTeacherRatio", "Student : teacher"),
  ];
}

export function ComparisonKpis({
  comparison,
}: {
  comparison: SchoolComparison;
}) {
  const trend = comparison.enrollmentTrend;
  const enrollmentGrowth = trend.length > 1 ? growth(trend, (d) => d.school) : null;

  return (
    <KpiGrid>
      {comparisonKpis(comparison).map((kpi) => {
        const fmt = (n: number) => formatMetric(n, kpi.format);
        const { value, median, dist } = kpi;
        const d = medianDelta(value, median, kpi.higherIsBetter);

        return (
          <KpiTile
            key={kpi.key}
            label={kpi.label}
            info={
              <span className="tabular">
                {kpi.note && <>{kpi.note} </>}
                Peers range from {fmt(dist.min)} to {fmt(dist.max)}; the
                middle half sits between {fmt(dist.p25)} and {fmt(dist.p75)}.
                {kpi.higherIsBetter === true && " Higher is better."}
                {kpi.higherIsBetter === false && " Lower is better."}
                {kpi.key === "enrollment" && enrollmentGrowth !== null && (
                  <> Enrollment is {signedPct(enrollmentGrowth)} since {trend[0].year}.</>
                )}
              </span>
            }
            value={fmt(value)}
            delta={d.delta}
            footer={
              <>
                <span className="tabular truncate">Peer median {fmt(median)}</span>
                <span
                  className={cn(
                    "tabular shrink-0 font-medium",
                    d.tone === "good"
                      ? "text-success"
                      : d.tone === "bad"
                        ? "text-destructive"
                        : "text-foreground",
                  )}
                >
                  {d.short}
                  {d.tone !== "neutral" && (
                    <span className="sr-only">
                      , {d.tone === "good" ? "better" : "worse"} than peers
                    </span>
                  )}
                </span>
              </>
            }
          >
            <MedianBar
              value={value}
              median={median}
              max={Math.max(value, dist.max) * 1.05}
            />
          </KpiTile>
        );
      })}
    </KpiGrid>
  );
}
