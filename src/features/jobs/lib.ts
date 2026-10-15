import { FEATURED_CREDITS_PER_YEAR, type Job } from "./schema"

/** Each featured post published this calendar year uses one credit. */
export function featuredCreditsLeft(jobs: Pick<Job, "featured" | "status" | "postedOn">[], year: number) {
  const used = jobs.filter((j) => j.featured && j.status !== "draft" && j.postedOn.startsWith(String(year))).length
  return Math.max(0, FEATURED_CREDITS_PER_YEAR - used)
}

export function median(values: number[]) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}
