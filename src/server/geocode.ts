import "server-only"
import { env } from "@/config/env"
import type { Geo } from "@/features/schools/schema"
import { lookupText } from "@/features/schools/search/geo-server"
import { resolvePlace } from "@/features/schools/search/gazetteer"

export type GeocodeResult =
  | { ok: true; lat: number; lng: number; label: string; exact: boolean }
  | { ok: false; reason: "unavailable" | "not_found" | "error" }

/**
 * Nominatim (OpenStreetMap) geocoder. Their policy: max 1 request/second, an identifying
 * User-Agent, no autocomplete, cache results. So: one serial queue, results cached in memory,
 * and it's only called on explicit submit or when a school's address changes.
 */
const MIN_GAP_MS = 1_100
const CACHE_LIMIT = 500
const g = globalThis as typeof globalThis & {
  __islaGeoCache?: Map<string, GeocodeResult>
  __islaGeoQueue?: Promise<unknown>
}
const cache = (g.__islaGeoCache ??= new Map())

export function geocoderEnabled() {
  return Boolean(env.GEOCODER_CONTACT)
}

export async function geocode(query: string): Promise<GeocodeResult> {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 200)
  if (!q) return { ok: false, reason: "not_found" }
  if (!env.GEOCODER_CONTACT) return { ok: false, reason: "unavailable" }
  const key = q.toLowerCase()
  const cached = cache.get(key)
  if (cached) return cached

  // Chain onto the previous request so concurrent callers can't exceed the rate limit.
  const run = async (): Promise<GeocodeResult> => {
    try {
      const url = new URL("/search", env.GEOCODER_URL)
      url.search = new URLSearchParams({ q, format: "jsonv2", limit: "1", addressdetails: "1", countrycodes: "us,ca" }).toString()
      const res = await fetch(url, {
        headers: { "User-Agent": `ISLA-Dashboard/1.0 (${env.GEOCODER_CONTACT})`, Accept: "application/json" },
        signal: AbortSignal.timeout(6_000),
      })
      if (!res.ok) return { ok: false, reason: "error" } // 429/5xx: don't cache, let a later call retry
      const rows = (await res.json()) as { lat: string; lon: string; display_name: string; address?: { house_number?: string } }[]
      const top = rows[0]
      if (!top) return { ok: false, reason: "not_found" }
      const result: GeocodeResult = { ok: true, lat: Number(top.lat), lng: Number(top.lon), label: top.display_name, exact: Boolean(top.address?.house_number) }
      if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
      cache.set(key, result)
      return result
    } catch {
      return { ok: false, reason: "error" }
    }
  }
  const prev = (g.__islaGeoQueue ?? Promise.resolve()) as Promise<unknown>
  const next = prev.then(run, run)
  g.__islaGeoQueue = next.then(() => new Promise((r) => setTimeout(r, MIN_GAP_MS)))
  return next
}

type Address = { street: string; city: string; state: string; postalCode: string; country: "US" | "CA" }

/** Best location we can get for an address: exact → postal centroid → city centroid → none. */
export async function geocodeAddress(a: Address): Promise<Geo> {
  const today = new Date().toISOString().slice(0, 10)
  const exact = await geocode(`${a.street}, ${a.city}, ${a.state} ${a.postalCode}`)
  if (exact.ok && exact.exact) return { lat: exact.lat, lng: exact.lng, precision: "rooftop", source: "nominatim", updatedAt: today }
  try {
    const postal = await lookupText(a.postalCode)
    if (postal) return { lat: postal.lat, lng: postal.lng, precision: "postal", source: "gazetteer", updatedAt: today }
    const city = (await lookupText(`${a.city}, ${a.state}`)) ?? resolvePlace(`${a.city}, ${a.state}`)
    if (city) return { lat: city.lat, lng: city.lng, precision: "city", source: "gazetteer", updatedAt: today }
  } catch {
    // fall through to "none"
  }
  // A street that Nominatim found, but not at house level, is still better than nothing.
  if (exact.ok) return { lat: exact.lat, lng: exact.lng, precision: "city", source: "nominatim", updatedAt: today }
  return { lat: 0, lng: 0, precision: "none", source: "gazetteer", updatedAt: today }
}
