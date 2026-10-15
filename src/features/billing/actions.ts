"use server"

import { updateTag } from "next/cache"
import { z } from "zod"
import { repos } from "@/server/repositories"
import { canManageSchool, getSession } from "@/server/session"
import { BILLING_TAG, billingTag } from "./queries"

export async function setAutoRenew(schoolId: string, autoRenew: boolean) {
  const session = await getSession()
  if (!canManageSchool(session, schoolId)) return { ok: false as const, error: "You can't change billing for this school." }
  await repos.billing.updatePlan(schoolId, { autoRenew: z.boolean().parse(autoRenew) })
  updateTag(billingTag(schoolId))
  return { ok: true as const }
}

export async function payInvoices(schoolId: string, ids: string[]) {
  const session = await getSession()
  if (!canManageSchool(session, schoolId)) return { ok: false as const, error: "You can't pay invoices for this school." }
  const parsed = z.array(z.string().min(1)).min(1).max(50).safeParse(ids)
  if (!parsed.success) return { ok: false as const, error: "Pick at least one invoice to pay." }
  const plan = await repos.billing.getPlan(schoolId)
  if (!plan?.paymentMethod) return { ok: false as const, error: "Add a card before paying online." }
  const paid = await repos.billing.payInvoices(schoolId, parsed.data)
  if (paid.length === 0) return { ok: false as const, error: "Those invoices are already paid." }
  updateTag(billingTag(schoolId))
  updateTag(BILLING_TAG)
  return { ok: true as const, count: paid.length, amount: paid.reduce((n, i) => n + i.amount, 0) }
}
