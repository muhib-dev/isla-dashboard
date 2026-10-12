import type { Metadata } from "next"
import { Suspense } from "react"
import { PageBody, PageHeader } from "@/components/layout/page-header"
import { RoleNotice } from "@/components/shared/role-notice"
import { TableSkeleton } from "@/components/shared/skeletons"
import { ReportsTable } from "@/features/schools/components/reports-table"
import { listSchoolReports } from "@/features/schools/queries"
import { getSession } from "@/server/session"

export const metadata: Metadata = { title: "Reports" }

export default function ReportsPage() {
  return (
    <PageBody>
      <PageHeader title="Reports" description="New schools and corrections sent in from the public map. Nothing changes until you approve it." />
      <Suspense fallback={<TableSkeleton rows={4} />}>
        <Reports />
      </Suspense>
    </PageBody>
  )
}

async function Reports() {
  const session = await getSession()
  if (session.role !== "isla") {
    return <RoleNotice title="ISLA staff only">Switch to the ISLA staff view from the menu in the top right to review reports.</RoleNotice>
  }
  return <ReportsTable reports={await listSchoolReports()} />
}
