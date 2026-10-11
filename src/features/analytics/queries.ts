import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { repos } from "@/server/repositories"
import type { PeerFilter } from "./schema"

export const ANALYTICS_TAG = "analytics"

export async function compareSchool(schoolId: string, peers: PeerFilter) {
  "use cache"
  cacheLife("hours")
  cacheTag(ANALYTICS_TAG, `school-${schoolId}`)
  return repos.analytics.compare(schoolId, peers)
}

export async function getRegionStats() {
  "use cache"
  cacheLife("hours")
  cacheTag(ANALYTICS_TAG)
  return repos.analytics.regionStats()
}

export async function getNetworkOverview() {
  "use cache"
  cacheLife("hours")
  cacheTag(ANALYTICS_TAG, "jobs")
  return repos.analytics.overview()
}
