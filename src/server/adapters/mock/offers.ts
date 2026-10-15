import "server-only"
import { offerFromInput } from "@/features/offers/schema"
import type { OfferRepository } from "@/server/repositories/types"
import { latency, tables } from "./store"

const byNewestClaim = (a: { claimedAt: string }, b: { claimedAt: string }) => b.claimedAt.localeCompare(a.claimedAt)

function findOffer(id: string) {
  const index = tables.offers.findIndex((o) => o.id === id)
  if (index === -1) throw new Error(`Offer ${id} not found`)
  return index
}

export function createMockOfferRepository(latencyMs: number): OfferRepository {
  return {
    async listOffers() {
      await latency(latencyMs)
      return tables.offers
    },

    async getOffer(id) {
      await latency(latencyMs)
      return tables.offers.find((o) => o.id === id) ?? null
    },

    async createOffer(input) {
      await latency(latencyMs)
      const offer = offerFromInput(input, {
        id: `offer_${Date.now().toString(36)}`,
        status: "draft",
        createdAt: new Date().toISOString().slice(0, 10),
      })
      tables.offers.push(offer)
      return offer
    },

    async updateOffer(id, input) {
      await latency(latencyMs)
      const index = findOffer(id)
      const offer = offerFromInput(input, tables.offers[index])
      tables.offers[index] = offer
      return offer
    },

    async patchOffer(id, patch) {
      await latency(latencyMs)
      const index = findOffer(id)
      const offer = { ...tables.offers[index], ...patch }
      tables.offers[index] = offer
      return offer
    },

    async listClaims({ schoolId, offerId }) {
      await latency(latencyMs)
      return tables.claims
        .filter((c) => (!schoolId || c.schoolId === schoolId) && (!offerId || c.offerId === offerId))
        .sort(byNewestClaim)
    },

    async claim(offerId, input) {
      await latency(latencyMs)
      const existing = tables.claims.find(
        (c) =>
          c.offerId === offerId &&
          (input.schoolId
            ? c.schoolId === input.schoolId
            : c.contactEmail.toLowerCase() === input.contactEmail.toLowerCase()),
      )
      if (existing) return existing
      const claim = {
        id: `claim_${Date.now().toString(36)}`,
        offerId,
        ...input,
        claimedAt: new Date().toISOString(),
        status: "claimed" as const,
      }
      tables.claims.push(claim)
      return claim
    },

    async setClaimStatus(id, status) {
      await latency(latencyMs)
      const index = tables.claims.findIndex((c) => c.id === id)
      if (index === -1) throw new Error(`Claim ${id} not found`)
      const claim = {
        ...tables.claims[index],
        status,
        redeemedAt: status === "redeemed" ? new Date().toISOString() : undefined,
      }
      tables.claims[index] = claim
      return claim
    },
  }
}
