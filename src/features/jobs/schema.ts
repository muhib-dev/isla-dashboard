import { z } from "zod"

export const JobCategorySchema = z.enum(["teaching", "leadership", "student_services", "operations"])
export const JobTypeSchema = z.enum(["full_time", "part_time", "contract"])
export const JobStatusSchema = z.enum(["draft", "open", "filled", "closed"])
export const JobCurrencySchema = z.enum(["USD", "CAD"])

export const JOB_CATEGORY_LABELS: Record<z.infer<typeof JobCategorySchema>, string> = {
  teaching: "Teaching",
  leadership: "Leadership",
  student_services: "Student services",
  operations: "Operations",
}

export const JOB_TYPE_LABELS: Record<z.infer<typeof JobTypeSchema>, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Fixed-term contract",
}

/** Posts stay live on the ISLA careers board for this many days. */
export const JOB_POST_LIFETIME_DAYS = 60
/** Featured posts included with membership each year. */
export const FEATURED_CREDITS_PER_YEAR = 3
export const JOB_DESCRIPTION_MAX = 4000

export const JobSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  title: z.string(),
  category: JobCategorySchema,
  type: JobTypeSchema,
  status: JobStatusSchema,
  featured: z.boolean().optional(),
  postedOn: z.iso.date(),
  applicants: z.number().int().nonnegative(),
  views: z.number().int().nonnegative().default(0),
  startDate: z.iso.date().optional(),
  salary: z.object({ currency: JobCurrencySchema, min: z.number().optional(), max: z.number().optional() }).optional(),
  email: z.string().optional(),
  description: z.string().optional(),
})
export type Job = z.infer<typeof JobSchema>

/** "Expired" isn't stored: an open post past its 60-day window. */
export type JobDisplayStatus = Exclude<Job["status"], "open"> | "live" | "expired"

const DAY_MS = 86_400_000

export function jobExpiry(postedOn: string, today: number) {
  const expiresAt = Date.parse(postedOn) + JOB_POST_LIFETIME_DAYS * DAY_MS
  return {
    iso: new Date(expiresAt).toISOString().slice(0, 10),
    daysLeft: Math.ceil((expiresAt - today) / DAY_MS),
  }
}

export function jobDisplayStatus(job: Pick<Job, "status" | "postedOn">, today: number): JobDisplayStatus {
  if (job.status !== "open") return job.status
  return jobExpiry(job.postedOn, today).daysLeft < 0 ? "expired" : "live"
}

const optionalAmount = z
  .union([z.literal(""), z.coerce.number().int("Use whole numbers").positive("Enter an amount above 0")])
  .optional()
  .transform((v) => (v === "" ? undefined : v))

export const NewJobSchema = z
  .object({
    title: z.string().trim().min(3, "Add a job title"),
    category: JobCategorySchema,
    type: JobTypeSchema,
    startDate: z.union([z.literal(""), z.iso.date("Pick a start date")]).optional(),
    currency: JobCurrencySchema.default("USD"),
    salaryMin: optionalAmount,
    salaryMax: optionalAmount,
    email: z.email("Enter a complete email address, for example recruitment@school.org"),
    description: z.string().max(JOB_DESCRIPTION_MAX, "Keep the description under 4,000 characters").default(""),
    featured: z.boolean().default(false),
    publish: z.boolean().default(true),
  })
  .refine((v) => v.salaryMin === undefined || v.salaryMax === undefined || v.salaryMax >= v.salaryMin, {
    path: ["salaryMax"],
    message: "Maximum should be at least the minimum",
  })
export type NewJob = z.infer<typeof NewJobSchema>
export type NewJobInput = z.input<typeof NewJobSchema>
