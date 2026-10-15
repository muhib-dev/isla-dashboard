import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { repos } from "@/server/repositories"
import {
  claimBlocker,
  claimsInLastDays,
  daysUntil,
  isClaimable,
  isoToday,
  offerPhase,
  redactRedemption,
  type OfferPhase,
} from "./lib"
import type { Claim, Offer } from "./schema"

export const OFFERS_TAG = "offers"

const PHASE_ORDER: Record<OfferPhase, number> = { ending_soon: 0, live: 1, upcoming: 2, draft: 3, paused: 4, expired: 5 }

const byFeaturedThenPhase = (
  a: Offer & { phase: OfferPhase },
  b: Offer & { phase: OfferPhase },
) => Number(b.featured) - Number(a.featured) || PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] || a.endsOn.localeCompare(b.endsOn)

export type OfferRow = Offer & { phase: OfferPhase; daysLeft: number; claims: number; redeemed: number }

/** Staff view: every offer with its claim counts, plus network-wide totals. */
export async function getOfferAdmin() {
  "use cache"
  cacheLife("minutes")
  cacheTag(OFFERS_TAG)
  const now = Date.now()
  const today = isoToday(now)
  const [offers, claims] = await Promise.all([repos.offers.listOffers(), repos.offers.listClaims({})])

  const rows: OfferRow[] = offers
    .map((offer) => {
      const own = claims.filter((c) => c.offerId === offer.id)
      return {
        ...offer,
        phase: offerPhase(offer, today),
        daysLeft: daysUntil(offer.endsOn, today),
        claims: own.length,
        redeemed: own.filter((c) => c.status === "redeemed").length,
      }
    })
    .sort((a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] || a.endsOn.localeCompare(b.endsOn))

  const partners = new Map<string, { partner: string; claimed: number; redeemed: number }>()
  for (const row of rows) {
    const entry = partners.get(row.partner.name) ?? { partner: row.partner.name, claimed: 0, redeemed: 0 }
    entry.claimed += row.claims - row.redeemed
    entry.redeemed += row.redeemed
    partners.set(row.partner.name, entry)
  }

  return {
    rows,
    byPartner: [...partners.values()]
      .filter((p) => p.claimed + p.redeemed > 0)
      .sort((a, b) => b.claimed + b.redeemed - (a.claimed + a.redeemed)),
    stats: {
      live: rows.filter((r) => isClaimable(r.phase)).length,
      claims: claims.length,
      last30: claimsInLastDays(claims, 30, now),
      // Anonymous claims count once per contact email.
      schools: new Set(claims.map((c) => c.schoolId ?? c.contactEmail.toLowerCase())).size,
      redeemed: claims.filter((c) => c.status === "redeemed").length,
    },
  }
}

/** One offer with every school that claimed it (staff only). */
export async function getOfferDetail(id: string) {
  "use cache"
  cacheLife("minutes")
  cacheTag(OFFERS_TAG)
  const today = isoToday()
  const offer = await repos.offers.getOffer(id)
  if (!offer) return null
  const [claims, schools] = await Promise.all([repos.offers.listClaims({ offerId: id }), repos.schools.list({})])
  const places = new Map(schools.map((s) => [s.id, `${s.city}, ${s.state}`]))
  return {
    offer: { ...offer, phase: offerPhase(offer, today), daysLeft: daysUntil(offer.endsOn, today) },
    claims: claims.map((c) => ({
      ...c,
      schoolPlace: c.schoolId ? (places.get(c.schoolId) ?? "") : "Public form",
    })),
  }
}

export type PublicOffer = Offer & {
  phase: OfferPhase
  daysLeft: number
  /** Why nobody can claim it right now (not open yet), or null. Membership is checked on claim. */
  blocker: string | null
}

/** Public page: published offers that haven't ended. Promo codes are stripped. Safe for anonymous visitors. */
export async function getPublicOffers() {
  "use cache"
  cacheLife("minutes")
  cacheTag(OFFERS_TAG)
  const today = isoToday()
  const offers = await repos.offers.listOffers()
  return offers
    .flatMap((offer): PublicOffer[] => {
      const phase = offerPhase(offer, today)
      if (offer.status !== "active" || phase === "expired") return []
      return [
        redactRedemption({
          ...offer,
          phase,
          daysLeft: daysUntil(offer.endsOn, today),
          blocker: claimBlocker(offer, phase, "active", false),
        }),
      ]
    })
    .sort(byFeaturedThenPhase)
}

export type ClaimedOffer = Offer & { phase: OfferPhase; daysLeft: number; claim: Claim }

/** Dashboard: the offers a school has claimed, with their redemption steps. */
export async function getSchoolClaims(schoolId: string) {
  "use cache"
  cacheLife("minutes")
  cacheTag(OFFERS_TAG)
  const today = isoToday()
  const [offers, claims] = await Promise.all([repos.offers.listOffers(), repos.offers.listClaims({ schoolId })])
  const byId = new Map(offers.map((o) => [o.id, o]))
  return claims.flatMap((claim): ClaimedOffer[] => {
    const offer = byId.get(claim.offerId)
    if (!offer) return []
    return [{ ...offer, phase: offerPhase(offer, today), daysLeft: daysUntil(offer.endsOn, today), claim }]
  })
}
