import "server-only"
import { distribution, inSizeBand, median, metricValues, quantile } from "@/features/analytics/lib"
import { METRIC_KEYS, type MetricKey } from "@/features/analytics/schema"
import { freshnessOf, oldestVerified } from "@/features/schools/lib"
import { REGIONS } from "@/features/schools/schema"
import type { AnalyticsRepository } from "@/server/repositories/types"
import { latency, tables } from "./store"

/** 0 means "not reported" (e.g. schools imported from the public directory), so medians skip it. */
const known = (v: number) => v > 0

export function createMockAnalyticsRepository(latencyMs: number): AnalyticsRepository {
  return {
    async compare(schoolId, peers) {
      await latency(latencyMs)
      const school = tables.schools.find((s) => s.id === schoolId)
      if (!school) throw new Error(`School ${schoolId} not found`)

      const group = tables.schools.filter(
        (s) =>
          s.id !== schoolId &&
          (peers.region === "all" || s.region === peers.region) &&
          inSizeBand(s.metrics.enrollment, peers.size),
      )
      const values = group.map(metricValues)
      const own = metricValues(school)
      const perMetric = <T,>(fn: (key: MetricKey, peers: number[]) => T) =>
        Object.fromEntries(METRIC_KEYS.map((key) => [key, fn(key, values.map((v) => v[key]))])) as Record<MetricKey, T>

      return {
        schoolId,
        peerCount: group.length,
        school: own,
        peerMedian: perMetric((_, peers) => median(peers)),
        distribution: perMetric((_, peers) => distribution(peers)),
        percentile: perMetric((key, peers) => (peers.length ? peers.filter((v) => v < own[key]).length / peers.length : 0)),
        enrollmentTrend: school.metrics.enrollmentHistory.map(({ year, value }) => {
          const peerValues = group.map((s) => s.metrics.enrollmentHistory.find((h) => h.year === year)?.value ?? 0)
          return {
            year,
            school: value,
            peerMedian: median(peerValues),
            peerP25: quantile(peerValues, 0.25),
            peerP75: quantile(peerValues, 0.75),
          }
        }),
        turnoverTrend: school.metrics.retentionHistory?.map(({ year, value }) => ({
          year,
          school: 1 - value,
          peerMedian:
            1 -
            median(
              group
                .map((s) => s.metrics.retentionHistory?.find((h) => h.year === year)?.value ?? 0)
                .filter(known),
            ),
        })),
        applicationsPerVacancy: applicationsVsPeers(schoolId, group.map((s) => s.id)),
      }
    },

    async regionStats() {
      await latency(latencyMs)
      return REGIONS.map((region) => {
        const list = tables.schools.filter((s) => s.region === region)
        return {
          region,
          schools: list.length,
          activeMembers: list.filter((s) => s.membership.status === "active").length,
          membership: {
            active: list.filter((s) => s.membership.status === "active").length,
            grace: list.filter((s) => s.membership.status === "grace").length,
            lapsed: list.filter((s) => s.membership.status === "lapsed").length,
            non_member: list.filter((s) => s.membership.status === "non_member").length,
          },
          students: list.reduce((n, s) => n + s.metrics.enrollment, 0),
          medianEnrollment: median(list.map((s) => s.metrics.enrollment).filter(known)),
          medianTuition: median(list.map((s) => s.metrics.tuition).filter(known)),
          medianTeacherSalary: median(list.map((s) => s.metrics.avgTeacherSalary).filter(known)),
          medianRetention: median(list.map((s) => s.metrics.retentionRate).filter(known)),
          lunchProgramShare: list.length ? list.filter((s) => s.programs.lunch.offered).length / list.length : 0,
        }
      })
    },

    async overview() {
      await latency(latencyMs)
      const now = Date.now()
      const count = (status: string) => tables.schools.filter((s) => s.membership.status === status).length
      return {
        schools: tables.schools.length,
        students: tables.schools.reduce((n, s) => n + s.metrics.enrollment, 0),
        membership: {
          active: count("active"),
          grace: count("grace"),
          lapsed: count("lapsed"),
          non_member: count("non_member"),
        },
        staleProfiles: tables.schools.filter((s) => freshnessOf(oldestVerified(s), now) === "stale").length,
        openJobs: tables.jobs.filter((j) => j.status === "open").length,
        medians: {
          enrollment: median(tables.schools.map((s) => s.metrics.enrollment)),
          tuition: median(tables.schools.map((s) => s.metrics.tuition)),
          teacherSalary: median(tables.schools.map((s) => s.metrics.avgTeacherSalary)),
          retention: median(tables.schools.map((s) => s.metrics.retentionRate)),
          lunchProgramShare: tables.schools.filter((s) => s.programs.lunch.offered).length / tables.schools.length,
        },
      }
    },
  }
}

/** Applicants per posting, over every job a school has posted. Null when it has posted none. */
function applicationsPerPost(schoolId: string) {
  const posts = tables.jobs.filter((j) => j.schoolId === schoolId)
  return posts.length ? posts.reduce((n, j) => n + j.applicants, 0) / posts.length : null
}

function applicationsVsPeers(schoolId: string, peerIds: string[]) {
  const own = applicationsPerPost(schoolId)
  const peers = peerIds.map(applicationsPerPost).filter((v): v is number => v !== null)
  if (own === null || peers.length === 0) return undefined
  return {
    school: own,
    peerMedian: median(peers),
    distribution: distribution(peers),
    percentile: peers.filter((v) => v < own).length / peers.length,
  }
}
