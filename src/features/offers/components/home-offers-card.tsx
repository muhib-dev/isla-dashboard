import Link from "next/link";
import { ArrowRightIcon, TicketIcon } from "lucide-react";
import { StatusDot } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSchoolClaims } from "@/features/offers/queries";
import { fmt } from "@/lib/format";
import { PartnerMark } from "./offer-bits";

/** School home: the school's latest claimed partner offers. */
export async function HomeOffersCard({ schoolId }: { schoolId: string }) {
  const claimed = await getSchoolClaims(schoolId);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-6 py-4 [.border-b]:pb-4">
        <CardTitle>Claimed partner offers</CardTitle>
        <CardDescription>
          {claimed.length === 0
            ? "Offers you claim on ISLA Promotions show up here."
            : `${claimed.length} ${claimed.length === 1 ? "offer" : "offers"} claimed by your school.`}
        </CardDescription>
        {claimed.length > 0 && (
          <CardAction>
            <Link
              href="/offers"
              className="text-[15px] font-medium text-link underline-offset-4 hover:underline"
            >
              View claimed offers
            </Link>
          </CardAction>
        )}
      </CardHeader>
      {claimed.length === 0 ? (
        <div className="flex flex-1 flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-lg border bg-surface-2 text-muted-foreground">
            <TicketIcon className="size-7" strokeWidth={1.5} aria-hidden />
          </span>
          <p className="mt-1 font-semibold">No offers claimed yet</p>
          <p className="text-[15px] text-muted-foreground">
            Partner discounts for member schools are listed on ISLA Promotions.
          </p>
        </div>
      ) : (
        <ul className="flex-1">
          {claimed.slice(0, 3).map((offer) => (
            <li key={offer.claim.id} className="border-b last:border-b-0">
              <Link
                href="/offers"
                className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-surface-2"
              >
                <PartnerMark initials={offer.partner.initials} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{offer.title}</p>
                  <p className="text-[13px] text-muted-foreground">{offer.partner.name}</p>
                </div>
                {offer.claim.status === "redeemed" ? (
                  <StatusDot tone="success">Redeemed</StatusDot>
                ) : (
                  <StatusDot tone="brand">
                    Claimed {fmt.date(offer.claim.claimedAt)}
                  </StatusDot>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <CardFooter className="px-6 py-3">
        <Button asChild variant={claimed.length === 0 ? "outline" : "ghost"} size="sm">
          <Link href="/promo-offers">
            View promotions <ArrowRightIcon />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
