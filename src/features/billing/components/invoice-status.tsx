import { Badge } from "@/components/ui/badge";
import type { Invoice } from "@/features/billing/schema";

const DAY = 86_400_000;

/** Days after the due date that a school keeps member benefits before it lapses. */
export const GRACE_DAYS = 45;

/** Whole days from `today` to `dueOn` (negative once past due). Both are ISO dates. */
export function daysUntil(dueOn: string | null, today: string) {
  if (!dueOn) return null;
  return Math.round((Date.parse(dueOn) - Date.parse(today)) / DAY);
}

export const isUnpaid = (invoice: Pick<Invoice, "status">) =>
  invoice.status === "open" || invoice.status === "overdue";

/**
 * Follows the billing system's status, so tiles, tabs and badges agree. An open invoice
 * past its due date is still in its grace period, not overdue.
 */
export const isOverdue = (invoice: Pick<Invoice, "status">) =>
  invoice.status === "overdue";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Status badge with the due date spelled out: "Due in 3 days", "Overdue · 44 days". */
export function InvoiceStatusBadge({
  invoice,
  today,
}: {
  invoice: Pick<Invoice, "status" | "dueOn">;
  today: string;
}) {
  if (invoice.status === "paid") return <Badge variant="success">Paid</Badge>;
  if (invoice.status === "refunded")
    return <Badge variant="secondary">Refunded</Badge>;

  const days = daysUntil(invoice.dueOn, today);
  if (isOverdue(invoice))
    return (
      <Badge variant="destructive">
        {days !== null && days < 0
          ? `Overdue · ${plural(-days, "day")}`
          : "Overdue"}
      </Badge>
    );
  if (days !== null && days < 0)
    return (
      <Badge variant="warning">
        Grace · {plural(Math.max(0, GRACE_DAYS + days), "day")} left
      </Badge>
    );
  return (
    <Badge variant="warning">
      {days === null
        ? "Due"
        : days === 0
          ? "Due today"
          : `Due in ${plural(days, "day")}`}
    </Badge>
  );
}

/** Today as an ISO date (UTC), matching how invoice dates are stored. */
export const isoToday = () => new Date().toISOString().slice(0, 10);
