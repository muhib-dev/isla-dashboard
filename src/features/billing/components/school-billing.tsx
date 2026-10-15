import { connection } from "next/server";
import {
  ArrowUpRightIcon,
  CircleAlertIcon,
  CreditCardIcon,
  LandmarkIcon,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { KpiGrid, KpiTile, Sparkline } from "@/components/shared/kpi-tile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { externalLinks } from "@/config/links";
import { getSchoolBilling } from "@/features/billing/queries";
import type { Invoice, Plan } from "@/features/billing/schema";
import { getSchool } from "@/features/schools/queries";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { daysUntil, isOverdue, isoToday, isUnpaid } from "./invoice-status";
import { InvoicesTable } from "./invoices-table";
import {
  AutoRenewSwitch,
  PayInvoicesButton,
  PaymentProviderButton,
} from "./plan-controls";

const BRAND_CHIP: Record<string, string> = {
  Visa: "VISA",
  Mastercard: "MC",
  Amex: "AMEX",
};

const sum = (list: Invoice[]) => list.reduce((n, i) => n + i.amount, 0);
const paidDate = (i: Invoice) => i.paidOn ?? i.issuedOn;

/** Cumulative amount paid by the end of each month of `year`, up to `today`'s month. */
function paidByMonth(invoices: Invoice[], year: string, today: string) {
  const months = year === today.slice(0, 4) ? Number(today.slice(5, 7)) : 12;
  return Array.from({ length: months }, (_, m) => {
    const end = `${year}-${String(m + 1).padStart(2, "0")}-31`;
    return sum(
      invoices.filter(
        (i) => paidDate(i).startsWith(year) && paidDate(i) <= end,
      ),
    );
  });
}
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export async function SchoolBilling({ schoolId }: { schoolId: string }) {
  const [{ plan, invoices, renewsInDays }, school] = await Promise.all([
    getSchoolBilling(schoolId),
    getSchool(schoolId),
  ]);
  // Cache Components: opt out of prerendering before reading the clock.
  await connection();
  const today = isoToday();
  const year = today.slice(0, 4);

  const unpaid = invoices.filter(isUnpaid);
  const overdue = unpaid
    .filter((i) => isOverdue(i))
    .sort((a, b) => (a.dueOn ?? "").localeCompare(b.dueOn ?? ""));
  const card = plan?.paymentMethod ?? null;
  const payable = (list: Invoice[]) =>
    list.map(({ id, number, amount }) => ({ id, number, amount }));
  const paidThisYear = invoices.filter(
    (i) => i.status === "paid" && i.issuedOn.startsWith(year),
  );
  const paid = invoices.filter((i) => i.status === "paid");
  const lastYear = String(Number(year) - 1);
  // Same point last year, for a like-for-like comparison.
  const paidLastYearToDate = sum(
    paid.filter(
      (i) =>
        paidDate(i).startsWith(lastYear) &&
        paidDate(i).slice(5) <= today.slice(5),
    ),
  );

  return (
    <>
      <PageHeader
        title="Billing"
        description={
          school
            ? `Invoices and payments for ${school.name}.`
            : "Invoices and payments for your school."
        }
        actions={
          <>
            <PaymentProviderButton
              icon={<CreditCardIcon />}
              label="Payment methods"
              message="This opens the secure payment form once billing is connected."
            />
            {unpaid.length > 0 ? (
              <PayInvoicesButton
                schoolId={schoolId}
                invoices={payable(unpaid)}
                card={card}
              >
                Pay {fmt.currency(sum(unpaid))}
              </PayInvoicesButton>
            ) : (
              plan && (
                <Button asChild>
                  <a
                    href={externalLinks.membership}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Renew now <ArrowUpRightIcon />
                  </a>
                </Button>
              )
            )}
          </>
        }
      />

      {overdue.length > 0 && (
        <OverdueAlert
          overdue={overdue}
          action={
            <PayInvoicesButton
              schoolId={schoolId}
              invoices={payable(overdue)}
              card={card}
              variant="destructive"
              size="sm"
              className="shrink-0"
            >
              Pay now
            </PayInvoicesButton>
          }
        />
      )}

      <KpiGrid>
        <OutstandingTile unpaid={unpaid} overdue={overdue} />
        <KpiTile
          label={`Paid in ${year}`}
          value={fmt.currency(sum(paidThisYear))}
          footer={
            <>
              <span className="tabular">
                {plural(paidThisYear.length, "invoice")}
              </span>
              {paidLastYearToDate > 0 && (
                <span className="tabular">
                  {fmt.currency(paidLastYearToDate)} by now in {lastYear}
                </span>
              )}
            </>
          }
        >
          <Sparkline values={paidByMonth(paid, year, today)} />
        </KpiTile>
        {plan ? (
          <>
            <RenewalTile
              plan={plan}
              schoolId={schoolId}
              renewsInDays={renewsInDays}
            />
            <PaymentTile plan={plan} />
          </>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-lg border bg-card px-5 py-4 sm:col-span-2">
            <div className="grid size-14 place-items-center rounded-lg border bg-surface-2">
              <LandmarkIcon
                className="size-7 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden
              />
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold">Not an ISLA member yet</p>
              <p className="text-[15px] text-muted-foreground">
                Membership renewals and dues will show here once you join.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <a
                href={externalLinks.membership}
                target="_blank"
                rel="noreferrer"
              >
                About membership <ArrowUpRightIcon />
              </a>
            </Button>
          </div>
        )}
      </KpiGrid>

      <InvoicesTable
        invoices={invoices}
        today={today}
        pay={{ schoolId, card }}
      />
    </>
  );
}

function OverdueAlert({
  overdue,
  action,
}: {
  overdue: Invoice[];
  action?: React.ReactNode;
}) {
  const first = overdue[0];
  const detail =
    overdue.length === 1
      ? `${first.number} for ${fmt.currency(first.amount)} was due${first.dueOn ? ` on ${fmt.date(first.dueOn)}` : ""}.`
      : `${fmt.currency(sum(overdue))} is past due, oldest since ${first.dueOn ? fmt.date(first.dueOn) : "issue"}.`;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[color-mix(in_oklch,var(--destructive)_25%,var(--border))] bg-destructive-subtle px-4 py-3">
      <CircleAlertIcon
        className="size-5 shrink-0 self-start text-destructive sm:self-center"
        aria-hidden
      />
      <p className="min-w-0 flex-1 text-[15px]">
        <span className="font-semibold">
          {overdue.length === 1
            ? "1 invoice is overdue."
            : `${overdue.length} invoices are overdue.`}
        </span>{" "}
        <span className="text-muted-foreground">
          {detail} Membership benefits pause if dues stay unpaid.
        </span>
      </p>
      {action}
    </div>
  );
}

function OutstandingTile({
  unpaid,
  overdue,
}: {
  unpaid: Invoice[];
  overdue: Invoice[];
}) {
  const total = sum(unpaid);
  const late = sum(overdue);
  const due = total - late;
  return (
    <KpiTile
      label="Outstanding"
      value={
        <span className={cn(late > 0 && "text-destructive")}>
          {fmt.currency(total)}
        </span>
      }
      footer={
        <span className="tabular">
          {unpaid.length
            ? plural(unpaid.length, "unpaid invoice")
            : "Nothing to pay"}
        </span>
      }
    >
      {total > 0 ? (
        <div className="space-y-2">
          <div
            className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${fmt.currency(late)} overdue, ${fmt.currency(due)} due`}
          >
            {late > 0 && (
              <span className="bg-destructive" style={{ flexGrow: late }} />
            )}
            {due > 0 && (
              <span className="bg-warning" style={{ flexGrow: due }} />
            )}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
            <li className="inline-flex items-center gap-1.5">
              <span
                className="size-2 rounded-full bg-destructive"
                aria-hidden
              />
              Overdue{" "}
              <span className="tabular font-medium text-foreground">
                {fmt.currency(late)}
              </span>
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-warning" aria-hidden />
              Due{" "}
              <span className="tabular font-medium text-foreground">
                {fmt.currency(due)}
              </span>
            </li>
          </ul>
        </div>
      ) : (
        <p className="text-[15px] font-medium text-success">All paid up</p>
      )}
    </KpiTile>
  );
}

function RenewalTile({
  plan,
  schoolId,
  renewsInDays,
}: {
  plan: Plan;
  schoolId: string;
  renewsInDays: number | null;
}) {
  const soon = renewsInDays !== null && renewsInDays >= 0 && renewsInDays <= 30;
  // Share of the current membership year already used (it runs for 12 months up to renewsOn).
  const end = Date.parse(plan.renewsOn);
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  const elapsed = Math.min(
    1,
    Math.max(0, (Date.now() - start.getTime()) / (end - start.getTime())),
  );
  return (
    <KpiTile
      label="Next renewal"
      value={fmt.date(plan.renewsOn)}
      footer={
        <>
          <Label htmlFor="autoRenew" className="text-caption font-normal">
            Auto-renew
          </Label>
          <AutoRenewSwitch schoolId={schoolId} checked={plan.autoRenew} />
        </>
      }
    >
      <div className="space-y-1.5">
        <p className="flex justify-between gap-2 text-[13px] text-muted-foreground">
          <span>Membership year</span>
          {renewsInDays !== null && renewsInDays >= 0 && (
            <span className={cn("tabular", soon && "font-medium text-warning")}>
              {renewsInDays === 0
                ? "Renews today"
                : `${plural(renewsInDays, "day")} left`}
            </span>
          )}
        </p>
        <div
          className="h-2 overflow-hidden rounded-full bg-muted"
          role="img"
          aria-label={`${fmt.percent(elapsed)} of the membership year used`}
        >
          <div
            className={cn(
              "h-full rounded-full",
              soon ? "bg-warning" : "bg-chart-1",
            )}
            style={{ width: `${elapsed * 100}%` }}
          />
        </div>
        <p className="truncate text-[13px] text-muted-foreground">
          {plan.tier} ·{" "}
          <span className="tabular">{fmt.currency(plan.annualDues)}</span>/yr
        </p>
      </div>
    </KpiTile>
  );
}

/** "08/29" → days until the end of that month, measured from today. */
function daysToExpiry(expires: string, today: string) {
  const m = /^(\d{2})\/(\d{2})$/.exec(expires);
  if (!m) return null;
  const last = new Date(Date.UTC(2000 + Number(m[2]), Number(m[1]), 0));
  return daysUntil(last.toISOString().slice(0, 10), today);
}

function PaymentTile({ plan }: { plan: Plan }) {
  const card = plan.paymentMethod;
  const expiresIn = card ? daysToExpiry(card.expires, isoToday()) : null;
  const expiring = expiresIn !== null && expiresIn <= 90;
  return (
    <KpiTile
      label="Default payment"
      value={
        card ? (
          <span className="sr-only">
            {card.brand} ending {card.last4}
          </span>
        ) : (
          <span className="text-muted-foreground">No card</span>
        )
      }
      footer={
        card ? (
          <>
            <span
              className={cn("tabular", expiring && "font-medium text-warning")}
            >
              {expiresIn !== null && expiresIn < 0
                ? `Expired ${card.expires}`
                : `Expires ${card.expires}`}
              {expiring && expiresIn! >= 0 && " · update soon"}
            </span>
            <span>{card.brand}</span>
          </>
        ) : (
          <span>Add a card to turn on auto-renew.</span>
        )
      }
    >
      {card && (
        <div
          className="flex h-19 flex-col justify-between rounded-md bg-[linear-gradient(135deg,var(--brand-800),var(--brand-600))] px-3.5 py-2.5 text-brand-foreground"
          aria-hidden
        >
          <div className="flex items-center justify-between">
            <span className="h-4 w-6 rounded-[3px] bg-[color-mix(in_oklch,var(--highlight)_80%,white)]" />
            <span className="text-[13px] font-semibold tracking-wide">
              {BRAND_CHIP[card.brand] ?? card.brand.slice(0, 4).toUpperCase()}
            </span>
          </div>
          <span className="tabular text-[17px] font-medium tracking-[0.12em]">
            •••• {card.last4}
          </span>
        </div>
      )}
    </KpiTile>
  );
}
