import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/shared/skeletons";
import {
  ExportBenchmarks,
  RangeControl,
} from "@/features/analytics/components/analytics-actions";
import { PeerFilterControls } from "@/features/analytics/components/peer-filter";
import { parseRange } from "@/features/analytics/components/range";
import { RegionOverview } from "@/features/analytics/components/region-overview";
import { describePeers } from "@/features/analytics/components/peer-summary";
import { SchoolComparison } from "@/features/analytics/components/school-comparison";
import { compareSchool } from "@/features/analytics/queries";
import { PeerFilterSchema } from "@/features/analytics/schema";
import { getSchool, listSchools } from "@/features/schools/queries";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage({
  searchParams,
}: PageProps<"/analytics">) {
  return (
    <PageBody>
      <Suspense fallback={<PageSkeleton />}>
        <Analytics searchParams={searchParams} />
      </Suspense>
    </PageBody>
  );
}

async function Analytics({
  searchParams,
}: Pick<PageProps<"/analytics">, "searchParams">) {
  const [session, params] = await Promise.all([getSession(), searchParams]);
  const schoolId =
    session.role === "school"
      ? session.schoolId!
      : typeof params.school === "string"
        ? params.school
        : null;
  const school = schoolId ? await getSchool(schoolId) : null;

  const peers = PeerFilterSchema.safeParse({
    region: params.region ?? school?.region ?? "all",
    size: params.size ?? "any",
  });
  const peerFilter = peers.success
    ? peers.data
    : { region: "all" as const, size: "any" as const };
  const years = parseRange(params.years);

  if (session.role === "school") {
    const comparison = await compareSchool(schoolId!, peerFilter);
    return (
      <>
        <PageHeader
          title="Analytics"
          description={describePeers(comparison.peerCount, peerFilter)}
          actions={
            <>
              <RangeControl value={years} />
              <PeerFilterControls value={{ ...peerFilter, school: schoolId! }} />
              {school && comparison.peerCount > 0 && (
                <ExportBenchmarks comparison={comparison} schoolName={school.name} />
              )}
            </>
          }
        />
        <SchoolComparison schoolId={schoolId!} peers={peerFilter} years={years} />
      </>
    );
  }

  const [schools, comparison] = await Promise.all([
    listSchools({}),
    school ? compareSchool(school.id, peerFilter) : null,
  ]);
  const options = schools.map((s) => ({ id: s.id, name: s.name }));

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Compare regions across the network, or pick a school to compare it with its peers."
        actions={
          <>
            {school && <RangeControl value={years} />}
            <PeerFilterControls
              value={
                school
                  ? { ...peerFilter, school: school.id }
                  : { region: "all", size: "any" }
              }
              schools={options}
            />
            {school && comparison && comparison.peerCount > 0 && (
              <ExportBenchmarks comparison={comparison} schoolName={school.name} />
            )}
          </>
        }
      />
      {school && (
        <SchoolComparison
          schoolId={school.id}
          peers={peerFilter}
          years={years}
          showHeading
        />
      )}
      <RegionOverview />
    </>
  );
}
