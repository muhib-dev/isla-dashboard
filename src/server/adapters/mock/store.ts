import "server-only"
import { z } from "zod"
import { InvoiceSchema, PlanSchema } from "@/features/billing/schema"
import { JobSchema } from "@/features/jobs/schema"
import { SchoolSchema } from "@/features/schools/schema"
import type { SchoolReport } from "@/features/schools/submissions"
import { ProductSchema } from "@/features/store/schema"
import invoices from "@/data/invoices.json"
import jobs from "@/data/jobs.json"
import plans from "@/data/plans.json"
import products from "@/data/products.json"
import schools from "@/data/schools.json"

/**
 * In-memory tables seeded from src/data. Validated with the same schemas the
 * http adapter uses, so the sample data can't drift from the API contract.
 * Lives on globalThis so edits survive dev hot reloads; resets on restart.
 */
function seed() {
  return {
    schools: z.array(SchoolSchema).parse(schools),
    jobs: z.array(JobSchema).parse(jobs),
    plans: z.array(PlanSchema).parse(plans),
    invoices: z.array(InvoiceSchema).parse(invoices),
    products: z.array(ProductSchema).parse(products),
    reports: [] as SchoolReport[],
    /** Contact-form messages relayed to schools (mock: kept in memory, newest first). */
    messages: [] as { id: string; schoolId: string; name: string; email: string; message: string; at: string }[],
  }
}

export type MockTables = ReturnType<typeof seed>

const g = globalThis as typeof globalThis & { __islaMockTables?: MockTables }
export const tables: MockTables = (g.__islaMockTables ??= seed())

export function latency(ms: number) {
  return ms ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve()
}
