"use client";

import { useId, useMemo, useState } from "react";
import { ArrowDownIcon, CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { externalLinks } from "@/config/links";
import type { Invoice } from "@/features/billing/schema";
import { fmt } from "@/lib/format";
import { InvoiceStatusBadge, isUnpaid } from "./invoice-status";
import {
  TableCardHeader,
  TableEmptyRow,
  TableSearch,
  UnderlineTabs,
} from "./invoice-table-parts";
import { InvoiceDownloadButton, PayInvoicesButton } from "./plan-controls";

type View = "all" | "unpaid" | "paid";

const dueKey = (i: Invoice) => i.dueOn ?? i.issuedOn;

export function InvoicesTable({
  invoices,
  today,
  pay,
}: {
  invoices: Invoice[];
  /** ISO date the due-date badges are measured from. */
  today: string;
  /** When given, unpaid rows get a Pay button. */
  pay?: { schoolId: string; card: { brand: string; last4: string } | null };
}) {
  const tableId = useId();
  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("all");
  const years = useMemo(
    () =>
      [...new Set(invoices.map((i) => i.issuedOn.slice(0, 4)))]
        .sort()
        .reverse(),
    [invoices],
  );

  const sorted = useMemo(
    () => [...invoices].sort((a, b) => dueKey(b).localeCompare(dueKey(a))),
    [invoices],
  );
  const unpaidCount = invoices.filter(isUnpaid).length;

  const q = query.trim().toLowerCase();
  const rows = sorted.filter(
    (i) =>
      (view === "all" ||
        (view === "unpaid" ? isUnpaid(i) : i.status === "paid")) &&
      (year === "all" || i.issuedOn.startsWith(year)) &&
      (!q ||
        i.number.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q)),
  );

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <TableCardHeader>
        <UnderlineTabs<View>
          label="Filter invoices"
          controls={tableId}
          value={view}
          onChange={setView}
          tabs={[
            { value: "all", label: "All invoices" },
            { value: "unpaid", label: "Unpaid", count: unpaidCount },
            { value: "paid", label: "Paid" },
          ]}
        />
        <div className="flex items-center gap-2 sm:my-2">
          <TableSearch
            value={query}
            onChange={setQuery}
            placeholder="Search invoices"
            label="Search invoices by number or description"
          />
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger
              aria-label="Filter by year issued"
              className="h-9 w-auto gap-2 font-medium"
            >
              <CalendarIcon
                className="size-4 text-muted-foreground"
                aria-hidden
              />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="all">All years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>
                  Issued in {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TableCardHeader>

      <Table id={tableId}>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-6">Invoice</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="hidden md:table-cell">Issued</TableHead>
            <TableHead aria-sort="descending" className="hidden sm:table-cell">
              <span className="inline-flex items-center gap-1">
                Due <ArrowDownIcon className="size-3.5" aria-hidden />
              </span>
            </TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="pr-6">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableEmptyRow colSpan={7}>
              {q ? `No invoices match “${query.trim()}”.` : "No invoices here."}
            </TableEmptyRow>
          ) : (
            rows.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="pl-6 text-sm font-medium">
                  {invoice.number}
                </TableCell>
                <TableCell className="w-full max-w-0 min-w-40">
                  <p className="truncate" title={invoice.description}>
                    {invoice.description}
                  </p>
                </TableCell>
                <TableCell className="tabular hidden text-muted-foreground md:table-cell">
                  {fmt.date(invoice.issuedOn)}
                </TableCell>
                <TableCell className="tabular hidden text-muted-foreground sm:table-cell">
                  {invoice.dueOn ? fmt.date(invoice.dueOn) : "—"}
                </TableCell>
                <TableCell className="tabular text-right font-medium">
                  {fmt.currency(invoice.amount)}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge invoice={invoice} today={today} />
                </TableCell>
                <TableCell className="pr-6">
                  <div className="flex items-center justify-end gap-1.5">
                    {pay && isUnpaid(invoice) && (
                      <PayInvoicesButton
                        schoolId={pay.schoolId}
                        invoices={[invoice]}
                        card={pay.card}
                        size="sm"
                      >
                        Pay
                      </PayInvoicesButton>
                    )}
                    <InvoiceDownloadButton number={invoice.number} />
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t px-6 py-3 text-caption text-muted-foreground">
        <span className="tabular">
          {rows.length === invoices.length
            ? `${invoices.length} invoices`
            : `${rows.length} of ${invoices.length} invoices`}
        </span>
        <span>
          Questions about an invoice?{" "}
          <a
            href={externalLinks.site}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-link hover:underline"
          >
            Contact ISLA
          </a>
        </span>
      </div>
    </div>
  );
}
