import type {
  NetworkOverview,
  PeerFilter,
  RegionStats,
  SchoolComparison,
} from "@/features/analytics/schema"
import type { Invoice, OrgBillingSummary, Plan } from "@/features/billing/schema"
import type { Job, NewJob } from "@/features/jobs/schema"
import type { KnowledgeAnswer, KnowledgeQuestion } from "@/features/knowledge/schema"
import type { Claim, ClaimInput, ClaimStatus, Offer, OfferInput, OfferStatus } from "@/features/offers/schema"
import type {
  Geo,
  ProfileSection,
  School,
  SchoolFilter,
  SchoolSummary,
  SectionPatch,
} from "@/features/schools/schema"
import type { Product } from "@/features/store/schema"
import type { ContactMessage, NewReport, NewSchool, ReportDecision, SchoolReport } from "@/features/schools/submissions"

/**
 * Data-access contracts. UI and feature code depend on these only.
 * Each adapter (mock, http) implements the full set — see docs/API_MIGRATION.md
 * for the REST endpoint behind every method.
 */

export interface SchoolRepository {
  list(filter: SchoolFilter): Promise<SchoolSummary[]>
  /** Every school with full profile data; feeds the directory search index. */
  listAll(): Promise<School[]>
  get(id: string): Promise<School | null>
  updateSection<S extends ProfileSection>(id: string, section: S, patch: SectionPatch<S>): Promise<School>
  /** Stores the geocoded location for a school (or clears it with null). */
  setGeo(id: string, geo: Geo | null): Promise<School>
  /** New public submission: stored as a pending listing that staff review. */
  createPending(input: Omit<NewSchool, "hp" | "submitterEmail">): Promise<School>
  submitReport(input: Omit<NewReport, "hp" | "kind"> & { schoolId?: string; kind: SchoolReport["kind"] }): Promise<SchoolReport>
  listReports(): Promise<SchoolReport[]>
  /** Approving a "new" report opens the listing; approving "closed" closes it. */
  resolveReport(id: string, decision: ReportDecision): Promise<SchoolReport>
  /** Relays a message to the school. The school's email never leaves the server. */
  sendContactMessage(schoolId: string, message: Omit<ContactMessage, "hp">): Promise<void>
  /** Ask a school to review its profile (e.g. emails the school's admins). */
  requestUpdate(ids: string[]): Promise<{ sent: number }>
}

export interface JobRepository {
  listBySchool(schoolId: string): Promise<Job[]>
  listOpen(): Promise<Job[]>
  create(schoolId: string, job: NewJob): Promise<Job>
}

export interface BillingRepository {
  getPlan(schoolId: string): Promise<Plan | null>
  updatePlan(schoolId: string, patch: Pick<Plan, "autoRenew">): Promise<Plan>
  listInvoices(schoolId: string): Promise<Invoice[]>
  getOrgSummary(): Promise<OrgBillingSummary>
}

export interface AnalyticsRepository {
  compare(schoolId: string, peers: PeerFilter): Promise<SchoolComparison>
  regionStats(): Promise<RegionStats[]>
  overview(): Promise<NetworkOverview>
}

export interface StoreRepository {
  listProducts(): Promise<Product[]>
}

export interface KnowledgeRepository {
  ask(input: KnowledgeQuestion): Promise<KnowledgeAnswer>
}

export interface OfferRepository {
  listOffers(): Promise<Offer[]>
  getOffer(id: string): Promise<Offer | null>
  /** New offers start as drafts; staff publish them with `patchOffer`. */
  createOffer(input: OfferInput): Promise<Offer>
  updateOffer(id: string, input: OfferInput): Promise<Offer>
  patchOffer(id: string, patch: Partial<{ status: OfferStatus; featured: boolean }>): Promise<Offer>
  listClaims(filter: { schoolId?: string; offerId?: string }): Promise<Claim[]>
  /**
   * Records a claim. `schoolId` is null for anonymous claims from the public page.
   * Claiming twice (same school, or same email when anonymous) returns the existing claim.
   */
  claim(offerId: string, input: ClaimInput): Promise<Claim>
  setClaimStatus(id: string, status: ClaimStatus): Promise<Claim>
}

export interface Repositories {
  schools: SchoolRepository
  jobs: JobRepository
  billing: BillingRepository
  analytics: AnalyticsRepository
  store: StoreRepository
  knowledge: KnowledgeRepository
  offers: OfferRepository
}
