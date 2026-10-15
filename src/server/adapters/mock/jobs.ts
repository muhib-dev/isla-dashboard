import "server-only"
import type { Job } from "@/features/jobs/schema"
import type { JobRepository } from "@/server/repositories/types"
import { latency, tables } from "./store"

const byNewest = (a: { postedOn: string }, b: { postedOn: string }) => b.postedOn.localeCompare(a.postedOn)

export function createMockJobRepository(latencyMs: number): JobRepository {
  return {
    async listBySchool(schoolId) {
      await latency(latencyMs)
      return tables.jobs.filter((j) => j.schoolId === schoolId).sort(byNewest)
    },

    async listPublished() {
      await latency(latencyMs)
      return tables.jobs.filter((j) => j.status !== "draft").sort(byNewest)
    },

    async create(schoolId, input) {
      await latency(latencyMs)
      const { publish, featured, currency, salaryMin, salaryMax, startDate, ...rest } = input
      const job: Job = {
        id: `job_${Date.now().toString(36)}`,
        schoolId,
        ...rest,
        status: publish ? "open" : "draft",
        ...(featured ? { featured } : {}),
        postedOn: new Date().toISOString().slice(0, 10),
        applicants: 0,
        views: 0,
        ...(startDate ? { startDate } : {}),
        ...(salaryMin || salaryMax ? { salary: { currency, min: salaryMin, max: salaryMax } } : {}),
      }
      tables.jobs.push(job)
      return job
    },

    async setStatus(id, status) {
      await latency(latencyMs)
      const job = tables.jobs.find((j) => j.id === id)
      if (!job) return null
      job.status = status
      return job
    },
  }
}
