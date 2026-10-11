"use server"

import { updateTag } from "next/cache"
import { invalid, type ActionResult } from "@/lib/validation"
import { repos } from "@/server/repositories"
import { canManageSchool, getSession } from "@/server/session"
import { JOBS_TAG, schoolJobsTag } from "./queries"
import { NewJobSchema } from "./schema"

export async function postJob(schoolId: string, input: unknown): Promise<ActionResult> {
  const session = await getSession()
  if (!canManageSchool(session, schoolId)) return { ok: false, error: "You can't post jobs for this school." }

  const parsed = NewJobSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  await repos.jobs.create(schoolId, parsed.data)
  updateTag(schoolJobsTag(schoolId))
  updateTag(JOBS_TAG)
  return { ok: true }
}
