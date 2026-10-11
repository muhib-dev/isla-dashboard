import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { PageBody, PageHeader } from "@/components/layout/page-header"
import { RoleNotice } from "@/components/shared/role-notice"
import { PageSkeleton } from "@/components/shared/skeletons"
import { MembershipStatusDot } from "@/components/shared/status"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { ProfileView } from "@/features/profile/components/profile-view"
import { gradeSpan } from "@/features/schools/lib"
import { getSchool, getSchoolHealth } from "@/features/schools/queries"
import { REGION_LABELS } from "@/features/schools/schema"
import { fmt } from "@/lib/format"
import { canManageSchool, getSession } from "@/server/session"

export default function ManageSchoolPage({ params }: PageProps<"/schools/[id]">) {
  return (
    <PageBody>
      <Suspense fallback={<PageSkeleton />}>
        <ManageSchool params={params} />
      </Suspense>
    </PageBody>
  )
}

async function ManageSchool({ params }: Pick<PageProps<"/schools/[id]">, "params">) {
  const [{ id }, session] = await Promise.all([params, getSession()])
  if (!canManageSchool(session, id)) {
    return <RoleNotice title="ISLA staff only">Switch to the ISLA staff view to manage other schools.</RoleNotice>
  }

  const [school, health] = await Promise.all([getSchool(id), getSchoolHealth(id)])
  if (!school || !health) notFound()

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/schools">Schools</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{school.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <PageHeader
        title={school.name}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {school.address.city}, {school.address.state} · {REGION_LABELS[school.region]} · {gradeSpan(school.gradesFrom, school.gradesTo)} ·{" "}
              {fmt.number(school.metrics.enrollment)} students
            </span>
            <MembershipStatusDot status={school.membership.status} />
          </span>
        }
        actions={
          <Button asChild variant="outline">
            <Link href={`/analytics?school=${school.id}&region=${school.region}`}>Compare with region</Link>
          </Button>
        }
      />
      <ProfileView school={school} health={health} />
    </>
  )
}
