"use server"

import { updateTag } from "next/cache"
import { z } from "zod"
import { invalid, type ActionResult } from "@/lib/validation"
import { repos } from "@/server/repositories"
import { canManageSchool, getSession } from "@/server/session"
import { featuredCreditsLeft } from "./lib"
import { JOBS_TAG, schoolJobsTag } from "./queries"
import { NewJobSchema } from "./schema"

export async function postJob(schoolId: string, input: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!canManageSchool(session, schoolId)) return { ok: false, error: "You can't post jobs for this school." }

  const parsed = NewJobSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  if (parsed.data.featured && parsed.data.publish) {
    const jobs = await repos.jobs.listBySchool(schoolId)
    if (featuredCreditsLeft(jobs, new Date().getUTCFullYear()) < 1) {
      return { ok: false, error: "You've used all your featured credits for this year." }
    }
  }

  await repos.jobs.create(schoolId, parsed.data)
  updateTag(schoolJobsTag(schoolId))
  updateTag(JOBS_TAG)
  return { ok: true }
}

const CloseSchema = z.enum(["filled", "closed"])

/** Takes a live post off the careers board, as filled or simply closed. */
export async function closeJob(jobId: string, status: unknown): Promise<ActionResult> {
  const parsed = CloseSchema.safeParse(status)
  if (!parsed.success) return invalid(parsed.error)

  const session = await getSession()
  if (session.role !== "isla") {
    const own = await repos.jobs.listBySchool(session.schoolId!)
    if (!own.some((j) => j.id === jobId)) return { ok: false, error: "You can't change this post." }
  }

  const job = await repos.jobs.setStatus(jobId, parsed.data)
  if (!job) return { ok: false, error: "This post no longer exists." }
  updateTag(schoolJobsTag(job.schoolId))
  updateTag(JOBS_TAG)
  return { ok: true }
}
