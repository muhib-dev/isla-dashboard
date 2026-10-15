import type { MembershipStatus } from "@/features/schools/schema"
import { fmt } from "@/lib/format"
import type { Claim, Offer } from "./schema"

export type OfferPhase = "draft" | "paused" | "upcoming" | "live" | "ending_soon" | "expired"

/** Offers inside this many days of their end date are flagged "ending soon". */
export const ENDING_SOON_DAYS = 14

const DAY = 86_400_000

export function isoToday(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10)
}

/** Whole days from `today` to `date` (both ISO dates). Negative once the date has passed. */
export function daysUntil(date: string, today: string) {
  return Math.round((Date.parse(date) - Date.parse(today)) / DAY)
}

/** Where an offer is in its lifecycle. Staff status wins over dates; the redeem window is inclusive. */
export function offerPhase(offer: Pick<Offer, "status" | "startsOn" | "endsOn">, today: string): OfferPhase {
  if (offer.status !== "active") return offer.status
  if (today < offer.startsOn) return "upcoming"
  if (today > offer.endsOn) return "expired"
  return daysUntil(offer.endsOn, today) <= ENDING_SOON_DAYS ? "ending_soon" : "live"
}

export const isClaimable = (phase: OfferPhase) => phase === "live" || phase === "ending_soon"

/** Membership statuses that unlock members-only offers. */
export const isMember = (status: MembershipStatus) => status === "active" || status === "grace"

/** Why a school can't claim an offer, or null if it can. Shared by the claim action and the catalog UI. */
export function claimBlocker(
  offer: Pick<Offer, "membersOnly" | "startsOn">,
  phase: OfferPhase,
  membership: MembershipStatus,
  alreadyClaimed: boolean,
): string | null {
  if (alreadyClaimed) return "Your school already claimed this offer."
  if (phase === "upcoming") return `Opens ${fmt.date(offer.startsOn)}.`
  if (!isClaimable(phase)) return "This offer is no longer available."
  if (offer.membersOnly && !isMember(membership)) return "Members only. Renew your ISLA membership to claim."
  return null
}

/** Hides the promo code until the school has claimed the offer, so it never reaches the browser early. */
export function redactRedemption<T extends Pick<Offer, "redemption">>(offer: T): T {
  if (offer.redemption.code === undefined) return offer
  return { ...offer, redemption: { ...offer.redemption, code: undefined } }
}

export function claimsInLastDays(claims: Pick<Claim, "claimedAt">[], days: number, now = Date.now()) {
  const since = now - days * DAY
  return claims.filter((c) => Date.parse(c.claimedAt) >= since).length
}
