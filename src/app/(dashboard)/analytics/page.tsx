import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/shared/skeletons";
import { PeerFilterControls } from "@/features/analytics/components/peer-filter";
import { RegionOverview } from "@/features/analytics/components/region-overview";
import { SchoolComparison } from "@/features/analytics/components/school-comparison";
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

  if (session.role === "school") {
    return (
      <>
        <PageHeader
          title="Analytics"
          description="See how your school compares with similar schools. Pick a region and size to change the comparison."
        />
        <SchoolComparison schoolId={schoolId!} peers={peerFilter} />
      </>
    );
  }

  const schools = await listSchools({});
  const options = schools.map((s) => ({ id: s.id, name: s.name }));

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Compare regions across the network, or pick a school to compare it with its peers."
      />
      {school ? (
        <SchoolComparison
          schoolId={school.id}
          peers={peerFilter}
          schoolOptions={options}
        />
      ) : (
        <PeerFilterControls
          value={{ region: "all", size: "any" }}
          schools={options}
        />
      )}
      <RegionOverview />
    </>
  );
}
