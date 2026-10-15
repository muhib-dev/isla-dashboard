"use client";

import { useState } from "react";
import Link from "next/link";
import { TicketPercentIcon } from "lucide-react";
import { StatusDot } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ClaimedOffer } from "@/features/offers/queries";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FeaturedBadge, PartnerMark, ValueTag, redeemWindow } from "./offer-bits";
import { OfferEmpty } from "./offer-empty";
import { RedemptionSteps } from "./redemption-steps";

/** The school's claimed offers, each with its redemption steps one click away. */
export function ClaimedOffers({ offers }: { offers: ClaimedOffer[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = offers.find((o) => o.id === openId);

  if (offers.length === 0) {
    return (
      <OfferEmpty
        icon={TicketPercentIcon}
        title="No claimed offers yet"
        hint="Offers you claim on ISLA Promotions show up here with their redemption steps."
        action={
          <Button asChild variant="outline">
            <Link href="/promo-offers">View promotions</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {offers.map((offer) => (
          <article
            key={offer.claim.id}
            className="flex min-w-0 flex-col rounded-lg border bg-card p-5"
          >
            <div className="flex items-start gap-3">
              <PartnerMark initials={offer.partner.initials} />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 leading-snug font-medium">
                  {offer.partner.name}
                </p>
                <p className="tabular text-[13px] text-muted-foreground">
                  Redeem by {redeemWindow(offer)}
                </p>
              </div>
              <ValueTag label={offer.value.label} />
            </div>
            {offer.featured && <FeaturedBadge className="mt-4" />}
            <h3
              className={cn(
                "text-h4 font-semibold text-balance",
                offer.featured ? "mt-2" : "mt-4",
              )}
            >
              {offer.title}
            </h3>
            <p className="mt-1 flex-1 text-[15px] text-pretty text-muted-foreground">
              {offer.summary}
            </p>
            <div className="mt-4">
              {offer.claim.status === "redeemed" ? (
                <StatusDot tone="success">
                  Redeemed{" "}
                  {fmt.date(offer.claim.redeemedAt ?? offer.claim.claimedAt)}
                </StatusDot>
              ) : offer.phase === "expired" ? (
                <StatusDot tone="neutral">
                  Claimed {fmt.date(offer.claim.claimedAt)} · offer ended
                </StatusDot>
              ) : (
                <StatusDot tone="brand">
                  Claimed {fmt.date(offer.claim.claimedAt)} by{" "}
                  {offer.claim.contactName}
                </StatusDot>
              )}
            </div>
            <div className="mt-4 border-t pt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setOpenId(offer.id)}
              >
                View redemption steps
              </Button>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={Boolean(open)} onOpenChange={(o) => !o && setOpenId(null)}>
        {open && (
          <DialogContent className="sm:max-w-lg">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle className="text-balance">{open.title}</DialogTitle>
              <DialogDescription>
                {open.partner.name} · Redeem by {redeemWindow(open)}
              </DialogDescription>
            </DialogHeader>
            <RedemptionSteps
              redemption={open.redemption}
              offerTitle={open.title}
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
