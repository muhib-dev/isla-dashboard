import { connection } from "next/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowUpRightIcon } from "lucide-react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { KpiGrid, KpiTile } from "@/components/shared/kpi-tile";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { externalLinks } from "@/config/links";
import { JobsTable } from "@/features/jobs/components/jobs-table";
import { PostJobDialog } from "@/features/jobs/components/post-job-dialog";
import { featuredCreditsLeft, median } from "@/features/jobs/lib";
import { getNetworkJobs, getSchoolJobs } from "@/features/jobs/queries";
import {
  FEATURED_CREDITS_PER_YEAR,
  jobDisplayStatus,
  jobExpiry,
  type Job,
} from "@/features/jobs/schema";
import { getSchool } from "@/features/schools/queries";
import { fmt } from "@/lib/format";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Jobs" };

export default function JobsPage() {
  return (
    <PageBody>
      <Suspense fallback={<TableSkeleton />}>
        <Jobs />
      </Suspense>
    </PageBody>
  );
}

function PortalLink() {
  return (
    <Button asChild variant="outline">
      <a href={externalLinks.jobPortal} target="_blank" rel="noreferrer">
        ISLA Job Portal <ArrowUpRightIcon />
      </a>
    </Button>
  );
}

/** Request time for post expiry. `connection()` opts out of prerendering, which Cache Components requires before reading the clock. */
async function requestTime() {
  await connection();
  return Date.now();
}

function jobStats(jobs: Job[], today: number) {
  const live = jobs.filter((j) => jobDisplayStatus(j, today) === "live");
  // Posts that were on the board at some point in the last 30 days.
  const recent = jobs.filter(
    (j) => j.status !== "draft" && jobExpiry(j.postedOn, today).daysLeft > -30,
  );
  return {
    live,
    applicants30: recent.reduce((n, j) => n + j.applicants, 0),
    medianApplicants: median(live.map((j) => j.applicants)),
  };
}

function Median({ value }: { value: number }) {
  return (
    <span className="text-[15px] font-normal tracking-normal text-muted-foreground">
      {" "}
      median {fmt.number(Math.round(value))}
    </span>
  );
}

async function Jobs() {
  const session = await getSession();

  if (session.role === "isla") {
    const jobs = await getNetworkJobs();
    const today = await requestTime();
    const { live, applicants30 } = jobStats(jobs, today);
    return (
      <>
        <PageHeader
          title="Jobs"
          description="Open positions posted by schools across the network."
          actions={<PortalLink />}
        />
        <KpiGrid>
          <KpiTile label="Live posts" value={fmt.number(live.length)} />
          <KpiTile
            label="Applicants (30 days)"
            value={fmt.number(applicants30)}
          />
          <KpiTile
            label="Schools hiring"
            value={fmt.number(new Set(live.map((j) => j.schoolId)).size)}
          />
          <KpiTile
            label="Featured posts"
            value={fmt.number(live.filter((j) => j.featured).length)}
          />
        </KpiGrid>
        <JobsTable jobs={jobs} today={today} showSchool />
      </>
    );
  }

  const schoolId = session.schoolId!;
  const [school, jobs, network] = await Promise.all([
    getSchool(schoolId),
    getSchoolJobs(schoolId),
    getNetworkJobs(),
  ]);
  const today = await requestTime();
  const { live, applicants30, medianApplicants } = jobStats(jobs, today);
  const networkMedian = jobStats(network, today).medianApplicants;
  const creditsLeft = featuredCreditsLeft(jobs, new Date(today).getUTCFullYear());

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Vacancies posted to the ISLA careers board. Posts stay live for 60 days."
        actions={
          <PostJobDialog
            schoolId={schoolId}
            schoolName={school?.name ?? "your school"}
            featuredCreditsLeft={creditsLeft}
          />
        }
      />
      <KpiGrid>
        <KpiTile label="Live posts" value={fmt.number(live.length)} />
        <KpiTile label="Applicants (30 days)" value={fmt.number(applicants30)} />
        <KpiTile
          label="Applicants per post"
          value={
            live.length ? (
              <>
                {fmt.number(Math.round(medianApplicants))}
                <Median value={networkMedian} />
              </>
            ) : (
              "—"
            )
          }
        />
        <KpiTile
          label="Featured credits"
          value={`${creditsLeft} of ${FEATURED_CREDITS_PER_YEAR} left`}
        />
      </KpiGrid>
      <JobsTable jobs={jobs} today={today} />
    </>
  );
}
