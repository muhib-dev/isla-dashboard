import "server-only"
import type { Repositories } from "@/server/repositories/types"
import { createMockAnalyticsRepository } from "./analytics"
import { createMockBillingRepository } from "./billing"
import { createMockStoreRepository } from "./catalog"
import { createMockJobRepository } from "./jobs"
import { createMockKnowledgeRepository } from "./knowledge"
import { createMockSchoolRepository } from "./schools"

export function createMockRepositories({ latencyMs }: { latencyMs: number }): Repositories {
  return {
    schools: createMockSchoolRepository(latencyMs),
    jobs: createMockJobRepository(latencyMs),
    billing: createMockBillingRepository(latencyMs),
    analytics: createMockAnalyticsRepository(latencyMs),
    store: createMockStoreRepository(latencyMs),
    knowledge: createMockKnowledgeRepository(latencyMs),
  }
}
