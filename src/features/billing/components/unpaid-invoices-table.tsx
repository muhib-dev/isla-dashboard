"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OrgBillingSummary } from "@/features/billing/schema";
import { fmt } from "@/lib/format";
import { InvoiceStatusBadge, isOverdue } from "./invoice-status";
import {
  TableCardHeader,
  TableEmptyRow,
  TableSearch,
  UnderlineTabs,
} from "./invoice-table-parts";

type View = "all" | "overdue" | "due";

const PAGE_SIZE = 10;
type UnpaidInvoice = OrgBillingSummary["unpaid"][number];

const STOP = new Set(["of", "the", "and", "&"]);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w.toLowerCase()))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function UnpaidInvoicesTable({
  invoices,
  today,
}: {
  invoices: UnpaidInvoice[];
  /** ISO date the due-date badges are measured from. */
  today: string;
}) {
  const tableId = useId();
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const overdueCount = invoices.filter((i) => isOverdue(i)).length;
  const q = query.trim().toLowerCase();
  const rows = invoices.filter(
    (i) =>
      (view === "all" || (view === "overdue") === isOverdue(i)) &&
      (!q ||
        i.schoolName.toLowerCase().includes(q) ||
        i.number.toLowerCase().includes(q)),
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const start = current * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  return (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-card">
      <TableCardHeader>
        <UnderlineTabs<View>
          label="Filter unpaid invoices"
          controls={tableId}
          value={view}
          onChange={(v) => {
            setView(v);
            setPage(0);
          }}
          tabs={[
            { value: "all", label: "All unpaid", count: invoices.length },
            { value: "overdue", label: "Overdue", count: overdueCount },
            {
              value: "due",
              label: "Due",
              count: invoices.length - overdueCount,
            },
          ]}
        />
        <div className="sm:my-2">
          <TableSearch
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(0);
            }}
            placeholder="Search schools"
            label="Search unpaid invoices by school or invoice number"
          />
        </div>
      </TableCardHeader>

      <Table id={tableId}>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">School</TableHead>
            <TableHead className="hidden sm:table-cell">Due</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="pr-6">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={4}>
              {q
                ? `No unpaid invoices match “${query.trim()}”.`
                : "No unpaid invoices here."}
            </TableEmptyRow>
          ) : (
            pageRows.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-2 text-caption font-medium text-muted-foreground"
                      aria-hidden
                    >
                      {initials(invoice.schoolName)}
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/schools/${invoice.schoolId}`}
                        className="block truncate font-medium hover:underline"
                      >
                        {invoice.schoolName}
                      </Link>
                      <p className="text-caption text-muted-foreground">
                        {invoice.number}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="tabular hidden text-muted-foreground sm:table-cell">
                  {invoice.dueOn ? fmt.date(invoice.dueOn) : "—"}
                </TableCell>
                <TableCell className="tabular text-right font-medium">
                  {fmt.currency(invoice.amount)}
                </TableCell>
                <TableCell className="pr-6">
                  <InvoiceStatusBadge invoice={invoice} today={today} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-3 text-caption text-muted-foreground">
        <p className="tabular" aria-live="polite">
          {rows.length > PAGE_SIZE
            ? `Showing ${start + 1}–${start + pageRows.length} of ${rows.length}`
            : `${rows.length} unpaid ${rows.length === 1 ? "invoice" : "invoices"}`}
          {rows.length !== invoices.length && ` · filtered from ${invoices.length}`}
        </p>
        {pageCount > 1 && (
          <div className="flex items-center gap-3">
            <span className="tabular">
              Page {current + 1} of {pageCount}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                aria-controls={tableId}
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                aria-controls={tableId}
                disabled={current >= pageCount - 1}
                onClick={() => setPage(current + 1)}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
