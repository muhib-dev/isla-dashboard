import "server-only"
import type { JobRepository } from "@/server/repositories/types"
import { latency, tables } from "./store"

const byNewest = (a: { postedOn: string }, b: { postedOn: string }) => b.postedOn.localeCompare(a.postedOn)

export function createMockJobRepository(latencyMs: number): JobRepository {
  return {
    async listBySchool(schoolId) {
      await latency(latencyMs)
      return tables.jobs.filter((j) => j.schoolId === schoolId).sort(byNewest)
    },

    async listOpen() {
      await latency(latencyMs)
      return tables.jobs.filter((j) => j.status === "open").sort(byNewest)
    },

    async create(schoolId, input) {
      await latency(latencyMs)
      const job = {
        id: `job_${Date.now().toString(36)}`,
        schoolId,
        ...input,
        status: "open" as const,
        postedOn: new Date().toISOString().slice(0, 10),
        applicants: 0,
      }
      tables.jobs.push(job)
      return job
    },
  }
}
