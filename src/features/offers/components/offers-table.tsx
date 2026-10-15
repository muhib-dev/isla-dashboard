import Link from "next/link";
import { TicketPercentIcon } from "lucide-react";
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
import { OfferEmpty } from "./offer-empty";
import {
  FeaturedBadge,
  OfferPhaseDot,
  PartnerMark,
  redeemWindow,
} from "./offer-bits";

export function OffersTable({ rows }: { rows: OfferRow[] }) {
  if (rows.length === 0) {
    return (
      <OfferEmpty
        icon={TicketPercentIcon}
        title="No partner offers yet"
        hint="Offers you create show here and on the public Promotions page."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="text-h3 font-semibold">All offers</h2>
          <p className="text-[15px] text-muted-foreground">
            Featured offers are pinned first for schools.
          </p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Offer</TableHead>
            <TableHead className="hidden lg:table-cell">Category</TableHead>
            <TableHead className="hidden md:table-cell">Redeem window</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Claims</TableHead>
            <TableHead className="w-12 pr-5">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="pl-5 whitespace-normal">
                <div className="flex items-center gap-3">
                  <PartnerMark
                    initials={row.partner.initials}
                    className="hidden size-8 sm:grid"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        href={`/offers/${row.id}`}
                        className="font-medium whitespace-normal hover:underline"
                      >
                        {row.title}
                      </Link>
                      {row.featured && <FeaturedBadge />}
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      {row.partner.name} · {row.value.label}
                      <span className="tabular sm:hidden">
                        {" "}
                        · {row.claims} {row.claims === 1 ? "claim" : "claims"}
                      </span>
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
              <TableCell className="tabular hidden text-right sm:table-cell">
                <p className="font-medium">{row.claims}</p>
                {row.claims > 0 && (
                  <p className="text-[13px] text-muted-foreground">
                    {row.redeemed} redeemed
                  </p>
                )}
              </TableCell>
              <TableCell className="pr-5 text-right">
                <OfferRowActions offer={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-t px-5 py-3 text-[15px] text-muted-foreground">
        {rows.length} {rows.length === 1 ? "offer" : "offers"}
      </div>
    </div>
  );
}
