import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CircleCheckIcon } from "lucide-react";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { KpiGrid, KpiTile } from "@/components/shared/kpi-tile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClaimsByPartnerChart } from "@/features/offers/components/claims-by-partner-chart";
import { OfferPhaseDot } from "@/features/offers/components/offer-bits";
import { ClaimedOffers } from "@/features/offers/components/claimed-offers";
import { NewOfferButton } from "@/features/offers/components/offer-form-sheet";
import { OffersTable } from "@/features/offers/components/offers-table";
import { getOfferAdmin, getSchoolClaims } from "@/features/offers/queries";
import { fmt } from "@/lib/format";
import { getSession } from "@/server/session";

export const metadata: Metadata = { title: "Promotions" };

export default function OffersPage() {
  return (
    <PageBody>
      <Suspense fallback={<TableSkeleton />}>
        <Offers />
      </Suspense>
    </PageBody>
  );
}

async function Offers() {
  const session = await getSession();
  return session.role === "isla" ? (
    <StaffOffers />
  ) : (
    <SchoolClaims schoolId={session.schoolId!} />
  );
}

function PublicPageLink({ label }: { label: string }) {
  return (
    <Button asChild variant="outline">
      <Link href="/promo-offers">
        {label} <ArrowRightIcon />
      </Link>
    </Button>
  );
}

/** Schools browse and claim on the public page; the dashboard keeps what they claimed. */
async function SchoolClaims({ schoolId }: { schoolId: string }) {
  const claimed = await getSchoolClaims(schoolId);
  return (
    <>
      <PageHeader
        title="Claimed offers"
        description="Partner offers your school has claimed, with the steps to redeem each one."
        actions={<PublicPageLink label="View promotions" />}
      />
      <ClaimedOffers offers={claimed} />
    </>
  );
}

async function StaffOffers() {
  const { rows, stats, byPartner } = await getOfferAdmin();
  const attention = rows.filter(
    (r) => r.phase === "ending_soon" || r.phase === "draft",
  );

  return (
    <>
      <PageHeader
        title="Promotions"
        description="Partner offers on the public Promotions page, and who claimed them."
        actions={
          <>
            <PublicPageLink label="View promotions" />
            <NewOfferButton />
          </>
        }
      />
      <KpiGrid>
        <KpiTile label="Live offers" value={stats.live} />
        <KpiTile
          label="Claims"
          value={fmt.number(stats.claims)}
          footer={`${stats.last30} in the last 30 days`}
        />
        <KpiTile label="Schools reached" value={stats.schools} />
        <KpiTile
          label="Redeemed"
          value={stats.claims ? fmt.percent(stats.redeemed / stats.claims) : "–"}
          footer={`${stats.redeemed} of ${stats.claims} claims`}
        />
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Claims by partner</CardTitle>
            <CardDescription>
              All-time claims. Share with partners at renewal time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClaimsByPartnerChart data={byPartner} />
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardHeader className="border-b px-6 py-4">
            <CardTitle>Needs attention</CardTitle>
            <CardDescription>
              Offers ending soon and drafts waiting to publish.
            </CardDescription>
          </CardHeader>
          {attention.length === 0 ? (
            <p className="flex items-center gap-2 px-6 py-4 text-[15px] text-muted-foreground">
              <CircleCheckIcon className="size-4 text-success" aria-hidden />
              All clear.
            </p>
          ) : (
            <ul className="divide-y">
              {attention.map((r) => (
                <li key={r.id} className="px-6 py-3">
                  <Link
                    href={`/offers/${r.id}`}
                    className="text-[15px] font-medium hover:underline"
                  >
                    {r.title}
                  </Link>
                  <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
                    {r.partner.name}
                    <OfferPhaseDot
                      phase={r.phase}
                      daysLeft={r.daysLeft}
                      startsOn={r.startsOn}
                    />
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <OffersTable rows={rows} />
    </>
  );
}
