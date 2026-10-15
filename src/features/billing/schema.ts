import { z } from "zod"

export const InvoiceStatusSchema = z.enum(["paid", "open", "overdue", "refunded"])
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>

export const InvoiceSchema = z.object({
  id: z.string(),
  number: z.string(),
  schoolId: z.string(),
  issuedOn: z.iso.date(),
  dueOn: z.iso.date().nullable(),
  kind: z.enum(["membership", "store", "event"]),
  description: z.string(),
  amount: z.number().nonnegative(),
  status: InvoiceStatusSchema,
  /** When a paid invoice was settled. Optional: older records and some backends omit it. */
  paidOn: z.iso.date().nullable().optional(),
})
export type Invoice = z.infer<typeof InvoiceSchema>

export const PlanSchema = z.object({
  schoolId: z.string(),
  tier: z.string(),
  annualDues: z.number().nonnegative(),
  renewsOn: z.iso.date(),
  autoRenew: z.boolean(),
  paymentMethod: z
    .object({ brand: z.string(), last4: z.string().length(4), expires: z.string() })
    .nullable(),
})
export type Plan = z.infer<typeof PlanSchema>

export const OrgBillingSummarySchema = z.object({
  fiscalYear: z.string(),
  collected: z.number(),
  outstanding: z.number(),
  overdue: z.number(),
  byKind: z.array(
    z.object({
      kind: InvoiceSchema.shape.kind,
      amount: z.number(),
      /** Paid invoices behind the amount. Optional so backends can omit it. */
      count: z.number().int().optional(),
    }),
  ),
  unpaid: z.array(InvoiceSchema.extend({ schoolName: z.string() })),
  /** Latest settled invoices, newest first, for activity feeds. Optional so backends can omit it. */
  recentPayments: z.array(InvoiceSchema.extend({ schoolName: z.string() })).optional(),
  /** Oldest → newest series for the home KPI sparklines. Optional so backends can omit it. */
  trends: z
    .object({
      /** Cumulative paid revenue this fiscal year, one point per week. */
      revenueYtd: z.array(z.number()),
      /** Overdue invoice count at each of the last 12 month-ends. */
      overdue: z.array(z.number()),
      /** Share of member schools paid up on their latest dues, at each of the last 12 month-ends. */
      renewalRate: z.array(z.number()),
      /** Unpaid amount still within its grace window, at each of the last 12 month-ends. */
      dueAmount: z.array(z.number()).optional(),
      /** Unpaid amount past its grace window, at each of the last 12 month-ends. */
      overdueAmount: z.array(z.number()).optional(),
      /** Schools with at least one unpaid invoice, at each of the last 12 month-ends. */
      schoolsOwing: z.array(z.number()).optional(),
    })
    .optional(),
})
export type OrgBillingSummary = z.infer<typeof OrgBillingSummarySchema>
