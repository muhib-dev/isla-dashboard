import Link from "next/link";
import { StarIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OfferRow } from "@/features/offers/queries";
import { OFFER_CATEGORY_LABELS } from "@/features/offers/schema";
import { OfferRowActions } from "./offer-actions";
import { OfferPhaseDot, PartnerMark, redeemWindow } from "./offer-bits";

export function OffersTable({ rows }: { rows: OfferRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="py-14 text-center text-sm text-muted-foreground">
        No partner offers yet.
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Offer</TableHead>
            <TableHead className="hidden lg:table-cell">Category</TableHead>
            <TableHead className="hidden md:table-cell">Redeem window</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Claims</TableHead>
            <TableHead className="w-12 pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="pl-4">
                <div className="flex items-center gap-3">
                  <PartnerMark
                    initials={row.partner.initials}
                    className="hidden size-9 sm:grid"
                  />
                  <div className="min-w-0">
                    <Link
                      href={`/offers/${row.id}`}
                      className="font-medium whitespace-normal hover:underline"
                    >
                      {row.title}
                    </Link>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      {row.partner.name} · {row.value.label}
                      {row.featured && (
                        <StarIcon
                          className="size-3.5 text-primary"
                          aria-label="Featured"
                        />
                      )}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {OFFER_CATEGORY_LABELS[row.category]}
              </TableCell>
              <TableCell className="tabular hidden text-muted-foreground md:table-cell">
                {redeemWindow(row)}
              </TableCell>
              <TableCell>
                <OfferPhaseDot
                  phase={row.phase}
                  daysLeft={row.daysLeft}
                  startsOn={row.startsOn}
                />
              </TableCell>
              <TableCell className="tabular text-right">
                <p className="font-medium">{row.claims}</p>
                {row.claims > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {row.redeemed} redeemed
                  </p>
                )}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <OfferRowActions offer={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
