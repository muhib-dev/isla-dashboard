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

export const SCHOOL_TYPES = ["standard", "preschool", "charter", "weekend", "afterschool", "coop", "hifdh", "other"] as const
export const SchoolTypeSchema = z.enum(SCHOOL_TYPES)
export type SchoolType = z.infer<typeof SchoolTypeSchema>
export const SCHOOL_TYPE_LABELS: Record<SchoolType, string> = {
  standard: "Full-time Islamic school",
  preschool: "Preschool",
  charter: "Charter",
  weekend: "Weekend",
  afterschool: "After-school",
  coop: "Co-op",
  hifdh: "Hifdh",
  other: "Other",
}

/** Listing status: open and pending (new, unreviewed) schools show by default; closed ones are opt-in. */
export const LISTING_STATUSES = ["open", "pending", "closed"] as const
export const ListingStatusSchema = z.enum(LISTING_STATUSES)
export type ListingStatus = z.infer<typeof ListingStatusSchema>

/** Same feature checklist as the public ISLA directory. */
export const FEATURE_LABELS = {
  e_learning: "E-learning portal",
  computer_lab: "Computer labs",
  library: "Library",
  uniform: "Uniform",
  afterschool_clubs: "After-school clubs",
  dorms: "Dorms",
  scholarship: "Scholarships",
  financial_aid: "Financial aid",
  sports: "Sports",
  hot_lunch: "Hot lunch",
  science_lab: "Science lab",
  sibling_discount: "Sibling discount",
  alumni_association: "Alumni association",
  staff_discount: "Staff discount",
  debate_club: "Debate club",
  science_olympiad: "Science Olympiad",
  robotics_club: "Robotics club",
} as const
export const FEATURES = Object.keys(FEATURE_LABELS) as (keyof typeof FEATURE_LABELS)[]
export const FeatureSchema = z.enum(FEATURES as [keyof typeof FEATURE_LABELS, ...(keyof typeof FEATURE_LABELS)[]])
export type Feature = z.infer<typeof FeatureSchema>

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
const FEATURE_LOOKUP = new Map<string, Feature>(
  FEATURES.flatMap((f) => [[squash(f), f], [squash(FEATURE_LABELS[f]), f], [squash(FEATURE_LABELS[f]).replace(/s$/, ""), f]] as [string, Feature][]),
)

/**
 * Maps a directory feature to our key: the key itself, its label in any case/spacing
 * ("computer labs", "Science Olympiad"), or the directory's numeric id (1–17, same order
 * as FEATURE_LABELS). Anything else ("Small class sizes") isn't a searchable feature: null.
 */
export function normalizeFeature(input: string | number): Feature | null {
  if (typeof input === "number") return Number.isInteger(input) ? (FEATURES[input - 1] ?? null) : null
  const k = squash(input)
  return FEATURE_LOOKUP.get(k) ?? FEATURE_LOOKUP.get(k.replace(/s$/, "")) ?? null
}

/** Unknown features are dropped rather than failing the whole record. */
const FeatureListSchema = z
  .array(z.union([z.string(), z.number()]))
  .transform((list) => [...new Set(list.map(normalizeFeature).filter((f): f is Feature => f !== null))])

/** The directory reports enrollment as one of these bands, not an exact count. */
export const ENROLLMENT_BANDS = ["1-100", "101-250", "251-500", "500+"] as const
export const EnrollmentBandSchema = z.enum(ENROLLMENT_BANDS)
export type EnrollmentBand = z.infer<typeof EnrollmentBandSchema>
export const ENROLLMENT_BAND_BOUNDS: Record<EnrollmentBand, { min: number; max: number | null }> = {
  "1-100": { min: 1, max: 100 },
  "101-250": { min: 101, max: 250 },
  "251-500": { min: 251, max: 500 },
  "500+": { min: 501, max: null },
}
export const ENROLLMENT_BAND_LABELS: Record<EnrollmentBand, string> = { "1-100": "1–100", "101-250": "101–250", "251-500": "251–500", "500+": "500+" }

/** Band for an exact count; null for 0 (unknown). */
export function bandOf(n: number): EnrollmentBand | null {
  if (n <= 0) return null
  return ENROLLMENT_BANDS.find((b) => ENROLLMENT_BAND_BOUNDS[b].max === null || n <= ENROLLMENT_BAND_BOUNDS[b].max!) ?? null
}

export const MembershipStatusSchema = z.enum(["active", "grace", "lapsed", "non_member"])
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>

export const PROFILE_SECTIONS = ["overview", "leadership", "schedule", "programs", "contacts"] as const
export const ProfileSectionSchema = z.enum(PROFILE_SECTIONS)
export type ProfileSection = z.infer<typeof ProfileSectionSchema>

const isoDate = z.iso.date()

export const GEO_PRECISIONS = ["rooftop", "postal", "city", "none"] as const
export const GeoSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  /** How exact the pin is. "city" pins are approximate and shown as such. */
  precision: z.enum(GEO_PRECISIONS),
  source: z.enum(["nominatim", "gazetteer", "manual"]),
  updatedAt: isoDate,
})
export type Geo = z.infer<typeof GeoSchema>

export const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.enum(["US", "CA"]),
  /** Optional so older API payloads still parse; schools without it are listed as "not on map". */
  geo: GeoSchema.nullish(),
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
  /** "" when the school hasn't published its calendar (the public directory doesn't carry it). */
  firstDay: isoDate.or(z.literal("")),
  lastDay: isoDate.or(z.literal("")),
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
  /** Defaults keep older API payloads parsing. */
  type: SchoolTypeSchema.default("standard"),
  listing: ListingStatusSchema.default("open"),
  features: FeatureListSchema.default([]),
  /** Published tuition range ("$0 – $2,000"). When absent, metrics.tuition is the only figure. */
  tuitionRange: z.object({ min: z.number().nonnegative(), max: z.number().nonnegative() }).refine((r) => r.min <= r.max, "min must not exceed max").optional(),
  /** Published enrollment band. When absent it's derived from metrics.enrollment. */
  enrollmentBand: EnrollmentBandSchema.optional(),
  social: z.object({ facebook: z.string(), instagram: z.string(), youtube: z.string(), x: z.string() }).partial().default({}),
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
    firstDay: isoDate,
    lastDay: isoDate,
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
