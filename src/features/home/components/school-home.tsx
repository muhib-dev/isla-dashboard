import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  BarChart3Icon,
  BookOpenIcon,
  BriefcaseIcon,
  ClockIcon,
  ShoppingBagIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  KpiGrid,
  KpiTile,
  Sparkline,
  type KpiDelta,
} from "@/components/shared/kpi-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getSchoolBilling } from "@/features/billing/queries";
import { PostJobDialog } from "@/features/jobs/components/post-job-dialog";
import { getSchoolJobs } from "@/features/jobs/queries";
import { JOB_CATEGORY_LABELS } from "@/features/jobs/schema";
import { HomeOffersCard } from "@/features/offers/components/home-offers-card";
import { gradeSpan } from "@/features/schools/lib";
import { getSchool, getSchoolHealth } from "@/features/schools/queries";
import { REGION_LABELS } from "@/features/schools/schema";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  greeting,
  HomeAlert,
  HomeEmpty,
  ListCardHeader,
  QuickActionList,
  relativeDay,
  requestTime,
  TextLink,
} from "./home-bits";

const MEMBERSHIP_VALUE = {
  active: ["Active", "bg-member-active"],
  grace: ["Grace period", "bg-member-grace"],
  lapsed: ["Lapsed", "bg-member-lapsed"],
  non_member: ["Not a member", "border-[1.5px] border-member-none"],
} as const;

export async function SchoolHome({
  schoolId,
  firstName,
}: {
  schoolId: string;
  firstName: string;
}) {
  const [school, health, billing, jobs] = await Promise.all([
    getSchool(schoolId),
    getSchoolHealth(schoolId),
    getSchoolBilling(schoolId),
    getSchoolJobs(schoolId),
  ]);
  if (!school || !health) notFound();

  const openJobs = jobs.filter((j) => j.status === "open");
  const applicants = openJobs.reduce((n, j) => n + j.applicants, 0);
  const { plan, renewsInDays, invoices } = billing;
  const renewSoon =
    renewsInDays !== null && renewsInDays <= 30 && plan && !plan.autoRenew;
  const overdue = invoices.find((i) => i.status === "overdue");
  const due = invoices.find((i) => i.status === "open");
  const status = school.membership.status;
  const now = await requestTime();

  const history = school.metrics.enrollmentHistory;
  const [prev, last] = history.slice(-2);
  const change = prev && last && prev.value ? last.value / prev.value - 1 : null;
  const enrollmentDelta: KpiDelta | undefined =
    change === null
      ? undefined
      : {
          label: fmt.percent(Math.abs(change)),
          direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
          tone: change > 0 ? "good" : change < 0 ? "bad" : "neutral",
          srLabel: `${change >= 0 ? "up" : "down"} on ${prev.year}`,
        };
  const [statusLabel, statusDot] = MEMBERSHIP_VALUE[status];

  // Dues paid per membership year, oldest first.
  const duesTrend = invoices
    .filter((i) => i.kind === "membership")
    .sort((a, b) => a.issuedOn.localeCompare(b.issuedOn))
    .map((i) => (i.status === "paid" ? i.amount : 0));
  // Jobs posted in each of the last six months, oldest first.
  const jobsTrend = Array.from({ length: 6 }, (_, k) => {
    const d = new Date(now);
    const month = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 5 + k, 1))
      .toISOString()
      .slice(0, 7);
    return jobs.filter((j) => j.postedOn.startsWith(month)).length;
  });

  return (
    <>
      <PageHeader
        title={greeting(firstName, new Date(now))}
        description={`${school.name} · ${school.address.city}, ${school.address.state} · ${gradeSpan(school.gradesFrom, school.gradesTo)} · Member since ${school.membership.memberSince}`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/profile">Open school profile</Link>
            </Button>
            <PostJobDialog schoolId={school.id} schoolName={school.name} />
          </>
        }
      />

      {overdue ? (
        <HomeAlert
          tone="danger"
          icon={AlertCircleIcon}
          title={`Invoice ${overdue.number} is overdue.`}
          action={<TextLink href="/billing">Go to billing</TextLink>}
        >
          {fmt.currency(overdue.amount)} was due
          {overdue.dueOn ? ` on ${fmt.date(overdue.dueOn)}` : ""}.
        </HomeAlert>
      ) : status === "grace" || status === "lapsed" ? (
        <HomeAlert
          tone={status === "lapsed" ? "danger" : "warning"}
          icon={AlertCircleIcon}
          title={
            status === "lapsed"
              ? "Your ISLA membership has lapsed."
              : "Your membership is in its grace period."
          }
          action={<TextLink href="/billing">Go to billing</TextLink>}
        >
          {due
            ? `Pay ${fmt.currency(due.amount)} for ${due.number} to stay a member.`
            : "Renew to keep member benefits."}
        </HomeAlert>
      ) : renewSoon ? (
        <HomeAlert
          tone="warning"
          icon={ClockIcon}
          title={`Membership renews in ${renewsInDays} days.`}
          action={<TextLink href="/billing">Manage billing</TextLink>}
        >
          Auto-renew is off.
        </HomeAlert>
      ) : null}

      <KpiGrid>
        <KpiTile
          label="Enrollment"
          value={fmt.number(school.metrics.enrollment)}
          delta={enrollmentDelta}
          footer={
            <>
              <span>
                {history.length > 1
                  ? `${history[0].year}–${history[history.length - 1].year}`
                  : "Students"}
              </span>
              <TextLink href="/analytics" className="text-[13px]">
                Compare
              </TextLink>
            </>
          }
        >
          <Sparkline values={history.map((h) => h.value)} />
        </KpiTile>
        <KpiTile
          label="Membership"
          value={
            <span className="inline-flex items-center gap-2.5">
              <span
                className={cn("size-3 shrink-0 rounded-full", statusDot)}
                aria-hidden
              />
              {statusLabel}
            </span>
          }
          footer={
            <>
              <span className="truncate">
                {plan
                  ? `${plan.tier} · renews ${fmt.date(plan.renewsOn)}`
                  : "No membership plan"}
              </span>
              <TextLink href="/billing" className="shrink-0 text-[13px]">
                Billing
              </TextLink>
            </>
          }
        >
          <Sparkline values={duesTrend} />
        </KpiTile>
        <KpiTile
          label="Open jobs"
          value={fmt.number(openJobs.length)}
          footer={
            <>
              <span>
                {applicants} {applicants === 1 ? "applicant" : "applicants"}
              </span>
              <TextLink href="/jobs" className="text-[13px]">
                View jobs
              </TextLink>
            </>
          }
        >
          <Sparkline values={jobsTrend} />
        </KpiTile>
        <KpiTile
          label="Profile health"
          value={`${health.score}%`}
          footer={
            <>
              <span>
                {health.tasks.length === 0
                  ? "Everything is up to date"
                  : `${health.tasks.length} items to review`}
              </span>
              <TextLink href="/profile" className="text-[13px]">
                Review
              </TextLink>
            </>
          }
        >
          <div className="flex h-9 items-center">
            <Progress
              value={health.score}
              className="h-2"
              aria-label="Profile completeness"
            />
          </div>
        </KpiTile>
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="gap-0 py-0">
          <ListCardHeader
            title="Profile health"
            description="Families and ISLA see this profile in the school directory."
            action={<TextLink href="/profile">Open profile</TextLink>}
          />
          {health.tasks.length === 0 ? (
            <p className="px-6 py-4 text-[15px] text-muted-foreground">
              Everything is up to date.
            </p>
          ) : (
            <ul>
              {health.tasks.slice(0, 4).map((task) => (
                <li key={task.label} className="border-b last:border-b-0">
                  <Link
                    href={`/profile?section=${task.section}`}
                    className="group flex items-center justify-between gap-3 px-6 py-3 text-[15px] transition-colors hover:bg-surface-2"
                  >
                    <span>{task.label}</span>
                    <ArrowRightIcon
                      className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-0 py-0">
          <ListCardHeader title="Quick actions" />
          <CardContent className="px-6 py-4">
            <QuickActionList
              actions={[
                {
                  href: "/analytics",
                  icon: BarChart3Icon,
                  label: "Analytics",
                  sub: `Compare with ${REGION_LABELS[school.region]} schools`,
                },
                {
                  href: "/jobs",
                  icon: BriefcaseIcon,
                  label: "Jobs",
                  sub: `${openJobs.length} open ${openJobs.length === 1 ? "position" : "positions"}`,
                },
                {
                  href: "/knowledge",
                  icon: BookOpenIcon,
                  label: "Knowledge",
                  sub: "Ask about ISLA research",
                },
                {
                  href: "/store",
                  icon: ShoppingBagIcon,
                  label: "ISLA Store",
                  sub: "Toolkits and templates",
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 py-0">
          <ListCardHeader
            title="Open jobs"
            description={`${openJobs.length} open · ${jobs.length} posted in total`}
            action={<TextLink href="/jobs">View all</TextLink>}
          />
          {openJobs.length === 0 ? (
            <HomeEmpty
              icon={BriefcaseIcon}
              title="No open jobs"
              hint="Post a role to reach candidates across the ISLA network."
            />
          ) : (
            <ul>
              {openJobs.slice(0, 4).map((job) => (
                <li key={job.id} className="border-b last:border-b-0">
                  <Link
                    href="/jobs"
                    className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium">
                        {job.title}
                      </span>
                      <span className="block text-[13px] text-muted-foreground">
                        {JOB_CATEGORY_LABELS[job.category]} · Posted{" "}
                        {relativeDay(job.postedOn, now).toLowerCase()}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-[15px] font-medium">
                      {job.applicants}{" "}
                      <span className="font-normal text-muted-foreground">
                        {job.applicants === 1 ? "applicant" : "applicants"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <HomeOffersCard schoolId={schoolId} />
      </div>
    </>
  );
}
