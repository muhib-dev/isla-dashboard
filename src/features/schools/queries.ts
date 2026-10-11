import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { repos } from "@/server/repositories"
import { completeness, freshnessOf, oldestVerified } from "./lib"
import type { SchoolFilter } from "./schema"

export const schoolTag = (id: string) => `school-${id}`
export const SCHOOLS_TAG = "schools"

export async function getSchool(id: string) {
  "use cache"
  cacheLife("hours")
  cacheTag(SCHOOLS_TAG, schoolTag(id))
  return repos.schools.get(id)
}

export async function listSchools(filter: SchoolFilter) {
  "use cache"
  cacheLife("hours")
  cacheTag(SCHOOLS_TAG)
  const now = Date.now()
  const rows = await repos.schools.list(filter)
  return rows.map((row) => ({ ...row, freshness: freshnessOf(row.oldestVerifiedAt, now) }))
}

export async function getSchoolHealth(id: string) {
  "use cache"
  cacheLife("hours")
  cacheTag(SCHOOLS_TAG, schoolTag(id))
  const school = await repos.schools.get(id)
  if (!school) return null
  const now = Date.now()
  const { score, tasks } = completeness(school, now)
  return {
    score,
    tasks,
    oldestVerifiedAt: oldestVerified(school),
    freshness: Object.fromEntries(
      Object.entries(school.verifiedAt).map(([section, date]) => [section, freshnessOf(date, now)]),
    ) as Record<keyof typeof school.verifiedAt, ReturnType<typeof freshnessOf>>,
  }
}
