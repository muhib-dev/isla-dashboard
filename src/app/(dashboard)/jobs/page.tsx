import type { Metadata } from "next"
import { Suspense } from "react"
import { ArrowUpRightIcon } from "lucide-react"
import { PageBody, PageHeader } from "@/components/layout/page-header"
import { Stat, StatGroup } from "@/components/shared/stat"
import { TableSkeleton } from "@/components/shared/skeletons"
import { Button } from "@/components/ui/button"
import { externalLinks } from "@/config/links"
import { JobsTable } from "@/features/jobs/components/jobs-table"
import { PostJobDialog } from "@/features/jobs/components/post-job-dialog"
import { getOpenJobs, getSchoolJobs } from "@/features/jobs/queries"
import { getSchool } from "@/features/schools/queries"
import { getSession } from "@/server/session"

export const metadata: Metadata = { title: "Jobs" }

export default function JobsPage() {
  return (
    <PageBody>
      <Suspense fallback={<TableSkeleton />}>
        <Jobs />
      </Suspense>
    </PageBody>
  )
}

function PortalLink() {
  return (
    <Button asChild variant="outline">
      <a href={externalLinks.jobPortal} target="_blank" rel="noreferrer">
        ISLA Job Portal <ArrowUpRightIcon />
      </a>
    </Button>
  )
}

async function Jobs() {
  const session = await getSession()

  if (session.role === "isla") {
    const jobs = await getOpenJobs()
    return (
      <>
        <PageHeader title="Jobs" description="Open positions posted by schools across the network." actions={<PortalLink />} />
        <JobsTable jobs={jobs} showSchool />
      </>
    )
  }

  const schoolId = session.schoolId!
  const [school, jobs] = await Promise.all([getSchool(schoolId), getSchoolJobs(schoolId)])
  const open = jobs.filter((j) => j.status === "open")

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Your postings on the ISLA Job Portal."
        actions={
          <>
            <PortalLink />
            <PostJobDialog schoolId={schoolId} schoolName={school?.name ?? "your school"} />
          </>
        }
      />
      <StatGroup columns={3}>
        <Stat label="Open positions" value={open.length} />
        <Stat label="Applicants to open roles" value={open.reduce((n, j) => n + j.applicants, 0)} />
        <Stat label="Filled this year" value={jobs.filter((j) => j.status === "filled").length} />
      </StatGroup>
      <JobsTable jobs={jobs} />
    </>
  )
}
