import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Stat, StatGroup } from "@/components/shared/stat";
import { InvoiceStatusDot } from "@/components/shared/status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getOrgBilling } from "@/features/billing/queries";
import { fmt } from "@/lib/format";
import { PaymentProviderButton } from "./plan-controls";

const KIND_LABEL = {
  membership: "Membership dues",
  store: "Store",
  event: "Events",
} as const;

export async function OrgBilling() {
  const summary = await getOrgBilling();
  const max = Math.max(...summary.byKind.map((k) => k.amount), 1);
  const total = summary.byKind.reduce((n, k) => n + k.amount, 0);

  return (
    <>
      <PageHeader
        title="Billing"
        description={`Dues, store orders and event fees for ${summary.fiscalYear}.`}
        actions={
          summary.unpaid.length > 0 && (
            <PaymentProviderButton
              label="Send reminders"
              message={`Reminder emails would go to ${summary.unpaid.length} schools.`}
            />
          )
        }
      />

      <StatGroup columns={3}>
        <Stat
          label="Collected this year"
          value={fmt.compactCurrency(summary.collected)}
        />
        <Stat
          label="Due"
          value={fmt.compactCurrency(summary.outstanding)}
          hint="Within grace period"
        />
        <Stat label="Overdue" value={fmt.compactCurrency(summary.overdue)} />
      </StatGroup>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="py-0 lg:col-span-2">
          <CardHeader className="border-b py-4">
            <CardTitle>Unpaid invoices</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">School</TableHead>
                <TableHead className="hidden sm:table-cell">Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="pr-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.unpaid.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="pl-4">
                    <Link
                      href={`/schools/${invoice.schoolId}`}
                      className="font-medium hover:underline"
                    >
                      {invoice.schoolName}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {invoice.number}
                    </p>
                  </TableCell>
                  <TableCell className="tabular hidden text-muted-foreground sm:table-cell">
                    {invoice.dueOn ? fmt.date(invoice.dueOn) : "—"}
                  </TableCell>
                  <TableCell className="tabular text-right">
                    {fmt.currency(invoice.amount)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <InvoiceStatusDot status={invoice.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by source</CardTitle>
            <CardDescription>
              Paid invoices since July 2025 · {fmt.currency(total)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary.byKind.map((k) => (
              <div key={k.kind} className="space-y-1.5">
                <div className="flex items-baseline justify-between text-sm">
                  <span>{KIND_LABEL[k.kind]}</span>
                  <span className="tabular text-muted-foreground">
                    {fmt.currency(k.amount)}
                  </span>
                </div>
                <div
                  className="h-3 rounded-r-lg border-[1.5px] border-chart-1 bg-chart-1/35"
                  style={{ width: `${(k.amount / max) * 100}%` }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
