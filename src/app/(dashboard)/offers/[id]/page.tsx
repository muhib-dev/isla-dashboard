import Link from "next/link";
import { UsersIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { RoleNotice } from "@/components/shared/role-notice";
import { TableSkeleton } from "@/components/shared/skeletons";
import { KpiGrid, KpiTile } from "@/components/shared/kpi-tile";
import { StatusDot } from "@/components/shared/status";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClaimStatusButton,
  EditOfferButton,
  OfferRowActions,
} from "@/features/offers/components/offer-actions";
import {
  FeaturedBadge,
  OfferPhaseDot,
  ValueTag,
  redeemWindow,
} from "@/features/offers/components/offer-bits";
import { OfferEmpty } from "@/features/offers/components/offer-empty";
import { getOfferDetail } from "@/features/offers/queries";
import {
  OFFER_CATEGORY_LABELS,
  REDEMPTION_LABELS,
} from "@/features/offers/schema";
import { fmt } from "@/lib/format";
import { getSession } from "@/server/session";

export default function OfferDetailPage({ params }: PageProps<"/offers/[id]">) {
  return (
    <PageBody>
      <Suspense fallback={<TableSkeleton />}>
        <OfferDetail params={params} />
      </Suspense>
    </PageBody>
  );
}

async function OfferDetail({
  params,
}: Pick<PageProps<"/offers/[id]">, "params">) {
  const [{ id }, session] = await Promise.all([params, getSession()]);
  if (session.role !== "isla") {
    return (
      <RoleNotice title="ISLA staff only">
        Schools see their claimed offers under Claimed offers.
      </RoleNotice>
    );
  }

  const detail = await getOfferDetail(id);
  if (!detail) notFound();
  const { offer, claims } = detail;
  const redeemed = claims.filter((c) => c.status === "redeemed").length;
  const { redemption } = offer;

  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/offers">Promotions</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{offer.partner.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <PageHeader
        title={offer.title}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {offer.partner.name} · {OFFER_CATEGORY_LABELS[offer.category]} ·{" "}
              {redeemWindow(offer)}
            </span>
            <OfferPhaseDot
              phase={offer.phase}
              daysLeft={offer.daysLeft}
              startsOn={offer.startsOn}
            />
          </span>
        }
        actions={
          <>
            <EditOfferButton offer={offer} />
            <OfferRowActions offer={offer} showView={false} />
          </>
        }
      />

      <KpiGrid className="sm:grid-cols-3 xl:grid-cols-3">
        <KpiTile label="Claims" value={claims.length} />
        <KpiTile
          label="Redeemed"
          value={redeemed}
          footer={
            claims.length
              ? `${fmt.percent(redeemed / claims.length)} of claims`
              : undefined
          }
        />
        <KpiTile
          label="Days left"
          value={offer.daysLeft >= 0 ? offer.daysLeft : "Ended"}
          footer={`Until ${fmt.date(offer.endsOn)}`}
        />
      </KpiGrid>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <CardTitle>Offer details</CardTitle>
          <div className="flex items-center gap-2">
            {offer.featured && <FeaturedBadge />}
            <ValueTag label={offer.value.label} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 text-[15px] md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-pretty">{offer.summary}</p>
            {offer.details && (
              <p className="text-pretty text-muted-foreground">{offer.details}</p>
            )}
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-muted-foreground">Redeem by</dt>
            <dd>{REDEMPTION_LABELS[redemption.method]}</dd>
            {redemption.code && (
              <>
                <dt className="text-muted-foreground">Code</dt>
                <dd className="font-medium tracking-wider">{redemption.code}</dd>
              </>
            )}
            {redemption.email && (
              <>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="break-all">{redemption.email}</dd>
              </>
            )}
            {redemption.url && (
              <>
                <dt className="text-muted-foreground">Link</dt>
                <dd className="break-all">
                  <a
                    href={redemption.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link underline-offset-4 hover:underline"
                  >
                    {redemption.url}
                  </a>
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Audience</dt>
            <dd>{offer.membersOnly ? "ISLA members only" : "All schools"}</dd>
            <dt className="text-muted-foreground">Steps</dt>
            <dd className="text-pretty">{redemption.instructions}</dd>
          </dl>
        </CardContent>
      </Card>

      {claims.length === 0 ? (
        <OfferEmpty
          icon={UsersIcon}
          title="No claims yet"
          hint="Schools that claim this offer show up here with their contact details."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="text-h3 font-semibold">Claims</h2>
            <p className="text-[15px] text-muted-foreground">
              Schools that claimed this offer. Mark each one redeemed once the
              partner confirms.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">School</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden sm:table-cell">Claimed</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="pr-5 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="pl-5 whitespace-normal">
                    {claim.schoolId ? (
                      <Link
                        href={`/schools/${claim.schoolId}`}
                        className="font-medium hover:underline"
                      >
                        {claim.schoolName}
                      </Link>
                    ) : (
                      <p className="font-medium">{claim.schoolName}</p>
                    )}
                    <p className="text-[13px] text-muted-foreground">
                      {claim.schoolPlace}
                    </p>
                    <div className="mt-1 sm:hidden">
                      <ClaimStatusDot status={claim.status} />
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p>{claim.contactName}</p>
                    <a
                      href={`mailto:${claim.contactEmail}`}
                      className="text-[13px] text-muted-foreground hover:underline"
                    >
                      {claim.contactEmail}
                    </a>
                  </TableCell>
                  <TableCell className="tabular hidden text-muted-foreground sm:table-cell">
                    {fmt.date(claim.claimedAt)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <ClaimStatusDot status={claim.status} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <ClaimStatusButton claimId={claim.id} status={claim.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-5 py-3 text-[15px] text-muted-foreground">
            {claims.length} {claims.length === 1 ? "claim" : "claims"} ·{" "}
            {redeemed} redeemed
          </div>
        </div>
      )}
    </>
  );
}

function ClaimStatusDot({ status }: { status: "claimed" | "redeemed" }) {
  return status === "redeemed" ? (
    <StatusDot tone="success">Redeemed</StatusDot>
  ) : (
    <StatusDot tone="brand">Claimed</StatusDot>
  );
}
