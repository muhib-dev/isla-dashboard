import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { RoleNotice } from "@/components/shared/role-notice";
import { TableSkeleton } from "@/components/shared/skeletons";
import { Stat, StatGroup } from "@/components/shared/stat";
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
  OfferPhaseDot,
  ValueTag,
  redeemWindow,
} from "@/features/offers/components/offer-bits";
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

      <StatGroup columns={3}>
        <Stat label="Claims" value={claims.length} />
        <Stat
          label="Redeemed"
          value={redeemed}
          hint={claims.length ? `${fmt.percent(redeemed / claims.length)} of claims` : undefined}
        />
        <Stat
          label="Days left"
          value={offer.daysLeft >= 0 ? offer.daysLeft : "Ended"}
          hint={`Until ${fmt.date(offer.endsOn)}`}
        />
      </StatGroup>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <CardTitle>Offer details</CardTitle>
          <ValueTag label={offer.value.label} />
        </CardHeader>
        <CardContent className="grid gap-6 text-sm md:grid-cols-2">
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
                <dd className="font-mono font-semibold">{redemption.code}</dd>
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
                    className="underline-offset-4 hover:underline"
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
        <Card className="py-14 text-center text-sm text-muted-foreground">
          No schools have claimed this offer yet.
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">School</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden sm:table-cell">Claimed</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims.map((claim) => (
                <TableRow key={claim.id}>
                  <TableCell className="pl-4">
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
                    <p className="text-sm text-muted-foreground">
                      {claim.schoolPlace}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p>{claim.contactName}</p>
                    <a
                      href={`mailto:${claim.contactEmail}`}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      {claim.contactEmail}
                    </a>
                  </TableCell>
                  <TableCell className="tabular hidden text-muted-foreground sm:table-cell">
                    {fmt.date(claim.claimedAt)}
                  </TableCell>
                  <TableCell>
                    {claim.status === "redeemed" ? (
                      <StatusDot tone="success">Redeemed</StatusDot>
                    ) : (
                      <StatusDot tone="brand">Claimed</StatusDot>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <ClaimStatusButton claimId={claim.id} status={claim.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </>
  );
}
