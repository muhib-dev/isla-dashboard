import { z } from "zod"
import { RegionSchema } from "@/features/schools/schema"

export const METRIC_KEYS = ["enrollment", "studentTeacherRatio", "tuition", "avgTeacherSalary", "retentionRate"] as const
export const MetricKeySchema = z.enum(METRIC_KEYS)
export type MetricKey = z.infer<typeof MetricKeySchema>

export const SIZE_BANDS = ["any", "small", "medium", "large"] as const
export const SizeBandSchema = z.enum(SIZE_BANDS)
export type SizeBand = z.infer<typeof SizeBandSchema>

export const SIZE_BAND_LABELS: Record<SizeBand, string> = {
  any: "All sizes",
  small: "Under 200 students",
  medium: "200–499 students",
  large: "500+ students",
}

export const PeerFilterSchema = z.object({
  region: RegionSchema.or(z.literal("all")),
  size: SizeBandSchema,
})
export type PeerFilter = z.infer<typeof PeerFilterSchema>

const MetricValues = z.record(MetricKeySchema, z.number())

export const DistributionSchema = z.object({
  min: z.number(),
  p25: z.number(),
  median: z.number(),
  p75: z.number(),
  max: z.number(),
})
export type Distribution = z.infer<typeof DistributionSchema>

export const SchoolComparisonSchema = z.object({
  schoolId: z.string(),
  peerCount: z.number().int(),
  school: MetricValues,
  peerMedian: MetricValues,
  /** Spread of peer values per metric. */
  distribution: z.record(MetricKeySchema, DistributionSchema),
  /** Share of peers (0–1) with a lower value than this school, per metric. */
  percentile: MetricValues,
  enrollmentTrend: z.array(z.object({ year: z.number().int(), school: z.number(), peerMedian: z.number() })),
})
export type SchoolComparison = z.infer<typeof SchoolComparisonSchema>

export const RegionStatsSchema = z.object({
  region: RegionSchema,
  schools: z.number().int(),
  activeMembers: z.number().int(),
  membership: z.record(z.enum(["active", "grace", "lapsed", "non_member"]), z.number().int()),
  students: z.number().int(),
  medianEnrollment: z.number(),
  medianTuition: z.number(),
  medianTeacherSalary: z.number(),
  medianRetention: z.number(),
  lunchProgramShare: z.number(),
})
export type RegionStats = z.infer<typeof RegionStatsSchema>

export const NetworkOverviewSchema = z.object({
  schools: z.number().int(),
  students: z.number().int(),
  membership: z.record(z.enum(["active", "grace", "lapsed", "non_member"]), z.number().int()),
  staleProfiles: z.number().int(),
  openJobs: z.number().int(),
  /** Medians across every school in the network. */
  medians: z.object({
    enrollment: z.number(),
    tuition: z.number(),
    teacherSalary: z.number(),
    retention: z.number(),
    lunchProgramShare: z.number(),
  }),
})
export type NetworkOverview = z.infer<typeof NetworkOverviewSchema>
