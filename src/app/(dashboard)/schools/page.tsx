import type { Metadata } from "next"
import { Suspense } from "react"
import { PageBody, PageHeader } from "@/components/layout/page-header"
import { RoleNotice } from "@/components/shared/role-notice"
import { TableSkeleton } from "@/components/shared/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { SchoolFilters } from "@/features/schools/components/school-filters"
import { SchoolsTable } from "@/features/schools/components/schools-table"
import { listSchools } from "@/features/schools/queries"
import { SchoolFilterSchema } from "@/features/schools/schema"
import { getSession } from "@/server/session"

export const metadata: Metadata = { title: "Schools" }

export default function SchoolsPage({ searchParams }: PageProps<"/schools">) {
  return (
    <PageBody>
      <PageHeader title="Schools" description="Every school in the ISLA directory. Open a school to update its profile." />
      <Suspense fallback={<Skeleton className="h-10 w-full max-w-2xl" />}>
        <SchoolFilters />
      </Suspense>
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
  const filter = SchoolFilterSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    region: raw.region,
    status: raw.status,
    freshness: raw.freshness,
  })
  const rows = await listSchools(filter.success ? filter.data : {})
  return <SchoolsTable rows={rows} />
}
