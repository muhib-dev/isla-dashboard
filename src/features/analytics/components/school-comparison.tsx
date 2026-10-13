import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { compareSchool } from "@/features/analytics/queries";
import type { PeerFilter } from "@/features/analytics/schema";
import { SIZE_BAND_LABELS } from "@/features/analytics/schema";
import { getSchool } from "@/features/schools/queries";
import { REGION_LABELS } from "@/features/schools/schema";
import { BenchmarkRanges } from "./benchmark-ranges";
import { ComparisonKpis } from "./comparison-kpis";
import { EnrollmentTrendChart } from "./enrollment-trend-chart";
import { PeerFilterControls } from "./peer-filter";

export async function SchoolComparison({
  schoolId,
  peers,
  schoolOptions,
}: {
  schoolId: string;
  peers: PeerFilter;
  schoolOptions?: { id: string; name: string }[];
}) {
  const [school, comparison] = await Promise.all([
    getSchool(schoolId),
    compareSchool(schoolId, peers),
  ]);
  if (!school) notFound();

  const peerLabel = [
    peers.region === "all"
      ? "all regions"
      : `the ${REGION_LABELS[peers.region]}`,
    peers.size !== "any" && SIZE_BAND_LABELS[peers.size].toLowerCase(),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeerFilterControls
          value={{ ...peers, school: schoolId }}
          schools={schoolOptions}
        />
        {comparison.peerCount > 0 && (
          <p className="text-sm text-muted-foreground">
            Peer group:{" "}
            <span className="font-medium text-foreground">
              {comparison.peerCount} schools
            </span>{" "}
            in {peerLabel}
          </p>
        )}
      </div>

      {comparison.peerCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No peer schools match. Try a wider region or size.
          </CardContent>
        </Card>
      ) : (
        <>
          <ComparisonKpis comparison={comparison} />
          <div className="grid gap-5 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader className="border-b">
                <CardTitle>Where {school.name} stands</CardTitle>
                <CardDescription>
                  Each row is on its own scale and shows how the school sits
                  within its peer group.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <BenchmarkRanges
                  comparison={comparison}
                  schoolName={school.name}
                />
              </CardContent>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader className="border-b">
                <CardTitle>Enrollment trend</CardTitle>
                <CardDescription>
                  Students enrolled each fall compared with the peer median.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pt-2">
                <EnrollmentTrendChart
                  data={comparison.enrollmentTrend}
                  schoolName={school.name}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
