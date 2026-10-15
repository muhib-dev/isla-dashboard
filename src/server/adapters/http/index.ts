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
import { ClaimSchema, OfferSchema } from "@/features/offers/schema"
import { SchoolSchema, SchoolSummarySchema } from "@/features/schools/schema"
import { SchoolReportSchema } from "@/features/schools/submissions"
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
      listAll: () => api.get("/schools", z.array(SchoolSchema), { view: "full" }),
      get: (id) => api.find(`/schools/${encodeURIComponent(id)}`, SchoolSchema),
      updateSection: (id, section, patch) =>
        api.patch(`/schools/${encodeURIComponent(id)}/${section}`, SchoolSchema, patch),
      createPending: (input) => api.post("/schools/submissions", SchoolSchema, input),
      submitReport: (input) => api.post("/schools/reports", SchoolReportSchema, input),
      listReports: () => api.get("/schools/reports", z.array(SchoolReportSchema)),
      resolveReport: (id, decision) => api.post(`/schools/reports/${encodeURIComponent(id)}/resolve`, SchoolReportSchema, { decision }),
      sendContactMessage: async (schoolId, message) => {
        await api.post(`/schools/${encodeURIComponent(schoolId)}/contact`, z.unknown(), message)
      },
      setGeo: (id, geo) => api.put(`/schools/${encodeURIComponent(id)}/geo`, SchoolSchema, geo),
      requestUpdate: (ids) => api.post("/schools/update-requests", z.object({ sent: z.number() }), { ids }),
    },
    jobs: {
      listBySchool: (schoolId) => api.get(`/schools/${encodeURIComponent(schoolId)}/jobs`, z.array(JobSchema)),
      listPublished: () => api.get("/jobs", z.array(JobSchema), { status: "open,filled,closed" }),
      create: (schoolId, job) => api.post(`/schools/${encodeURIComponent(schoolId)}/jobs`, JobSchema, job),
      setStatus: (id, status) => api.patch(`/jobs/${encodeURIComponent(id)}`, JobSchema, { status }),
    },
    billing: {
      getPlan: (schoolId) => api.find(`/schools/${encodeURIComponent(schoolId)}/plan`, PlanSchema),
      updatePlan: (schoolId, patch) => api.patch(`/schools/${encodeURIComponent(schoolId)}/plan`, PlanSchema, patch),
      listInvoices: (schoolId) => api.get(`/schools/${encodeURIComponent(schoolId)}/invoices`, z.array(InvoiceSchema)),
      getOrgSummary: () => api.get("/billing/summary", OrgBillingSummarySchema),
      payInvoices: (schoolId, ids) =>
        api.post(`/schools/${encodeURIComponent(schoolId)}/invoices/pay`, z.array(InvoiceSchema), { ids }),
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
    offers: {
      listOffers: () => api.get("/offers", z.array(OfferSchema)),
      getOffer: (id) => api.find(`/offers/${encodeURIComponent(id)}`, OfferSchema),
      createOffer: (input) => api.post("/offers", OfferSchema, input),
      updateOffer: (id, input) => api.put(`/offers/${encodeURIComponent(id)}`, OfferSchema, input),
      patchOffer: (id, patch) => api.patch(`/offers/${encodeURIComponent(id)}`, OfferSchema, patch),
      listClaims: (filter) => api.get("/offers/claims", z.array(ClaimSchema), filter),
      claim: (offerId, input) => api.post(`/offers/${encodeURIComponent(offerId)}/claims`, ClaimSchema, input),
      setClaimStatus: (id, status) =>
        api.patch(`/offers/claims/${encodeURIComponent(id)}`, ClaimSchema, { status }),
    },
  }
}
