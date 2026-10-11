import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { PageBody, PageHeader } from "@/components/layout/page-header"
import { RoleNotice } from "@/components/shared/role-notice"
import { PageSkeleton } from "@/components/shared/skeletons"
import { ProfileView } from "@/features/profile/components/profile-view"
import { gradeSpan } from "@/features/schools/lib"
import { getSchool, getSchoolHealth } from "@/features/schools/queries"
import { ProfileSectionSchema } from "@/features/schools/schema"
import { getSession } from "@/server/session"

export const metadata: Metadata = { title: "School profile" }

export default function ProfilePage({ searchParams }: PageProps<"/profile">) {
  return (
    <PageBody>
      <Suspense fallback={<PageSkeleton />}>
        <Profile searchParams={searchParams} />
      </Suspense>
    </PageBody>
  )
}

async function Profile({ searchParams }: Pick<PageProps<"/profile">, "searchParams">) {
  const session = await getSession()
  if (!session.schoolId) {
    return (
      <RoleNotice title="Pick a school to manage">
        ISLA staff manage profiles from the <Link href="/schools" className="text-primary underline-offset-4 hover:underline">Schools</Link> directory.
      </RoleNotice>
    )
  }

  const { section } = await searchParams
  const [school, health] = await Promise.all([getSchool(session.schoolId), getSchoolHealth(session.schoolId)])
  if (!school || !health) notFound()

  return (
    <>
      <PageHeader
        title="School profile"
        description={`${school.name} · ${school.address.city}, ${school.address.state} · ${gradeSpan(school.gradesFrom, school.gradesTo)}`}
      />
      <ProfileView
        school={school}
        health={health}
        initialSection={ProfileSectionSchema.safeParse(section).data}
      />
    </>
  )
}
