import { ENROLLMENT_BANDS, FEATURES, LISTING_STATUSES, REGIONS, SCHOOL_TYPES, PROFILE_SECTIONS, FRESHNESS } from "../schema"
import { DQ_FLAGS, type SchoolSearchDoc } from "./doc"
import { servesAll } from "./grades"
import { PROGRAM_TAGS } from "./labels"
import { normalize } from "./normalize"
import type { RangeField, RangeFilter, SearchState } from "./state"

export function rangeValue(doc: SchoolSearchDoc, field: RangeField): number | null {
  switch (field) {
    case "tuition": return doc.tuition
    case "founded": return doc.founded
    case "teachers": return doc.teachers
    case "retention": return doc.retention === null ? null : Math.round(doc.retention * 1000) / 10
    case "salary": return doc.salary
  }
}

/** Smallest and largest value of each numeric field across `docs`; null when no school has one. */
export function rangeExtents(docs: SchoolSearchDoc[], fields: readonly RangeField[]): Partial<Record<RangeField, { min: number; max: number }>> {
  const out: Partial<Record<RangeField, { min: number; max: number }>> = {}
  for (const f of fields) {
    let min = Infinity
    let max = -Infinity
    for (const d of docs) {
      const v = rangeValue(d, f)
      if (v === null) continue
      if (v < min) min = v
      const top = f === "tuition" ? (d.tuitionMax ?? v) : v
      if (top > max) max = top
    }
    if (min <= max) out[f] = { min, max }
  }
  return out
}

/** A published tuition range matches when it overlaps the wanted one. */
function passesTuition(doc: SchoolSearchDoc, r: RangeFilter): boolean {
  if (r.min === undefined && r.max === undefined) return true
  if (doc.tuition === null) return !!r.unknown
  const hi = doc.tuitionMax ?? doc.tuition
  return (r.min === undefined || hi >= r.min) && (r.max === undefined || doc.tuition <= r.max)
}

function passesRange(v: number | null, r: RangeFilter): boolean {
  if (r.min === undefined && r.max === undefined) return true
  if (v === null) return !!r.unknown
  return (r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max)
}

const agencyKey = (s: string) => normalize(s)

/** Closed schools only show when asked for. */
export function listingAllowed(doc: SchoolSearchDoc, s: SearchState): boolean {
  return s.listing.length ? s.listing.includes(doc.listing) : doc.listing !== "closed"
}

export function passesFacets(doc: SchoolSearchDoc, s: SearchState): boolean {
  if (!listingAllowed(doc, s)) return false
  if (s.region.length && !s.region.includes(doc.region)) return false
  if (s.state.length && !s.state.includes(doc.state.toUpperCase())) return false
  if (s.country.length && !s.country.includes(doc.country)) return false
  if (s.status.length && !s.status.includes(doc.membership.status)) return false
  if (s.freshness.length && !s.freshness.includes(doc.freshness)) return false
  if (s.type.length && !s.type.includes(doc.schoolType)) return false

  if (s.grade !== null) {
    const span = doc.gradeFrom !== null && doc.gradeTo !== null ? { from: doc.gradeFrom, to: doc.gradeTo } : null
    if (!span) return false
    const want = { from: Math.min(s.grade, s.gradeTo ?? s.grade), to: Math.max(s.grade, s.gradeTo ?? s.grade) }
    if (s.gradeMode === "overlaps" && s.gradeTo !== null ? !(span.from <= want.to && span.to >= want.from) : !servesAll(span, want)) return false
  }

  if (s.accredited === "yes" && !doc.accreditation.length) return false
  if (s.accredited === "no" && doc.accreditation.length) return false
  if (s.agency.length) {
    const have = new Set(doc.accreditation.map(agencyKey))
    const want = s.agency.map(agencyKey)
    if (!(s.agencyAll ? want.every((a) => have.has(a)) : want.some((a) => have.has(a)))) return false
  }

  for (const t of s.yes) if (!doc.tags.includes(t)) return false
  for (const t of s.no) if (doc.tags.includes(t)) return false
  if (s.features.length) {
    const ok = s.featuresAny ? s.features.some((f) => doc.features.includes(f)) : s.features.every((f) => doc.features.includes(f))
    if (!ok) return false
  }

  if (s.enrollBand.length && !(doc.enrollmentBand && s.enrollBand.includes(doc.enrollmentBand))) return false
  for (const [field, r] of Object.entries(s.ranges) as [RangeField, RangeFilter][]) {
    if (!(field === "tuition" ? passesTuition(doc, r) : passesRange(rangeValue(doc, field), r))) return false
  }

  if (s.fridayEarly !== null && doc.fridayEarly !== s.fridayEarly) return false
  if (s.startAfter !== null && (doc.startMinutes === null || doc.startMinutes < s.startAfter)) return false
  if (s.startBefore !== null && (doc.startMinutes === null || doc.startMinutes > s.startBefore)) return false
  if (s.firstDay && (s.firstDay.from || s.firstDay.to)) {
    const d = doc.firstDay
    if (d === null || (s.firstDay.from && d < s.firstDay.from) || (s.firstDay.to && d > s.firstDay.to)) return false
  }

  for (const f of s.dq) if (!doc.dq.includes(f)) return false
  if (s.staleSection.length && !s.staleSection.some((x) => doc.staleSections.includes(x))) return false
  return true
}

export type FacetGroupKey = "enrollBand" | "region" | "state" | "country" | "status" | "freshness" | "type" | "listing" | "agency" | "features" | "programs" | "dq" | "staleSection"

type Group = {
  /** State with this facet cleared, so each option's count reflects "if I picked this instead". */
  clear: (s: SearchState) => SearchState
  options: (docs: SchoolSearchDoc[]) => string[]
  has: (doc: SchoolSearchDoc, value: string) => boolean
}

const dedupe = (v: string[]) => [...new Set(v)].sort((a, b) => a.localeCompare(b))

export const FACET_GROUPS: Record<FacetGroupKey, Group> = {
  enrollBand: { clear: (s) => ({ ...s, enrollBand: [] }), options: () => [...ENROLLMENT_BANDS], has: (d, v) => d.enrollmentBand === v },
  region: { clear: (s) => ({ ...s, region: [] }), options: () => [...REGIONS], has: (d, v) => d.region === v },
  state: { clear: (s) => ({ ...s, state: [] }), options: (docs) => dedupe(docs.map((d) => d.state.toUpperCase())), has: (d, v) => d.state.toUpperCase() === v },
  country: { clear: (s) => ({ ...s, country: [] }), options: () => ["US", "CA"], has: (d, v) => d.country === v },
  status: { clear: (s) => ({ ...s, status: [] }), options: () => ["active", "grace", "lapsed", "non_member"], has: (d, v) => d.membership.status === v },
  freshness: { clear: (s) => ({ ...s, freshness: [] }), options: () => [...FRESHNESS], has: (d, v) => d.freshness === v },
  type: { clear: (s) => ({ ...s, type: [] }), options: () => [...SCHOOL_TYPES], has: (d, v) => d.schoolType === v },
  // Clearing "listing" means "show everything", otherwise the closed count would always read 0.
  listing: { clear: (s) => ({ ...s, listing: [...LISTING_STATUSES] }), options: () => [...LISTING_STATUSES], has: (d, v) => d.listing === v },
  agency: {
    clear: (s) => ({ ...s, agency: [], accredited: null }),
    options: (docs) => dedupe(docs.flatMap((d) => d.accreditation)),
    has: (d, v) => d.accreditation.some((a) => agencyKey(a) === agencyKey(v)),
  },
  features: { clear: (s) => ({ ...s, features: [] }), options: () => [...FEATURES], has: (d, v) => d.features.includes(v as never) },
  programs: { clear: (s) => ({ ...s, yes: [], no: [] }), options: () => [...PROGRAM_TAGS], has: (d, v) => d.tags.includes(v) },
  dq: { clear: (s) => ({ ...s, dq: [] }), options: () => [...DQ_FLAGS], has: (d, v) => d.dq.includes(v as never) },
  staleSection: { clear: (s) => ({ ...s, staleSection: [] }), options: () => [...PROFILE_SECTIONS], has: (d, v) => d.staleSections.includes(v as never) },
}

export type FacetCounts = Record<FacetGroupKey, Record<string, number>>

/**
 * For each facet group: run the search with just that group cleared and count how many
 * results carry each option. Options that would return nothing show (0) instead of dead-ending.
 */
export function facetCounts(docs: SchoolSearchDoc[], state: SearchState, search: (s: SearchState) => SchoolSearchDoc[]): FacetCounts {
  const out = {} as FacetCounts
  for (const key of Object.keys(FACET_GROUPS) as FacetGroupKey[]) {
    const group = FACET_GROUPS[key]
    const rows = search(group.clear(state))
    const counts: Record<string, number> = {}
    for (const v of group.options(docs)) counts[v] = rows.reduce((n, d) => n + (group.has(d, v) ? 1 : 0), 0)
    out[key] = counts
  }
  return out
}
