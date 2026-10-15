import Link from "next/link";
import {
  AlertCircleIcon,
  BarChart3Icon,
  CircleCheckIcon,
  ClockAlertIcon,
  FlagIcon,
  HourglassIcon,
  PencilLineIcon,
  PlusIcon,
  ReceiptIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { KpiGrid, KpiTile, Sparkline } from "@/components/shared/kpi-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getNetworkOverview,
  getRegionStats,
} from "@/features/analytics/queries";
import { GRACE_DAYS } from "@/features/billing/components/invoice-status";
import { getOrgBilling } from "@/features/billing/queries";
import { AddSchoolDialog } from "@/features/schools/components/submission-forms";
import { listSchoolReports, listSchools } from "@/features/schools/queries";
import { REGION_LABELS } from "@/features/schools/schema";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  daysSince,
  greeting,
  HomeEmpty,
  ListCardHeader,
  MembershipBar,
  MEMBERSHIP_LABELS,
  MembershipLegend,
  membershipSummary,
  QuickActionList,
  RegionMembershipList,
  relativeDay,
  requestTime,
  TextLink,
  todayLabel,
} from "./home-bits";
import { ExportCsvButton, RemindAllButton, RemindLink } from "./home-actions";

const MEMBER_STATUSES = ["active", "grace", "lapsed"] as const;

export async function IslaHome({ firstName }: { firstName: string }) {
  const [overview, regions, schools, org, reports] = await Promise.all([
    getNetworkOverview(),
    getRegionStats(),
    listSchools({}),
    getOrgBilling(),
    listSchoolReports(),
  ]);
  const now = await requestTime();
  const year = new Date(now).getFullYear();

  // KPIs
  const { active, grace, lapsed } = overview.membership;
  const members = schools.filter((s) => s.membership.status !== "non_member");
  const joinedThisYear = members.filter(
    (s) => s.membership.memberSince === year,
  ).length;
  // Current members by the year they joined, cumulative over eight years.
  const memberTrend = Array.from({ length: 8 }, (_, i) => year - 7 + i).map(
    (y) => members.filter((s) => s.membership.memberSince <= y).length,
  );
  const renewalRate = members.length ? active / members.length : 0;
  const overdue = org.unpaid.filter((i) => i.status === "overdue");
  const open = org.unpaid.filter((i) => i.status === "open");

  // Grace period: each school's unpaid membership invoice, fewest days left first.
  const unpaidBySchool = new Map(
    org.unpaid
      .filter((i) => i.kind === "membership")
      .map((i) => [i.schoolId, i]),
  );
  const inGrace = schools
    .filter((s) => s.membership.status === "grace")
    .map((s) => {
      const invoice = unpaidBySchool.get(s.id);
      return {
        school: s,
        invoice,
        daysLeft: invoice?.dueOn
          ? Math.max(0, GRACE_DAYS - daysSince(invoice.dueOn, now))
          : null,
      };
    })
    .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));

  const dayAfter = (iso: string, days: number) =>
    new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
  const today = new Date(now).toISOString().slice(0, 10);

  // Recent activity, newest first: payments, grace and lapse events, map reports and profile edits.
  const activity = [
    ...(org.recentPayments ?? []).map((i) => ({
      id: `paid-${i.id}`,
      date: i.paidOn!,
      icon: CircleCheckIcon,
      tone: "text-success",
      href: `/schools/${i.schoolId}`,
      name: i.schoolName,
      text: `paid ${i.number} · ${fmt.currency(i.amount)}`,
    })),
    ...org.unpaid
      .filter((i) => i.kind === "membership" && i.dueOn)
      .map((i) =>
        i.status === "overdue"
          ? {
              id: `lapsed-${i.id}`,
              date: dayAfter(i.dueOn!, GRACE_DAYS),
              icon: AlertCircleIcon,
              tone: "text-destructive",
              href: `/schools/${i.schoolId}`,
              name: i.schoolName,
              text: "membership lapsed",
            }
          : {
              id: `grace-${i.id}`,
              date: dayAfter(i.dueOn!, 1),
              icon: TriangleAlertIcon,
              tone: "text-warning",
              href: `/schools/${i.schoolId}`,
              name: i.schoolName,
              text: "entered its grace period",
            },
      ),
    ...reports
      .filter((r) => r.status === "pending")
      .map((r) => ({
        id: `report-${r.id}`,
        date: r.createdAt,
        icon: FlagIcon,
        tone: "text-info",
        href: "/reports",
        name: r.schoolName,
        text: r.kind === "new" ? "was suggested as a new school" : "has a reported change",
      })),
    ...schools.map((s) => ({
      id: `profile-${s.id}`,
      date: s.updatedAt,
      icon: PencilLineIcon,
      tone: "text-primary",
      href: `/schools/${s.id}`,
      name: s.name,
      text: "updated their profile",
    })),
  ]
    .filter((item) => item.date <= today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const exportRows = schools.map((s) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    state: s.state,
    region: REGION_LABELS[s.region],
    membership: MEMBERSHIP_LABELS[s.membership.status],
    member_since: s.membership.memberSince,
  }));

  const pendingReports = reports.filter((r) => r.status === "pending").length;

  return (
    <>
      <PageHeader
        title={greeting(firstName, new Date(now))}
        description={`${todayLabel(new Date(now))} · ${grace} ${grace === 1 ? "school is" : "schools are"} in their grace period`}
        actions={
          <>
            <ExportCsvButton filename="isla-schools.csv" rows={exportRows} />
            <AddSchoolDialog
              trigger={
                <Button>
                  <PlusIcon /> Add school
                </Button>
              }
            />
          </>
        }
      />

      <KpiGrid>
        <KpiTile
          label="Member schools"
          value={fmt.number(members.length)}
          footer={
            <span>
              Active + grace + lapsed · {joinedThisYear} joined this year
            </span>
          }
        >
          <Sparkline values={memberTrend} />
        </KpiTile>
        <KpiTile
          label="Renewal rate"
          info="Share of member schools whose membership is active (not in grace or lapsed). The trend shows the share paid up on their latest dues at each month-end."
          value={fmt.percent(renewalRate)}
          footer={
            <span>
              {grace} in grace · {lapsed} lapsed
            </span>
          }
        >
          {org.trends ? (
            <Sparkline values={org.trends.renewalRate} />
          ) : (
            <div className="flex h-9 items-center">
              <MembershipBar
                counts={overview.membership}
                statuses={MEMBER_STATUSES}
                label={`Members: ${membershipSummary(overview.membership, MEMBER_STATUSES)}`}
                className="h-2 w-full"
              />
            </div>
          )}
        </KpiTile>
        <KpiTile
          label="Revenue year to date"
          info="Paid invoices issued since the fiscal year began on July 1. The trend is cumulative by week."
          value={fmt.compactCurrency(org.collected)}
          footer={
            <>
              <span>{org.fiscalYear}</span>
              <span>{fmt.compactCurrency(org.outstanding)} outstanding</span>
            </>
          }
        >
          {org.trends && <Sparkline values={org.trends.revenueYtd} />}
        </KpiTile>
        <KpiTile
          label="Overdue invoices"
          value={fmt.number(overdue.length)}
          footer={
            <>
              <span className={cn(overdue.length > 0 && "text-destructive")}>
                {fmt.currency(org.overdue)} overdue · {open.length} open
              </span>
              <TextLink href="/billing" className="text-[13px]">
                Review
              </TextLink>
            </>
          }
        >
          {org.trends && <Sparkline values={org.trends.overdue} />}
        </KpiTile>
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card className="gap-0 py-0">
          <ListCardHeader
            title="Membership by region"
            description={`${fmt.number(overview.schools)} schools · ${fmt.number(overview.students)} students · as of today`}
            action={
              <div className="hidden sm:block">
                <MembershipLegend />
              </div>
            }
          />
          <CardContent className="space-y-3 px-6 py-5">
            <div className="sm:hidden">
              <MembershipLegend />
            </div>
            <RegionMembershipList regions={regions} />
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <ListCardHeader title="Quick actions" />
          <CardContent className="px-6 py-4">
            <QuickActionList
              actions={[
                {
                  href: "/schools?fresh=stale",
                  icon: ClockAlertIcon,
                  label: "Review out-of-date profiles",
                  sub: `${overview.staleProfiles} not verified in 12 months`,
                },
                {
                  href: "/reports",
                  icon: FlagIcon,
                  label: "Review map reports",
                  sub:
                    pendingReports === 0
                      ? "Nothing waiting for review"
                      : `${pendingReports} waiting for review`,
                },
                {
                  href: "/billing",
                  icon: ReceiptIcon,
                  label: "Follow up on invoices",
                  sub: `${overdue.length} overdue · ${open.length} open`,
                },
                {
                  href: "/analytics",
                  icon: BarChart3Icon,
                  label: "Compare regions",
                  sub: `Benchmarks across ${regions.length} regions`,
                },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-0 py-0">
          <ListCardHeader
            title="Recent activity"
            action={<TextLink href="/schools">View all</TextLink>}
          />
          <ul>
            {activity.map((item) => (
              <li key={item.id} className="border-b last:border-b-0">
                <Link
                  href={item.href}
                  className="flex gap-3 px-6 py-3 transition-colors hover:bg-surface-2"
                >
                  <ActivityIcon icon={item.icon} className={item.tone} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px]">
                      <span className="font-medium">{item.name}</span>{" "}
                      {item.text}
                    </span>
                    <span className="block text-[13px] text-muted-foreground">
                      {relativeDay(item.date, now)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="gap-0 py-0">
          <ListCardHeader
            title="Grace period ending soon"
            action={
              inGrace.length > 0 && <RemindAllButton count={inGrace.length} />
            }
          />
          {inGrace.length === 0 ? (
            <HomeEmpty
              icon={HourglassIcon}
              title="No schools in grace"
              hint="Every member school is paid up."
            />
          ) : (
            <ul>
              {inGrace.slice(0, 5).map(({ school, invoice, daysLeft }) => (
                <li
                  key={school.id}
                  className="grid h-14 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 border-b px-6 text-[15px] transition-colors last:border-b-0 hover:bg-surface-2 sm:grid-cols-[minmax(0,1fr)_110px_90px_64px]"
                >
                  <Link href={`/schools/${school.id}`} className="min-w-0">
                    <span className="block truncate font-medium">
                      {school.name}
                    </span>
                    <span className="block text-[13px] text-muted-foreground">
                      {school.city}, {school.state}
                    </span>
                  </Link>
                  <span
                    className={cn(
                      "font-medium whitespace-nowrap",
                      daysLeft === null
                        ? "text-muted-foreground"
                        : daysLeft <= 7
                          ? "text-destructive"
                          : "text-warning",
                    )}
                  >
                    {daysLeft === null
                      ? "No invoice"
                      : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left`}
                  </span>
                  <span className="tabular text-right">
                    {invoice ? fmt.currency(invoice.amount) : "—"}
                  </span>
                  <span className="hidden text-right sm:block">
                    <RemindLink school={school.name} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
