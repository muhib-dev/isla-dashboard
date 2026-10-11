import { z } from "zod"

export const JobCategorySchema = z.enum(["teaching", "leadership", "student_services", "operations"])
export const JobTypeSchema = z.enum(["full_time", "part_time"])
export const JobStatusSchema = z.enum(["open", "filled", "closed"])

export const JOB_CATEGORY_LABELS: Record<z.infer<typeof JobCategorySchema>, string> = {
  teaching: "Teaching",
  leadership: "Leadership",
  student_services: "Student services",
  operations: "Operations",
}

export const JobSchema = z.object({
  id: z.string(),
  schoolId: z.string(),
  title: z.string(),
  category: JobCategorySchema,
  type: JobTypeSchema,
  status: JobStatusSchema,
  postedOn: z.iso.date(),
  applicants: z.number().int().nonnegative(),
})
export type Job = z.infer<typeof JobSchema>

export const NewJobSchema = z.object({
  title: z.string().trim().min(3, "Add a job title"),
  category: JobCategorySchema,
  type: JobTypeSchema,
})
export type NewJob = z.infer<typeof NewJobSchema>
