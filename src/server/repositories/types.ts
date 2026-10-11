import type {
  NetworkOverview,
  PeerFilter,
  RegionStats,
  SchoolComparison,
} from "@/features/analytics/schema"
import type { Invoice, OrgBillingSummary, Plan } from "@/features/billing/schema"
import type { Job, NewJob } from "@/features/jobs/schema"
import type { KnowledgeAnswer, KnowledgeQuestion } from "@/features/knowledge/schema"
import type {
  ProfileSection,
  School,
  SchoolFilter,
  SchoolSummary,
  SectionPatch,
} from "@/features/schools/schema"
import type { Product } from "@/features/store/schema"

/**
 * Data-access contracts. UI and feature code depend on these only.
 * Each adapter (mock, http) implements the full set — see docs/API_MIGRATION.md
 * for the REST endpoint behind every method.
 */

export interface SchoolRepository {
  list(filter: SchoolFilter): Promise<SchoolSummary[]>
  get(id: string): Promise<School | null>
  updateSection<S extends ProfileSection>(id: string, section: S, patch: SectionPatch<S>): Promise<School>
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

export interface Repositories {
  schools: SchoolRepository
  jobs: JobRepository
  billing: BillingRepository
  analytics: AnalyticsRepository
  store: StoreRepository
  knowledge: KnowledgeRepository
}
