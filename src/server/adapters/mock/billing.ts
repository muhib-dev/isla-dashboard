import "server-only"
import type { Invoice } from "@/features/billing/schema"
import type { BillingRepository } from "@/server/repositories/types"
import { latency, tables } from "./store"

export function createMockBillingRepository(latencyMs: number): BillingRepository {
  return {
    async getPlan(schoolId) {
      await latency(latencyMs)
      return tables.plans.find((p) => p.schoolId === schoolId) ?? null
    },

    async updatePlan(schoolId, patch) {
      await latency(latencyMs)
      const plan = tables.plans.find((p) => p.schoolId === schoolId)
      if (!plan) throw new Error(`No plan for ${schoolId}`)
      Object.assign(plan, patch)
      return plan
    },

    async listInvoices(schoolId) {
      await latency(latencyMs)
      return tables.invoices
        .filter((i) => i.schoolId === schoolId)
        .sort((a, b) => b.issuedOn.localeCompare(a.issuedOn))
    },

    async payInvoices(schoolId, ids) {
      await latency(latencyMs)
      const today = new Date().toISOString().slice(0, 10)
      const paid = tables.invoices.filter(
        (i) => i.schoolId === schoolId && ids.includes(i.id) && (i.status === "open" || i.status === "overdue"),
      )
      for (const invoice of paid) Object.assign(invoice, { status: "paid", paidOn: today })
      return paid
    },

    async getOrgSummary() {
      await latency(latencyMs)
      const fiscalStart = "2026-07-01"
      const thisYear = tables.invoices.filter((i) => i.issuedOn >= fiscalStart)
      const sum = (list: Invoice[]) => list.reduce((total, i) => total + i.amount, 0)
      const names = new Map(tables.schools.map((s) => [s.id, s.name]))
      const unpaid = tables.invoices
        .filter((i) => i.status === "open" || i.status === "overdue")
        .map((i) => ({ ...i, schoolName: names.get(i.schoolId) ?? i.schoolId }))
        // Overdue first, then by due date: the most urgent at the top.
        .sort((a, b) =>
          a.status === b.status ? (a.dueOn ?? "").localeCompare(b.dueOn ?? "") : a.status === "overdue" ? -1 : 1,
        )

      return {
        fiscalYear: "FY 2026–27",
        collected: sum(thisYear.filter((i) => i.status === "paid")),
        outstanding: sum(unpaid.filter((i) => i.status === "open")),
        overdue: sum(unpaid.filter((i) => i.status === "overdue")),
        byKind: (["membership", "store", "event"] as const).map((kind) => {
          const paid = tables.invoices.filter((i) => i.kind === kind && i.status === "paid" && i.issuedOn >= "2025-07-01")
          return { kind, amount: sum(paid), count: paid.length }
        }),
        unpaid,
        recentPayments: tables.invoices
          .filter((i) => i.status === "paid" && i.paidOn)
          .sort((a, b) => b.paidOn!.localeCompare(a.paidOn!))
          .slice(0, 8)
          .map((i) => ({ ...i, schoolName: names.get(i.schoolId) ?? i.schoolId })),
        trends: billingTrends(tables.invoices, fiscalStart, new Date()),
      }
    },
  }
}

const DAY = 86_400_000
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10)

/** Paid more than 30 days after the due date counts as having been overdue meanwhile. */
const LATE_DAYS = 30

function billingTrends(invoices: Invoice[], fiscalStart: string, now: Date) {
  const today = isoDay(now.getTime())

  // Revenue: invoices issued this fiscal year, cumulated by the day they were paid.
  const paidThisYear = invoices.filter((i) => i.status === "paid" && i.issuedOn >= fiscalStart)
  const revenueYtd: number[] = []
  for (let t = Date.parse(fiscalStart) + 7 * DAY; ; t += 7 * DAY) {
    const at = t >= now.getTime() ? today : isoDay(t)
    revenueYtd.push(paidThisYear.filter((i) => (i.paidOn ?? i.issuedOn) <= at).reduce((n, i) => n + i.amount, 0))
    if (at === today) break
  }

  // Month-ends for the last 12 months, ending today.
  const monthEnds = Array.from({ length: 12 }, (_, k) => {
    if (k === 11) return today
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 10 + k, 0))
    return isoDay(d.getTime())
  })

  const lateBy = (i: Invoice, at: string) =>
    i.dueOn !== null && Date.parse(at) - Date.parse(i.dueOn) > LATE_DAYS * DAY
  const overdue = monthEnds.map(
    (at) =>
      invoices.filter((i) => {
        if (!i.dueOn || i.dueOn >= at) return false
        if (i.status === "overdue") return true
        return i.status === "paid" && !!i.paidOn && i.paidOn > at && lateBy(i, at)
      }).length,
  )

  // Renewal: of the schools billed in the latest dues cycle before each month-end, the share paid by then.
  const dues = invoices.filter((i) => i.kind === "membership" && i.status !== "refunded")
  const renewalRate = monthEnds.map((at) => {
    const cycle = dues.filter((i) => i.issuedOn <= at).reduce((max, i) => (i.issuedOn > max ? i.issuedOn : max), "")
    const billed = dues.filter((i) => i.issuedOn === cycle)
    if (!billed.length) return 0
    const paid = billed.filter((i) => i.status === "paid" && (i.paidOn ?? i.issuedOn) <= at)
    return paid.length / billed.length
  })

  // Unpaid at each month-end: issued by then and not yet settled by then.
  const unpaidAt = (at: string) =>
    invoices.filter(
      (i) =>
        i.status !== "refunded" &&
        i.issuedOn <= at &&
        (i.status !== "paid" || (i.paidOn ?? i.issuedOn) > at),
    )
  const amount = (list: Invoice[]) => list.reduce((n, i) => n + i.amount, 0)
  const dueAmount = monthEnds.map((at) => amount(unpaidAt(at).filter((i) => !lateBy(i, at))))
  const overdueAmount = monthEnds.map((at) => amount(unpaidAt(at).filter((i) => lateBy(i, at))))
  const schoolsOwing = monthEnds.map((at) => new Set(unpaidAt(at).map((i) => i.schoolId)).size)

  return { revenueYtd, overdue, renewalRate, dueAmount, overdueAmount, schoolsOwing }
}
