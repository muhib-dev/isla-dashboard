import { z } from "zod"
import { SchoolTypeSchema } from "./schema"
import { gradeIndex } from "./search/grades"
import { stateCode } from "./search/states"

const text = (min: number, max: number, what: string) =>
  z.string().trim().min(min, `Enter ${what}`).max(max, `Keep ${what} under ${max} characters`)
const optionalText = (max: number) => z.string().trim().max(max).optional().default("")

/** Honeypot: real users never see this field, bots fill it. Must stay empty. */
const honeypot = z.string().max(0).optional()

const postal = (country: "US" | "CA", value: string) =>
  country === "US" ? /^\d{5}(-\d{4})?$/.test(value) : /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(value)

export const ContactMessageSchema = z.object({
  name: text(2, 80, "your name"),
  email: z.email("Enter a valid email").max(120),
  message: text(10, 2000, "a message"),
  hp: honeypot,
})
export type ContactMessage = z.infer<typeof ContactMessageSchema>

export const NewSchoolSchema = z
  .object({
    name: text(2, 120, "the school name"),
    street: text(3, 120, "the street address"),
    city: text(2, 80, "the city"),
    state: z.string().trim().refine((s) => stateCode(s) !== null, "Pick a state or province").transform((s) => stateCode(s)!),
    postalCode: z.string().trim().max(10),
    country: z.enum(["US", "CA"]),
    phone: z.string().trim().refine((p) => p.replace(/\D/g, "").length >= 7, "Enter a phone number"),
    email: z.email("Enter a valid email").max(120),
    website: z.union([z.literal(""), z.url("Enter a full URL, like https://example.org").max(200)]).default(""),
    head: optionalText(80),
    type: SchoolTypeSchema,
    gradesFrom: z.string().trim().refine((g) => gradeIndex(g) !== null, "Pick a grade"),
    gradesTo: z.string().trim().refine((g) => gradeIndex(g) !== null, "Pick a grade"),
    founded: z.coerce.number().int().min(1900, "Enter a year from 1900").max(new Date().getFullYear()).optional(),
    submitterEmail: z.email("Enter a valid email").max(120),
    hp: honeypot,
  })
  .superRefine((v, ctx) => {
    if (!postal(v.country, v.postalCode)) ctx.addIssue({ code: "custom", path: ["postalCode"], message: v.country === "US" ? "Enter a 5-digit ZIP code" : "Enter a postal code like A1A 1A1" })
    const a = gradeIndex(v.gradesFrom)
    const b = gradeIndex(v.gradesTo)
    if (a !== null && b !== null && a > b) ctx.addIssue({ code: "custom", path: ["gradesTo"], message: "Must be the same or higher than the first grade" })
  })
export type NewSchool = z.infer<typeof NewSchoolSchema>

export const REPORT_KINDS = ["closed", "opened", "merged", "missing", "other"] as const
export const REPORT_KIND_LABELS = {
  closed: "This school has closed",
  opened: "A new school has opened",
  merged: "Schools have merged",
  missing: "A school is missing from the map",
  other: "Something else is wrong",
  new: "New school submitted",
} as const

export const NewReportSchema = z.object({
  kind: z.enum(REPORT_KINDS),
  schoolId: z.string().max(80).optional(),
  schoolName: text(2, 120, "the school name"),
  city: text(2, 80, "the city"),
  state: z.string().trim().refine((s) => stateCode(s) !== null, "Pick a state or province").transform((s) => stateCode(s)!),
  note: optionalText(1000),
  submitterEmail: z.union([z.literal(""), z.email("Enter a valid email").max(120)]).default(""),
  hp: honeypot,
})
export type NewReport = z.infer<typeof NewReportSchema>

export const REPORT_STATUSES = ["pending", "approved", "dismissed"] as const
export const SchoolReportSchema = z.object({
  id: z.string(),
  kind: z.enum([...REPORT_KINDS, "new"]),
  schoolId: z.string().nullable(),
  schoolName: z.string(),
  city: z.string(),
  state: z.string(),
  note: z.string(),
  submitterEmail: z.string(),
  createdAt: z.string(),
  status: z.enum(REPORT_STATUSES),
})
export type SchoolReport = z.infer<typeof SchoolReportSchema>
export type ReportDecision = "approved" | "dismissed"
