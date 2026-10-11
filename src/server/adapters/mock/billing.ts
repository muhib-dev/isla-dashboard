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

    async getOrgSummary() {
      await latency(latencyMs)
      const fiscalStart = "2026-07-01"
      const thisYear = tables.invoices.filter((i) => i.issuedOn >= fiscalStart)
      const sum = (list: Invoice[]) => list.reduce((total, i) => total + i.amount, 0)
      const names = new Map(tables.schools.map((s) => [s.id, s.name]))
      const unpaid = tables.invoices
        .filter((i) => i.status === "open" || i.status === "overdue")
        .map((i) => ({ ...i, schoolName: names.get(i.schoolId) ?? i.schoolId }))
        .sort((a, b) => (a.status === b.status ? b.amount - a.amount : a.status === "overdue" ? -1 : 1))

      return {
        fiscalYear: "FY 2026–27",
        collected: sum(thisYear.filter((i) => i.status === "paid")),
        outstanding: sum(unpaid.filter((i) => i.status === "open")),
        overdue: sum(unpaid.filter((i) => i.status === "overdue")),
        byKind: (["membership", "store", "event"] as const).map((kind) => ({
          kind,
          amount: sum(tables.invoices.filter((i) => i.kind === kind && i.status === "paid" && i.issuedOn >= "2025-07-01")),
        })),
        unpaid,
      }
    },
  }
}
