import "server-only"
import { z } from "zod"
import {
  NetworkOverviewSchema,
  RegionStatsSchema,
  SchoolComparisonSchema,
} from "@/features/analytics/schema"
import { InvoiceSchema, OrgBillingSummarySchema, PlanSchema } from "@/features/billing/schema"
import { JobSchema } from "@/features/jobs/schema"
import { KnowledgeAnswerSchema } from "@/features/knowledge/schema"
import { SchoolSchema, SchoolSummarySchema } from "@/features/schools/schema"
import { ProductSchema } from "@/features/store/schema"
import type { Repositories } from "@/server/repositories/types"
import { createHttpClient, type HttpClientOptions } from "./client"

/**
 * REST implementation of every repository. Endpoint shapes are documented in
 * docs/API_MIGRATION.md; adjust paths here if the backend differs.
 */
export function createHttpRepositories(options: HttpClientOptions): Repositories {
  const api = createHttpClient(options)

  return {
    schools: {
      list: (filter) => api.get("/schools", z.array(SchoolSummarySchema), filter),
      get: (id) => api.find(`/schools/${encodeURIComponent(id)}`, SchoolSchema),
      updateSection: (id, section, patch) =>
        api.patch(`/schools/${encodeURIComponent(id)}/${section}`, SchoolSchema, patch),
      requestUpdate: (ids) => api.post("/schools/update-requests", z.object({ sent: z.number() }), { ids }),
    },
    jobs: {
      listBySchool: (schoolId) => api.get(`/schools/${encodeURIComponent(schoolId)}/jobs`, z.array(JobSchema)),
      listOpen: () => api.get("/jobs", z.array(JobSchema), { status: "open" }),
      create: (schoolId, job) => api.post(`/schools/${encodeURIComponent(schoolId)}/jobs`, JobSchema, job),
    },
    billing: {
      getPlan: (schoolId) => api.find(`/schools/${encodeURIComponent(schoolId)}/plan`, PlanSchema),
      updatePlan: (schoolId, patch) => api.patch(`/schools/${encodeURIComponent(schoolId)}/plan`, PlanSchema, patch),
      listInvoices: (schoolId) => api.get(`/schools/${encodeURIComponent(schoolId)}/invoices`, z.array(InvoiceSchema)),
      getOrgSummary: () => api.get("/billing/summary", OrgBillingSummarySchema),
    },
    analytics: {
      compare: (schoolId, peers) =>
        api.get(`/analytics/schools/${encodeURIComponent(schoolId)}/compare`, SchoolComparisonSchema, peers),
      regionStats: () => api.get("/analytics/regions", z.array(RegionStatsSchema)),
      overview: () => api.get("/analytics/overview", NetworkOverviewSchema),
    },
    store: {
      listProducts: () => api.get("/store/products", z.array(ProductSchema)),
    },
    knowledge: {
      ask: (input) => api.post("/knowledge/ask", KnowledgeAnswerSchema, input),
    },
  }
}
