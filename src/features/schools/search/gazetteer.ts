import places from "../../../data/geo/places.json"
import { normalize, tokenize } from "./normalize"
import { stateCode } from "./states"

export type Place = { name: string; state: string; country: "US" | "CA"; lat: number; lng: number; pop: number }
export type PlaceIndex = { p: Place; key: string }[]

/** A resolved search center. `alternatives` lists other places with the same name. */
export type GeoHit = { lat: number; lng: number; label: string; alternatives?: Place[] }
/** Resolved lookups by `geoKey`. `null` = looked up and not found (stops retry loops). */
export type GeoContext = { resolved: Record<string, GeoHit | null> }

export const placeLabel = (p: Place) => `${p.name}, ${p.state}`

export function buildIndex(list: Place[]): PlaceIndex {
  return list.map((p) => ({ p, key: tokenize(p.name).join(" ") }))
}

/** 81 hand-picked cities that ship in the bundle; enough for the seed data and instant first paint. */
export const BASE_PLACES = places as Place[]
const BASE_INDEX = buildIndex(BASE_PLACES)

/** Compact rows from public/geo/places.json → Place[]. */
export function placesFromRows(rows: [string, string, 0 | 1, number, number, number][]): Place[] {
  return rows.map(([name, state, c, lat, lng, pop]) => ({ name, state, country: c ? "CA" : "US", lat, lng, pop }))
}

export type CodeKind = { kind: "zip" | "fsa"; key: string }

/** 78704, 78704-1234, T5A, t5a 1b2 → a lookup key. Anything else → null. */
export function parseCode(input: string): CodeKind | null {
  const t = input.trim()
  if (/^\d{5}(-\d{4})?$/.test(t)) return { kind: "zip", key: t.slice(0, 5) }
  const m = /^([a-z]\d[a-z])(?:[ -]?\d[a-z]\d)?$/i.exec(t)
  if (m) return { kind: "fsa", key: m[1].toUpperCase() }
  return null
}

/** Stable key for GeoContext.resolved. */
export function geoKey(text: string): string {
  const code = parseCode(text)
  return code ? `code:${code.key}` : `place:${normalize(text)}`
}

/**
 * Resolves "Dallas", "Dallas, TX", "dallas tx", "Springfield, Illinois".
 * Ambiguous names (Springfield) resolve to the most populous match and list the rest.
 */
export function resolvePlace(input: string, index: PlaceIndex = BASE_INDEX): GeoHit | null {
  const text = input.trim()
  if (!text) return null
  let namePart = text
  let st: string | null = null
  const comma = text.lastIndexOf(",")
  if (comma > 0) {
    st = stateCode(text.slice(comma + 1))
    if (st) namePart = text.slice(0, comma)
  } else {
    // "dallas tx" / "springfield illinois": peel a trailing state off.
    const words = normalize(text).split(" ")
    for (let take = Math.min(3, words.length - 1); take >= 1; take--) {
      const code = stateCode(words.slice(-take).join(" "))
      if (code) { st = code; namePart = words.slice(0, -take).join(" "); break }
    }
  }
  const key = tokenize(namePart).join(" ")
  if (!key) return null
  let hits = index.filter((e) => e.key === key).map((e) => e.p)
  if (st) hits = hits.filter((p) => p.state === st)
  if (!hits.length) return null
  hits.sort((a, b) => b.pop - a.pop)
  const [first, ...rest] = hits
  return { lat: first.lat, lng: first.lng, label: placeLabel(first), alternatives: rest }
}

/** Prefix matches for the search-box suggestions, most populous first. */
export function suggestPlaces(input: string, index: PlaceIndex, limit = 5): Place[] {
  const key = tokenize(input.replace(/,.*$/, "")).join(" ")
  if (key.length < 2) return []
  const st = input.includes(",") ? stateCode(input.slice(input.lastIndexOf(",") + 1)) : null
  const out: Place[] = []
  for (const e of index) {
    if (e.key.startsWith(key) && (!st || e.p.state === st)) out.push(e.p)
  }
  return out.sort((a, b) => b.pop - a.pop).slice(0, limit)
}

export const allPlaces = BASE_PLACES
