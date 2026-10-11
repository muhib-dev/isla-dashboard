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
  byKind: z.array(z.object({ kind: InvoiceSchema.shape.kind, amount: z.number() })),
  unpaid: z.array(InvoiceSchema.extend({ schoolName: z.string() })),
})
export type OrgBillingSummary = z.infer<typeof OrgBillingSummarySchema>
