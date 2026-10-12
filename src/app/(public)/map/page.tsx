import type { Metadata } from "next"
import { Suspense } from "react"
import { PageBody, PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { SchoolsExplorer } from "@/features/schools/components/schools-explorer"
import { AddSchoolDialog, ReportSchoolDialog } from "@/features/schools/components/submission-forms"
import { getPublicSearchIndex } from "@/features/schools/queries"
import { seedGeoContext } from "@/features/schools/search/geo-server"

export const metadata: Metadata = {
  title: "Islamic school map",
  description: "Find full-time Islamic schools across the United States and Canada on one map.",
}

/** Open to everyone: no sign-in, public data only (see getPublicSearchIndex). */
export default function PublicMapPage({ searchParams }: PageProps<"/map">) {
  return (
    <PageBody>
      <PageHeader
        title="Islamic school map"
        description="Every school on one map. Click a pin for details, or search and filter to narrow it down."
        actions={
          <>
            <AddSchoolDialog />
            <ReportSchoolDialog />
          </>
        }
      />
      <Suspense fallback={<Skeleton className="h-[28rem] w-full rounded-xl" />}>
        <PublicMap searchParams={searchParams} />
      </Suspense>
    </PageBody>
  )
}

async function PublicMap({ searchParams }: Pick<PageProps<"/map">, "searchParams">) {
  const raw = await searchParams
  const [docs, geoSeed] = await Promise.all([getPublicSearchIndex(), seedGeoContext(typeof raw.q === "string" ? raw.q : undefined)])
  return <SchoolsExplorer docs={docs} geoSeed={geoSeed} audience="public" mode="map" />
}
