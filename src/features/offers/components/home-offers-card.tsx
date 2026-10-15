import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { StatusDot } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
    <Card>
      <CardHeader>
        <CardTitle>Claimed partner offers</CardTitle>
        <CardDescription>
          {claimed.length === 0
            ? "Offers you claim on ISLA Promotions show up here."
            : `${claimed.length} ${claimed.length === 1 ? "offer" : "offers"} claimed by your school.`}
        </CardDescription>
      </CardHeader>
      {claimed.length > 0 && (
        <CardContent>
          <ul className="divide-y">
            {claimed.slice(0, 3).map((offer) => (
              <li key={offer.claim.id} className="py-3 first:pt-0 last:pb-0">
                <Link href="/offers" className="flex items-center gap-3">
                  <PartnerMark initials={offer.partner.initials} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{offer.title}</p>
                    <p className="text-sm text-muted-foreground">{offer.partner.name}</p>
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
        </CardContent>
      )}
      <CardFooter className="gap-2 border-t py-3">
        {claimed.length > 0 && (
          <Button asChild variant="outline">
            <Link href="/offers">View claimed offers</Link>
          </Button>
        )}
        <Button asChild variant="ghost">
          <Link href="/promo-offers">
            View promotions <ArrowRightIcon />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
