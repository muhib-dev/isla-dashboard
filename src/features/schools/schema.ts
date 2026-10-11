import { z } from "zod"

export const REGIONS = ["northeast", "southeast", "midwest", "southwest", "west", "canada"] as const
export const RegionSchema = z.enum(REGIONS)
export type Region = z.infer<typeof RegionSchema>

export const REGION_LABELS: Record<Region, string> = {
  northeast: "Northeast",
  southeast: "Southeast",
  midwest: "Midwest",
  southwest: "Southwest",
  west: "West",
  canada: "Canada",
}

export const MembershipStatusSchema = z.enum(["active", "grace", "lapsed", "non_member"])
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>

export const PROFILE_SECTIONS = ["overview", "leadership", "schedule", "programs", "contacts"] as const
export const ProfileSectionSchema = z.enum(PROFILE_SECTIONS)
export type ProfileSection = z.infer<typeof ProfileSectionSchema>

const isoDate = z.iso.date()

export const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.enum(["US", "CA"]),
})

export const LeaderSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  email: z.string(),
  since: z.number().int().nullable(),
})
export type Leader = z.infer<typeof LeaderSchema>

export const ScheduleSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  firstDay: isoDate,
  lastDay: isoDate,
  fridayEarlyRelease: z.boolean(),
  note: z.string(),
})

export const ProgramsSchema = z.object({
  lunch: z.object({
    offered: z.boolean(),
    provider: z.string(),
    allHalal: z.boolean(),
    freeReducedAvailable: z.boolean(),
  }),
  transportation: z.boolean(),
  quran: z.boolean(),
  arabic: z.boolean(),
  afterCare: z.boolean(),
  athletics: z.array(z.string()),
})

export const MetricsSchema = z.object({
  enrollment: z.number().int().nonnegative(),
  teachers: z.number().int().nonnegative(),
  tuition: z.number().nonnegative(),
  avgTeacherSalary: z.number().nonnegative(),
  retentionRate: z.number().min(0).max(1),
  enrollmentHistory: z.array(z.object({ year: z.number().int(), value: z.number().int() })),
})
export type SchoolMetrics = z.infer<typeof MetricsSchema>

export const SchoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  region: RegionSchema,
  address: AddressSchema,
  phone: z.string(),
  email: z.string(),
  website: z.string(),
  founded: z.number().int(),
  gradesFrom: z.string(),
  gradesTo: z.string(),
  accreditation: z.array(z.string()),
  metrics: MetricsSchema,
  leadership: z.array(LeaderSchema),
  schedule: ScheduleSchema,
  programs: ProgramsSchema,
  membership: z.object({ status: MembershipStatusSchema, memberSince: z.number().int() }),
  verifiedAt: z.record(ProfileSectionSchema, isoDate),
  updatedAt: isoDate,
})
export type School = z.infer<typeof SchoolSchema>

/** Row shape for directory tables — what a list endpoint should return. */
export const SchoolSummarySchema = SchoolSchema.pick({
  id: true,
  name: true,
  region: true,
  gradesFrom: true,
  gradesTo: true,
  membership: true,
  updatedAt: true,
}).extend({
  city: z.string(),
  state: z.string(),
  enrollment: z.number().int(),
  oldestVerifiedAt: isoDate,
})
export type SchoolSummary = z.infer<typeof SchoolSummarySchema>

export const FRESHNESS = ["fresh", "aging", "stale"] as const
export type Freshness = (typeof FRESHNESS)[number]

export const SchoolFilterSchema = z.object({
  q: z.string().trim().optional(),
  region: RegionSchema.optional(),
  status: MembershipStatusSchema.optional(),
  freshness: z.enum(FRESHNESS).optional(),
})
export type SchoolFilter = z.infer<typeof SchoolFilterSchema>

/** Editable payload per profile section. Mirrors PATCH /schools/:id/{section}. */
export const SectionPatchSchemas = {
  overview: z.object({
    name: z.string().trim().min(2, "Enter the school name"),
    gradesFrom: z.string().trim().min(1),
    gradesTo: z.string().trim().min(1),
    founded: z.coerce.number().int().min(1900).max(2100),
    enrollment: z.coerce.number().int().min(0),
    teachers: z.coerce.number().int().min(0),
    tuition: z.coerce.number().min(0),
    accreditation: z.string().trim(),
  }),
  leadership: z.object({
    leaders: z.array(LeaderSchema.extend({ name: z.string().trim(), email: z.string().trim() })),
  }),
  schedule: ScheduleSchema.extend({
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  }),
  programs: ProgramsSchema,
  contacts: z.object({
    phone: z.string().trim().min(7, "Enter a phone number"),
    email: z.email("Enter a valid email"),
    website: z.url("Enter a full URL"),
    street: z.string().trim().min(1),
    city: z.string().trim().min(1),
    state: z.string().trim().min(2),
    postalCode: z.string().trim().min(3),
  }),
} satisfies Record<ProfileSection, z.ZodType>

export type SectionPatch<S extends ProfileSection> = z.infer<(typeof SectionPatchSchemas)[S]>
