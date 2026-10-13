import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Stat, StatGroup } from "@/components/shared/stat";
import { FreshnessDot, MembershipStatusDot } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getNetworkOverview,
  getRegionStats,
} from "@/features/analytics/queries";
import { listSchools } from "@/features/schools/queries";
import { REGION_LABELS } from "@/features/schools/schema";
import { fmt } from "@/lib/format";

export async function IslaHome() {
  const [overview, regions, schools] = await Promise.all([
    getNetworkOverview(),
    getRegionStats(),
    listSchools({}),
  ]);

  const attention = schools
    .filter(
      (s) =>
        s.freshness === "stale" ||
        s.membership.status === "lapsed" ||
        s.membership.status === "grace",
    )
    .sort((a, b) => a.oldestVerifiedAt.localeCompare(b.oldestVerifiedAt))
    .slice(0, 6);
  const maxSchools = Math.max(...regions.map((r) => r.schools));

  return (
    <>
      <PageHeader
        title="Network overview"
        description={`${overview.schools} schools across ${regions.length} regions.`}
      />

      <StatGroup>
        <Stat label="Schools" value={fmt.number(overview.schools)} />
        <Stat label="Students" value={fmt.number(overview.students)} />
        <Stat
          label="Active members"
          value={fmt.number(overview.membership.active)}
          hint={`${overview.membership.grace} in grace · ${overview.membership.lapsed} lapsed`}
        />
        <Stat
          label="Out-of-date profiles"
          value={fmt.number(overview.staleProfiles)}
          hint="Not verified in 12 months"
        />
      </StatGroup>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>
              Out-of-date profiles and memberships that need follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y border-y text-sm">
              {attention.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/schools/${s.id}`}
                    className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/50 sm:grid-cols-[1fr_8rem_8rem_auto]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {s.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {s.city}, {s.state}
                      </span>
                    </span>
                    <FreshnessDot
                      freshness={s.freshness}
                      className="hidden sm:inline-flex"
                    />
                    <span className="hidden sm:block">
                      <MembershipStatusDot status={s.membership.status} />
                    </span>
                    <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="py-3">
            <Button asChild variant="outline">
              <Link href="/schools?freshness=stale">
                See all out-of-date schools
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schools by region</CardTitle>
            <CardDescription>
              Share of each region that are active members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {regions.map((r) => (
              <div key={r.region} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span>{REGION_LABELS[r.region]}</span>
                  <span className="tabular text-sm text-muted-foreground">
                    {r.activeMembers} of {r.schools}
                  </span>
                </div>
                <div
                  className="relative h-2.5 rounded-full bg-muted"
                  style={{ width: `${(r.schools / maxSchools) * 100}%` }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full border-[1.5px] border-chart-1 bg-chart-1/35"
                    style={{
                      width: `${r.schools ? (r.activeMembers / r.schools) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter className="py-3">
            <Button asChild variant="outline">
              <Link href="/analytics">Compare regions</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
