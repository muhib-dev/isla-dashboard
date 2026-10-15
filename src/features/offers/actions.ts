"use server"

import { updateTag } from "next/cache"
import { z } from "zod"
import { invalid, type ActionFailure, type ActionResult } from "@/lib/validation"
import { allow, clientKey } from "@/server/rate-limit"
import { repos } from "@/server/repositories"
import { getOptionalSession, getSession } from "@/server/session"
import { claimBlocker, isoToday, offerPhase, redactRedemption } from "./lib"
import { OFFERS_TAG } from "./queries"
import {
  ClaimStatusSchema,
  OfferInputSchema,
  OfferStatusSchema,
  PublicClaimSchema,
  type Redemption,
} from "./schema"

const STAFF_ONLY: ActionFailure = { ok: false, error: "Only ISLA staff can manage offers." }
const TOO_MANY: ActionFailure = {
  ok: false,
  error: "You’ve claimed a few offers already. Please try again in a little while.",
}
const WINDOW = 10 * 60_000

async function isStaff() {
  return (await getSession()).role === "isla"
}

/**
 * "Avail this offer" on the public page. A signed-in school admin claims for their school;
 * anyone else gives a school name and contact. Anonymous claims are rate-limited and carry a
 * honeypot: bots that fill it get a normal-looking answer and nothing is stored.
 */
export async function availOffer(
  offerId: string,
  input: unknown,
): Promise<{ ok: true; redemption: Redemption } | ActionFailure> {
  const parsed = PublicClaimSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)
  const { hp, schoolName, ...contact } = parsed.data

  const offer = await repos.offers.getOffer(z.string().max(80).parse(offerId))
  if (!offer || offer.status !== "active") return { ok: false, error: "This offer is no longer available." }
  if (hp) return { ok: true, redemption: redactRedemption(offer).redemption }

  const session = await getOptionalSession()
  const school =
    session?.role === "school" && session.schoolId ? await repos.schools.get(session.schoolId) : null

  if (!school) {
    if (!schoolName)
      return { ok: false, error: "Check the highlighted fields.", fieldErrors: { schoolName: ["Add your school or organization"] } }
    if (offer.membersOnly)
      return { ok: false, error: "This offer is for ISLA member schools. Sign in to your dashboard to claim it." }
    if (!allow(`offer:${await clientKey()}`, 5, WINDOW)) return TOO_MANY
  }

  // Claiming again just shows the steps again.
  const existing = (await repos.offers.listClaims({ offerId: offer.id, schoolId: school?.id })).find(
    (c) => school || (!c.schoolId && c.contactEmail.toLowerCase() === contact.contactEmail.toLowerCase()),
  )
  if (existing) return { ok: true, redemption: offer.redemption }

  const blocker = claimBlocker(offer, offerPhase(offer, isoToday()), school?.membership.status ?? "active", false)
  if (blocker) return { ok: false, error: blocker }

  await repos.offers.claim(offer.id, {
    ...contact,
    schoolId: school?.id ?? null,
    schoolName: school?.name ?? schoolName,
  })
  updateTag(OFFERS_TAG)
  return { ok: true, redemption: offer.redemption }
}

/** Creates (id = null) or updates an offer. New offers start as drafts. */
export async function saveOffer(id: string | null, input: unknown): Promise<ActionResult> {
  if (!(await isStaff())) return STAFF_ONLY
  const parsed = OfferInputSchema.safeParse(input)
  if (!parsed.success) return invalid(parsed.error)

  if (id) await repos.offers.updateOffer(id, parsed.data)
  else await repos.offers.createOffer(parsed.data)
  updateTag(OFFERS_TAG)
  return { ok: true }
}

const OfferPatchSchema = z.object({ status: OfferStatusSchema, featured: z.boolean() }).partial()

export async function patchOffer(id: string, patch: unknown): Promise<ActionResult> {
  if (!(await isStaff())) return STAFF_ONLY
  const parsed = OfferPatchSchema.safeParse(patch)
  if (!parsed.success) return invalid(parsed.error)

  await repos.offers.patchOffer(id, parsed.data)
  updateTag(OFFERS_TAG)
  return { ok: true }
}

export async function setClaimStatus(claimId: string, status: unknown): Promise<ActionResult> {
  if (!(await isStaff())) return STAFF_ONLY
  const parsed = ClaimStatusSchema.safeParse(status)
  if (!parsed.success) return invalid(parsed.error)

  await repos.offers.setClaimStatus(claimId, parsed.data)
  updateTag(OFFERS_TAG)
  return { ok: true }
}
