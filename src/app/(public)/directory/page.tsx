import type { Metadata } from "next"
import { Suspense } from "react"
import { PageBody, PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { AddSchoolDialog, ReportSchoolDialog } from "@/features/schools/components/submission-forms"
import { SchoolsExplorer } from "@/features/schools/components/schools-explorer"
import { getPublicSearchIndex } from "@/features/schools/queries"
import { seedGeoContext } from "@/features/schools/search/geo-server"

export const metadata: Metadata = {
  title: "Islamic school map",
  description: "Find full-time Islamic schools across the United States and Canada.",
}

export default function PublicDirectoryPage({ searchParams }: PageProps<"/directory">) {
  return (
    <PageBody>
      <PageHeader
        title="Islamic school map"
        description="Find a school near you. Search by name, city or ZIP code, and filter by grades, programs and more."
        actions={
          <>
            <AddSchoolDialog />
            <ReportSchoolDialog />
          </>
        }
      />
      <Suspense fallback={<Skeleton className="h-[32rem] w-full rounded-xl" />}>
        <PublicDirectory searchParams={searchParams} />
      </Suspense>
    </PageBody>
  )
}

async function PublicDirectory({ searchParams }: Pick<PageProps<"/directory">, "searchParams">) {
  const raw = await searchParams
  const [docs, geoSeed] = await Promise.all([getPublicSearchIndex(), seedGeoContext(typeof raw.q === "string" ? raw.q : undefined)])
  return <SchoolsExplorer docs={docs} geoSeed={geoSeed} audience="public" />
}
