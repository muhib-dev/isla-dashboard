import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { OfferEmpty } from "@/features/offers/components/offer-empty";

export default function OfferNotFound() {
  return (
    <PageBody>
      <OfferEmpty
        icon={SearchXIcon}
        title="Offer not found"
        hint="It may have been removed by ISLA staff."
        action={
          <Button asChild variant="outline">
            <Link href="/offers">Back to promotions</Link>
          </Button>
        }
        className="border-0 bg-transparent py-24"
      />
    </PageBody>
  );
}
