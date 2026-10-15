import { notFound } from "next/navigation";
import { UsersIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { compareSchool } from "@/features/analytics/queries";
import type { PeerFilter } from "@/features/analytics/schema";
import { getSchool } from "@/features/schools/queries";
import { BenchmarkDetail } from "./benchmark-detail";
import { ChartLegendInline } from "./chart-legend";
import { ComparisonKpis } from "./comparison-kpis";
import { EnrollmentTrendChart } from "./enrollment-trend-chart";
import { growth, signedPct } from "./median-delta";
import { describePeers } from "./peer-summary";
import type { RangeYears } from "./range";
import { TurnoverChart } from "./turnover-chart";

export async function SchoolComparison({
  schoolId,
  peers,
  showHeading = false,
  years = 5,
}: {
  schoolId: string;
  peers: PeerFilter;
  /** School years shown in the trend charts. */
  years?: RangeYears;
  /** Section heading with the school name (ISLA staff view, where the page header is about the network). */
  showHeading?: boolean;
}) {
  const [school, comparison] = await Promise.all([
    getSchool(schoolId),
    compareSchool(schoolId, peers),
  ]);
  if (!school) notFound();

  const trend = comparison.enrollmentTrend.slice(-years);
  const turnoverTrend = comparison.turnoverTrend?.slice(-years);
  const since = trend[0]?.year;

  return (
    <section className="space-y-4" aria-label={`${school.name} compared with peers`}>
      {showHeading && (
        <div className="space-y-0.5">
          <h2 className="text-h3 font-semibold">{school.name}</h2>
          <p className="text-[15px] text-muted-foreground">
            {describePeers(comparison.peerCount, peers)}
          </p>
        </div>
      )}

      {comparison.peerCount === 0 ? (
        <Card className="items-center gap-3 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-lg border bg-surface-2">
            <UsersIcon className="size-7 text-muted-foreground" strokeWidth={1.5} aria-hidden />
          </div>
          <p className="text-h4 font-semibold">No peer schools match</p>
          <p className="text-[15px] text-muted-foreground">
            Try a wider region or size with “Edit peer group”.
          </p>
        </Card>
      ) : (
        <>
          <ComparisonKpis comparison={comparison} />
          <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Enrollment</CardTitle>
                <CardDescription className="tabular">
                  Students each fall
                  {since && trend.length > 1 && (
                    <>
                      {" · "}
                      {signedPct(growth(trend, (d) => d.school))} since {since}
                      , peers {signedPct(growth(trend, (d) => d.peerMedian))}
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ChartLegendInline
                  className="justify-end pb-3"
                  items={[
                    { label: school.name, color: "var(--chart-1)", swatch: "line" },
                    { label: "Peer median", color: "var(--chart-median)", swatch: "dashed" },
                    ...(trend.every((d) => d.peerP25 !== undefined)
                      ? [{ label: "Middle 50%", color: "var(--chart-median)", swatch: "band" as const }]
                      : []),
                  ]}
                />
                <EnrollmentTrendChart data={trend} schoolName={school.name} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Staff turnover</CardTitle>
                <CardDescription>
                  % of teaching staff leaving each year · lower is better
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <ChartLegendInline
                  className="justify-end pb-3"
                  items={[
                    { label: school.name, color: "var(--chart-1)" },
                    { label: "Peer median", color: "var(--chart-8)" },
                    ...(turnoverTrend && turnoverTrend.length > 1
                      ? []
                      : [{ label: "Middle 50%", color: "var(--chart-median)", swatch: "band" as const }]),
                  ]}
                />
                <TurnoverChart
                  retention={comparison.school.retentionRate}
                  peerRetention={comparison.distribution.retentionRate}
                  trend={turnoverTrend}
                  schoolName={school.name}
                />
              </CardContent>
            </Card>
          </div>
          <BenchmarkDetail comparison={comparison} schoolName={school.name} />
        </>
      )}
    </section>
  );
}
