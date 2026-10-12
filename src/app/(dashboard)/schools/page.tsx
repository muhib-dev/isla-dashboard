import type { Metadata } from "next"
import { Suspense } from "react"
import { PageBody, PageHeader } from "@/components/layout/page-header"
import { RoleNotice } from "@/components/shared/role-notice"
import { TableSkeleton } from "@/components/shared/skeletons"
import { AddSchoolDialog } from "@/features/schools/components/submission-forms"
import { SchoolsExplorer } from "@/features/schools/components/schools-explorer"
import { getSchoolSearchIndex } from "@/features/schools/queries"
import { seedGeoContext } from "@/features/schools/search/geo-server"
import { getSession } from "@/server/session"

export const metadata: Metadata = { title: "Schools" }

export default function SchoolsPage({ searchParams }: PageProps<"/schools">) {
  return (
    <PageBody>
      <PageHeader
        title="Schools"
        description="Search every school in the ISLA directory by name, place or detail, on a list or a map."
        actions={<AddSchoolDialog />}
      />
      <Suspense fallback={<TableSkeleton />}>
        <Directory searchParams={searchParams} />
      </Suspense>
    </PageBody>
  )
}

async function Directory({ searchParams }: Pick<PageProps<"/schools">, "searchParams">) {
  const session = await getSession()
  if (session.role !== "isla") {
    return (
      <RoleNotice title="ISLA staff only">
        Switch to the ISLA staff view from the menu in the top right to browse every school.
      </RoleNotice>
    )
  }
  const raw = await searchParams
  const [docs, geoSeed] = await Promise.all([getSchoolSearchIndex(true), seedGeoContext(typeof raw.q === "string" ? raw.q : undefined)])
  return <SchoolsExplorer docs={docs} geoSeed={geoSeed} />
}
