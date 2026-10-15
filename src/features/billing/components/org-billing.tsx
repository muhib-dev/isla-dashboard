import { connection } from "next/server";
import { MailIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  KpiGrid,
  KpiTile,
  Sparkline,
  type KpiDelta,
} from "@/components/shared/kpi-tile";
import { getOrgBilling } from "@/features/billing/queries";
import { fmt } from "@/lib/format";
import { isoToday } from "./invoice-status";
import { PaymentProviderButton } from "./plan-controls";
import { RevenueBySource } from "./revenue-by-source";
import { UnpaidInvoicesTable } from "./unpaid-invoices-table";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * Change over the last month of a month-end series (last point vs the one before).
 * `upIsGood` sets the tone: more revenue is good, more overdue is bad.
 */
function monthDelta(
  series: number[] | undefined,
  upIsGood: boolean,
  format: (n: number) => string,
): KpiDelta | undefined {
  if (!series || series.length < 2) return undefined;
  const diff = series.at(-1)! - series.at(-2)!;
  if (diff === 0)
    return { label: "No change", direction: "flat", tone: "neutral" };
  return {
    label: format(Math.abs(diff)),
    direction: diff > 0 ? "up" : "down",
    tone: diff > 0 === upIsGood ? "good" : "bad",
    srLabel: `${diff > 0 ? "up" : "down"} ${format(Math.abs(diff))} on last month`,
  };
}

export async function OrgBilling() {
  const summary = await getOrgBilling();
  // Cache Components: opt out of prerendering before reading the clock.
  await connection();
  const today = isoToday();
  const trends = summary.trends;

  // Tile counts follow the same status split as the summary amounts.
  const overdueCount = summary.unpaid.filter(
    (i) => i.status === "overdue",
  ).length;
  const due = summary.unpaid.length - overdueCount;
  const schoolsOwing = new Set(summary.unpaid.map((i) => i.schoolId)).size;

  return (
    <>
      <PageHeader
        title="Billing"
        description={`Dues, store orders and event fees across the network for ${summary.fiscalYear}.`}
        actions={
          summary.unpaid.length > 0 && (
            <PaymentProviderButton
              icon={<MailIcon />}
              label="Send reminders"
              message={`Reminder emails would go to ${plural(schoolsOwing, "school")}.`}
            />
          )
        }
      />

      <KpiGrid>
        <KpiTile
          label="Collected this year"
          info="Paid invoices issued since the fiscal year began on July 1, cumulative by week."
          value={fmt.compactCurrency(summary.collected)}
          footer={<span>Paid invoices · {summary.fiscalYear}</span>}
        >
          {trends && <Sparkline values={trends.revenueYtd} />}
        </KpiTile>
        <KpiTile
          label="Due"
          info="Unpaid and still within the grace period. Trend: month-end totals over the last year."
          value={fmt.compactCurrency(summary.outstanding)}
          delta={monthDelta(trends?.dueAmount, false, fmt.compactCurrency)}
          footer={
            <span className="tabular">
              {plural(due, "invoice")} · within grace period
            </span>
          }
        >
          {trends?.dueAmount && <Sparkline values={trends.dueAmount} />}
        </KpiTile>
        <KpiTile
          label="Overdue"
          info="Unpaid past the grace period. Trend: month-end totals over the last year."
          value={
            <span
              className={summary.overdue > 0 ? "text-destructive" : undefined}
            >
              {fmt.compactCurrency(summary.overdue)}
            </span>
          }
          delta={monthDelta(trends?.overdueAmount, false, fmt.compactCurrency)}
          footer={
            <span className="tabular">{plural(overdueCount, "invoice")}</span>
          }
        >
          {trends?.overdueAmount && <Sparkline values={trends.overdueAmount} />}
        </KpiTile>
        <KpiTile
          label="Schools with unpaid invoices"
          value={fmt.number(schoolsOwing)}
          delta={monthDelta(trends?.schoolsOwing, false, (n) => String(n))}
          footer={
            <span className="tabular">
              {plural(summary.unpaid.length, "open invoice")}
            </span>
          }
        >
          {trends?.schoolsOwing && <Sparkline values={trends.schoolsOwing} />}
        </KpiTile>
      </KpiGrid>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <UnpaidInvoicesTable invoices={summary.unpaid} today={today} />
        <RevenueBySource byKind={summary.byKind} since="July 2025" />
      </div>
    </>
  );
}
