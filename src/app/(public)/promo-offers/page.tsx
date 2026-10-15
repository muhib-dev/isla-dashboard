import type { Metadata } from "next";
import { Suspense } from "react";
import { PageBody, PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PublicOfferList,
  type OfferViewer,
} from "@/features/offers/components/public-offer-list";
import { getPublicOffers, getSchoolClaims } from "@/features/offers/queries";
import { getSchool } from "@/features/schools/queries";
import { getOptionalSession } from "@/server/session";

export const metadata: Metadata = {
  title: "Exclusive Promo Offers",
  description:
    "Discover special promo offers from our corporate partners. Select an offer to claim yours today.",
};

/** Open to everyone. Signed-in school admins get a prefilled form and see what they've claimed. */
export default function PromoOffersPage() {
  return (
    <PageBody className="mx-auto max-w-5xl">
      <PageHeader
        title="Exclusive Promo Offers"
        description="Discover special promo offers from our corporate partners. Select an offer to claim yours today."
      />
      <Suspense
        fallback={
          <div className="grid gap-6">
            <Skeleton className="h-96 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        }
      >
        <Offers />
      </Suspense>
    </PageBody>
  );
}

async function Offers() {
  const [offers, viewer] = await Promise.all([getPublicOffers(), getViewer()]);
  return <PublicOfferList offers={offers} viewer={viewer} />;
}

async function getViewer(): Promise<OfferViewer | null> {
  const session = await getOptionalSession();
  if (session?.role !== "school" || !session.schoolId) return null;
  const [school, claims] = await Promise.all([
    getSchool(session.schoolId),
    getSchoolClaims(session.schoolId),
  ]);
  if (!school) return null;
  const leader =
    school.leadership.find((l) => l.name === session.user.name) ??
    school.leadership[0];
  return {
    schoolName: school.name,
    contactName: session.user.name,
    contactEmail: leader?.email ?? "",
    claimed: Object.fromEntries(claims.map((c) => [c.id, c.redemption])),
  };
}
