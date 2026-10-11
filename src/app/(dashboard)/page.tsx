import { Suspense } from "react"
import { PageBody } from "@/components/layout/page-header"
import { PageSkeleton } from "@/components/shared/skeletons"
import { IslaHome } from "@/features/home/components/isla-home"
import { SchoolHome } from "@/features/home/components/school-home"
import { getSession } from "@/server/session"

export default function HomePage() {
  return (
    <PageBody>
      <Suspense fallback={<PageSkeleton />}>
        <Home />
      </Suspense>
    </PageBody>
  )
}

async function Home() {
  const session = await getSession()
  return session.role === "isla" ? <IslaHome /> : <SchoolHome schoolId={session.schoolId!} />
}
