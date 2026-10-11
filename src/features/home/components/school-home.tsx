import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowRightIcon, BarChart3Icon, BookOpenIcon, BriefcaseIcon, ShoppingBagIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { StatusDot } from "@/components/shared/status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getSchoolBilling } from "@/features/billing/queries"
import { getSchoolJobs } from "@/features/jobs/queries"
import { gradeSpan } from "@/features/schools/lib"
import { getSchool, getSchoolHealth } from "@/features/schools/queries"
import { REGION_LABELS } from "@/features/schools/schema"
import { fmt } from "@/lib/format"

export async function SchoolHome({ schoolId }: { schoolId: string }) {
  const [school, health, billing, jobs] = await Promise.all([
    getSchool(schoolId),
    getSchoolHealth(schoolId),
    getSchoolBilling(schoolId),
    getSchoolJobs(schoolId),
  ])
  if (!school || !health) notFound()

  const openJobs = jobs.filter((j) => j.status === "open").length
  const { plan, renewsInDays } = billing
  const renewSoon = renewsInDays !== null && renewsInDays <= 30 && plan && !plan.autoRenew

  const links = [
    { href: "/analytics", icon: BarChart3Icon, title: "Analytics", meta: `Compare with ${REGION_LABELS[school.region]} schools` },
    { href: "/jobs", icon: BriefcaseIcon, title: "Jobs", meta: `${openJobs} open ${openJobs === 1 ? "position" : "positions"}` },
    { href: "/knowledge", icon: BookOpenIcon, title: "Knowledge", meta: "Ask about ISLA research" },
    { href: "/store", icon: ShoppingBagIcon, title: "ISLA Store", meta: "Toolkits and templates" },
  ]

  return (
    <>
      <PageHeader
        title={school.name}
        description={`${school.address.city}, ${school.address.state} · ${gradeSpan(school.gradesFrom, school.gradesTo)} · ${fmt.number(school.metrics.enrollment)} students · Member since ${school.membership.memberSince}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile health</CardTitle>
            <CardDescription>Families and ISLA see this profile in the school directory.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-[180px_1fr]">
            <div className="space-y-3">
              <p className="tabular text-4xl font-semibold tracking-tight">{health.score}%</p>
              <Progress value={health.score} className="h-1.5" />
              <p className="text-sm text-muted-foreground">
                {health.tasks.length === 0 ? "Everything is up to date." : `${health.tasks.length} items to review`}
              </p>
            </div>
            <ul className="divide-y text-base">
              {health.tasks.slice(0, 3).map((task) => (
                <li key={task.label}>
                  <Link
                    href={`/profile?section=${task.section}`}
                    className="group flex items-center justify-between gap-3 py-2.5 first:pt-0"
                  >
                    <span>{task.label}</span>
                    <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="border-t py-3">
            <Button asChild variant="outline">
              <Link href="/profile">Open school profile</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Membership</CardTitle>
            <CardDescription>{plan ? plan.tier : "Not a member"}</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {plan && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Renews</p>
                  <p className="font-medium">{fmt.date(plan.renewsOn)}</p>
                </div>
                {renewSoon ? (
                  <StatusDot tone="warning">Renews in {renewsInDays} days · auto-renew is off</StatusDot>
                ) : (
                  <StatusDot tone="success">In good standing</StatusDot>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="border-t py-3">
            <Button asChild variant="outline">
              <Link href="/billing">Manage billing</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors hover:bg-accent/60"
          >
            <link.icon className="size-5 text-action" />
            <p className="mt-3 text-base font-semibold">{link.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{link.meta}</p>
          </Link>
        ))}
      </div>
    </>
  )
}
