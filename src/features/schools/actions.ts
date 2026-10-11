"use server"

import { updateTag } from "next/cache"
import { z } from "zod"
import { ANALYTICS_TAG } from "@/features/analytics/queries"
import { invalid, type ActionResult } from "@/lib/validation"
import { repos } from "@/server/repositories"
import { canManageSchool, getSession } from "@/server/session"
import { SCHOOLS_TAG, schoolTag } from "./queries"
import { ProfileSectionSchema, SectionPatchSchemas, type ProfileSection } from "./schema"

export async function updateSchoolSection(
  schoolId: string,
  section: ProfileSection,
  input: unknown,
): Promise<ActionResult> {
  const session = await getSession()
  if (!canManageSchool(session, schoolId)) return { ok: false, error: "You can't edit this school." }

  const parsedSection = ProfileSectionSchema.parse(section)
  const parsed = SectionPatchSchemas[parsedSection].safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  await repos.schools.updateSection(schoolId, parsedSection, parsed.data)
  updateTag(schoolTag(schoolId))
  updateTag(SCHOOLS_TAG)
  updateTag(ANALYTICS_TAG)
  return { ok: true }
}

export async function requestProfileUpdates(ids: string[]) {
  const session = await getSession()
  if (session.role !== "isla") return { ok: false as const, error: "Only ISLA staff can send requests." }
  const { sent } = await repos.schools.requestUpdate(z.array(z.string()).parse(ids))
  return { ok: true as const, sent }
}
