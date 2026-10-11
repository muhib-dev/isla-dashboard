import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { repos } from "@/server/repositories"

export const JOBS_TAG = "jobs"
export const schoolJobsTag = (schoolId: string) => `jobs-${schoolId}`

export async function getSchoolJobs(schoolId: string) {
  "use cache"
  cacheLife("minutes")
  cacheTag(JOBS_TAG, schoolJobsTag(schoolId))
  return repos.jobs.listBySchool(schoolId)
}

export async function getOpenJobs() {
  "use cache"
  cacheLife("minutes")
  cacheTag(JOBS_TAG)
  const [jobs, schools] = await Promise.all([repos.jobs.listOpen(), repos.schools.list({})])
  const names = new Map(schools.map((s) => [s.id, `${s.name} · ${s.city}, ${s.state}`]))
  return jobs.map((job) => ({ ...job, schoolName: names.get(job.schoolId) ?? job.schoolId }))
}
