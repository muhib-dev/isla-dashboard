import { ArrowUpRightIcon, CreditCardIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { ToggleRow } from "@/components/shared/field"
import { InvoiceStatusDot, StatusDot } from "@/components/shared/status"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { externalLinks } from "@/config/links"
import { getSchoolBilling } from "@/features/billing/queries"
import { fmt } from "@/lib/format"
import { AutoRenewSwitch, InvoiceDownloadButton, PaymentProviderButton } from "./plan-controls"

const KIND_LABEL = { membership: "Membership", store: "Store", event: "Event" } as const

export async function SchoolBilling({ schoolId }: { schoolId: string }) {
  const { plan, invoices, renewsInDays } = await getSchoolBilling(schoolId)
  const due = invoices.filter((i) => i.status === "open" || i.status === "overdue")

  return (
    <>
      <PageHeader title="Billing" description="Your ISLA membership, payment method and every invoice in one place." />

      {plan ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardDescription>School membership</CardDescription>
              <CardTitle className="text-lg">{plan.tier}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Annual dues</p>
                  <p className="tabular text-2xl font-semibold tracking-tight">{fmt.currency(plan.annualDues)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Renews on</p>
                  <p className="font-medium">{fmt.date(plan.renewsOn)}</p>
                </div>
                {renewsInDays !== null && renewsInDays <= 30 && (
                  <StatusDot tone="warning" className="mb-0.5">
                    In {renewsInDays} days
                  </StatusDot>
                )}
                <Button asChild size="lg" className="ml-auto">
                  <a href={externalLinks.membership} target="_blank" rel="noreferrer">
                    Renew now <ArrowUpRightIcon />
                  </a>
                </Button>
              </div>
              <div className="border-t">
                <ToggleRow id="autoRenew" label="Auto-renew" description="Charge the card on file on the renewal date.">
                  <AutoRenewSwitch schoolId={schoolId} checked={plan.autoRenew} />
                </ToggleRow>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription>Payment method</CardDescription>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCardIcon className="size-4 text-muted-foreground" />
                {plan.paymentMethod ? `${plan.paymentMethod.brand} ending ${plan.paymentMethod.last4}` : "No card on file"}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 text-sm text-muted-foreground">
              {plan.paymentMethod ? `Expires ${plan.paymentMethod.expires}` : "Add a card to turn on auto-renew."}
            </CardContent>
            <CardContent>
              <PaymentProviderButton
                label={plan.paymentMethod ? "Update card" : "Add card"}
                message="This opens the secure payment form once billing is connected."
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">This school isn&apos;t an ISLA member yet.</CardContent>
        </Card>
      )}

      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Billing history</h2>
          <p className="text-sm text-muted-foreground">
            {due.length ? `${due.length} unpaid` : "All paid"} · {invoices.length} invoices
          </p>
        </div>
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="hidden md:table-cell">Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="w-12 pr-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="tabular pl-4 whitespace-nowrap text-muted-foreground">{fmt.date(invoice.issuedOn)}</TableCell>
                  <TableCell className="max-w-[16rem] whitespace-normal">
                    <p>{invoice.description}</p>
                    <p className="text-sm text-muted-foreground">{invoice.number}</p>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{KIND_LABEL[invoice.kind]}</TableCell>
                  <TableCell className="tabular text-right">{fmt.currency(invoice.amount)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <InvoiceStatusDot status={invoice.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <InvoiceDownloadButton number={invoice.number} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  )
}
