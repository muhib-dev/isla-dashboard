"use server"

import { updateTag } from "next/cache"
import { z } from "zod"
import { repos } from "@/server/repositories"
import { canManageSchool, getSession } from "@/server/session"
import { billingTag } from "./queries"

export async function setAutoRenew(schoolId: string, autoRenew: boolean) {
  const session = await getSession()
  if (!canManageSchool(session, schoolId)) return { ok: false as const, error: "You can't change billing for this school." }
  await repos.billing.updatePlan(schoolId, { autoRenew: z.boolean().parse(autoRenew) })
  updateTag(billingTag(schoolId))
  return { ok: true as const }
}
