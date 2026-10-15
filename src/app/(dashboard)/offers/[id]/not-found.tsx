import Link from "next/link";
import { PageBody } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export default function OfferNotFound() {
  return (
    <PageBody className="py-24 text-center">
      <p className="text-sm font-medium">Offer not found</p>
      <p className="text-sm text-muted-foreground">
        It may have been removed by ISLA staff.
      </p>
      <Button asChild variant="outline">
        <Link href="/offers">Back to promotions</Link>
      </Button>
    </PageBody>
  );
}
