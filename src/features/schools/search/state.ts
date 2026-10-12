import {
  FEATURES,
  FRESHNESS,
  LISTING_STATUSES,
  MembershipStatusSchema,
  PROFILE_SECTIONS,
  REGIONS,
  SCHOOL_TYPES,
  type Feature,
  type Freshness,
  type ListingStatus,
  type MembershipStatus,
  type ProfileSection,
  type Region,
  type SchoolType,
} from "../schema"
import { DQ_FLAGS, type DataQualityFlag } from "./doc"
import { gradeIndex, gradeLabel } from "./grades"
import { clampRadius, type Bounds, type Unit } from "./geo"
import { PROGRAM_TAGS, type ProgramTag } from "./labels"
import { MAX_QUERY_LENGTH } from "./parse-query"
import { STATES } from "./states"

export const SORT_KEYS = ["relevance", "distance", "name", "enrollment", "tuition", "founded", "verified", "stale"] as const
export type SortKey = (typeof SORT_KEYS)[number]
export const VIEWS = ["list", "map", "split"] as const
export type View = (typeof VIEWS)[number]

export const RANGE_FIELDS = ["tuition", "enrollment", "founded", "teachers", "retention", "salary"] as const
export type RangeField = (typeof RANGE_FIELDS)[number]
/** `unknown: true` keeps schools that have no value for the field. Retention is in percent. */
export type RangeFilter = { min?: number; max?: number; unknown?: boolean }
export type GradeMode = "covers" | "overlaps"

export type Center = { lat: number; lng: number; label?: string }
export type MapView = { lat: number; lng: number; zoom: number }

export type SearchState = {
  q: string
  region: Region[]
  state: string[]
  country: ("US" | "CA")[]
  status: MembershipStatus[]
  freshness: Freshness[]
  type: SchoolType[]
  /** Empty = open + pending (closed schools are opt-in). */
  listing: ListingStatus[]
  /** Grade ladder index. With `gradeTo` it's a range, matched by `gradeMode`. */
  grade: number | null
  gradeTo: number | null
  gradeMode: GradeMode
  accredited: "yes" | "no" | null
  agency: string[]
  agencyAll: boolean
  /** Programs the school must / must not have. */
  yes: ProgramTag[]
  no: ProgramTag[]
  features: Feature[]
  /** false (default) = school must have every selected feature. */
  featuresAny: boolean
  ranges: Partial<Record<RangeField, RangeFilter>>
  fridayEarly: boolean | null
  startAfter: number | null
  startBefore: number | null
  dq: DataQualityFlag[]
  staleSection: ProfileSection[]
  bounds: Bounds | null
  sort: SortKey | null
  view: View | null
  center: Center | null
  radius: number
  unit: Unit
  map: MapView | null
}

export const DEFAULT_RADIUS = 25

export const EMPTY_STATE: SearchState = {
  q: "", region: [], state: [], country: [], status: [], freshness: [], type: [], listing: [],
  grade: null, gradeTo: null, gradeMode: "covers",
  accredited: null, agency: [], agencyAll: false, yes: [], no: [], features: [], featuresAny: false,
  ranges: {}, fridayEarly: null, startAfter: null, startBefore: null, dq: [], staleSection: [],
  bounds: null, sort: null, view: null, center: null, radius: DEFAULT_RADIUS, unit: "mi", map: null,
}

type Params = URLSearchParams | Record<string, string | string[] | undefined>

function get(p: Params, key: string): string | undefined {
  if (p instanceof URLSearchParams) return p.get(key) ?? undefined
  const v = p[key]
  return Array.isArray(v) ? v[0] : v
}

const csv = (v: string | undefined) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [])
const num = (v: string | undefined) => {
  if (v === undefined || v.trim() === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
const oneOf = <T extends string>(list: readonly T[], v: string[]): T[] => [...new Set(v.filter((x): x is T => (list as readonly string[]).includes(x)))]

function nums(v: string | undefined, n: number): number[] | null {
  const parts = csv(v).map(Number)
  return parts.length === n && parts.every(Number.isFinite) ? parts : null
}

/** "5000..9000", "5000..", "..9000", any of them with ",u" to keep schools with no value. */
function parseRangeParam(v: string | undefined): RangeFilter | null {
  if (!v) return null
  const unknown = /,u$/.test(v)
  const m = /^(-?\d*\.?\d*)\.\.(-?\d*\.?\d*)$/.exec(v.replace(/,u$/, ""))
  if (!m || (!m[1] && !m[2])) return null
  let min = m[1] === "" ? undefined : Number(m[1])
  let max = m[2] === "" ? undefined : Number(m[2])
  if ((min !== undefined && !Number.isFinite(min)) || (max !== undefined && !Number.isFinite(max))) return null
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min]
  return { ...(min !== undefined && { min }), ...(max !== undefined && { max }), ...(unknown && { unknown }) }
}

const RANGE_PARAM: Record<RangeField, string> = { tuition: "tuition", enrollment: "enr", founded: "found", teachers: "tch", retention: "ret", salary: "sal" }
const MAX_MINUTES = 24 * 60 - 1

/**
 * Lenient parse: every key is validated on its own, so one bad or tampered
 * param is dropped without resetting the rest. Unknown params are ignored.
 */
export function parseSearchState(p: Params): SearchState {
  const s: SearchState = { ...EMPTY_STATE, ranges: {} }
  s.q = (get(p, "q") ?? "").slice(0, MAX_QUERY_LENGTH)
  s.region = oneOf(REGIONS, csv(get(p, "region")))
  s.state = [...new Set(csv(get(p, "st")).map((x) => x.toUpperCase()).filter((x) => x in STATES))]
  s.country = oneOf(["US", "CA"] as const, csv(get(p, "cn")).map((x) => x.toUpperCase()))
  s.status = csv(get(p, "status")).filter((x): x is MembershipStatus => MembershipStatusSchema.safeParse(x).success).filter((x, i, a) => a.indexOf(x) === i)
  s.freshness = oneOf(FRESHNESS, csv(get(p, "fresh")))
  s.type = oneOf(SCHOOL_TYPES, csv(get(p, "type")))
  s.listing = oneOf(LISTING_STATUSES, csv(get(p, "list")))

  const g = get(p, "grade")
  s.grade = g ? gradeIndex(g) : null
  const gto = get(p, "gto")
  s.gradeTo = s.grade !== null && gto ? gradeIndex(gto) : null
  s.gradeMode = get(p, "gm") === "overlaps" ? "overlaps" : "covers"

  const acc = get(p, "acc")
  s.accredited = acc === "yes" || acc === "no" ? acc : null
  s.agency = [...new Set(csv(get(p, "ag")).map((a) => a.slice(0, 60)))].slice(0, 10)
  s.agencyAll = get(p, "agall") === "1"
  s.yes = oneOf(PROGRAM_TAGS, csv(get(p, "py")))
  s.no = oneOf(PROGRAM_TAGS, csv(get(p, "pn"))).filter((t) => !s.yes.includes(t))
  s.features = oneOf(FEATURES, csv(get(p, "ft")))
  s.featuresAny = get(p, "fany") === "1"

  for (const f of RANGE_FIELDS) {
    const r = parseRangeParam(get(p, RANGE_PARAM[f]))
    if (r) s.ranges[f] = r
  }
  const fe = get(p, "fe")
  s.fridayEarly = fe === "1" ? true : fe === "0" ? false : null
  const clampMin = (v: number | null) => (v === null ? null : Math.min(MAX_MINUTES, Math.max(0, Math.round(v))))
  s.startAfter = clampMin(num(get(p, "sa")))
  s.startBefore = clampMin(num(get(p, "sb")))
  s.dq = oneOf(DQ_FLAGS, csv(get(p, "dq")))
  s.staleSection = oneOf(PROFILE_SECTIONS, csv(get(p, "vs")))

  const b = nums(get(p, "b"), 4)
  if (b && Math.abs(b[0]) <= 90 && Math.abs(b[2]) <= 90 && Math.abs(b[1]) <= 180 && Math.abs(b[3]) <= 180 && b[0] <= b[2]) {
    s.bounds = { south: b[0], west: b[1], north: b[2], east: b[3] }
  }

  const sort = get(p, "sort")
  s.sort = (SORT_KEYS as readonly string[]).includes(sort ?? "") ? (sort as SortKey) : null
  const view = get(p, "view")
  s.view = (VIEWS as readonly string[]).includes(view ?? "") ? (view as View) : null
  const ll = nums(get(p, "ll"), 2)
  if (ll && Math.abs(ll[0]) <= 90 && Math.abs(ll[1]) <= 180) s.center = { lat: ll[0], lng: ll[1], label: get(p, "ln")?.slice(0, 60) || undefined }
  const r = num(get(p, "r"))
  if (r !== null) s.radius = clampRadius(r)
  s.unit = get(p, "u") === "km" ? "km" : "mi"
  const m = nums(get(p, "m"), 3)
  if (m && Math.abs(m[0]) <= 90 && Math.abs(m[1]) <= 180 && m[2] >= 1 && m[2] <= 19) s.map = { lat: m[0], lng: m[1], zoom: Math.round(m[2]) }
  return s
}

const round = (n: number, d = 4) => String(Math.round(n * 10 ** d) / 10 ** d)

/** Omits defaults so shared links stay short. */
export function serializeSearchState(s: SearchState): URLSearchParams {
  const out = new URLSearchParams()
  const list = (key: string, v: readonly string[]) => v.length && out.set(key, v.join(","))
  if (s.q.trim()) out.set("q", s.q)
  list("region", s.region)
  list("st", s.state)
  list("cn", s.country)
  list("status", s.status)
  list("fresh", s.freshness)
  list("type", s.type)
  list("list", s.listing)
  if (s.grade !== null) {
    out.set("grade", gradeLabel(s.grade))
    if (s.gradeTo !== null) {
      out.set("gto", gradeLabel(s.gradeTo))
      if (s.gradeMode === "overlaps") out.set("gm", "overlaps")
    }
  }
  if (s.accredited) out.set("acc", s.accredited)
  list("ag", s.agency)
  if (s.agency.length > 1 && s.agencyAll) out.set("agall", "1")
  list("py", s.yes)
  list("pn", s.no)
  list("ft", s.features)
  if (s.features.length > 1 && s.featuresAny) out.set("fany", "1")
  for (const f of RANGE_FIELDS) {
    const r = s.ranges[f]
    if (r && (r.min !== undefined || r.max !== undefined)) out.set(RANGE_PARAM[f], `${r.min ?? ""}..${r.max ?? ""}${r.unknown ? ",u" : ""}`)
  }
  if (s.fridayEarly !== null) out.set("fe", s.fridayEarly ? "1" : "0")
  if (s.startAfter !== null) out.set("sa", String(s.startAfter))
  if (s.startBefore !== null) out.set("sb", String(s.startBefore))
  list("dq", s.dq)
  list("vs", s.staleSection)
  if (s.bounds) out.set("b", [s.bounds.south, s.bounds.west, s.bounds.north, s.bounds.east].map((n) => round(n)).join(","))
  if (s.sort) out.set("sort", s.sort)
  if (s.view) out.set("view", s.view)
  if (s.center) {
    out.set("ll", `${round(s.center.lat)},${round(s.center.lng)}`)
    if (s.center.label) out.set("ln", s.center.label)
    if (s.radius !== DEFAULT_RADIUS) out.set("r", String(s.radius))
    if (s.unit !== "mi") out.set("u", s.unit)
  }
  if (s.map) out.set("m", `${round(s.map.lat)},${round(s.map.lng)},${s.map.zoom}`)
  return out
}

/** Anonymous visitors can't filter on staff-only data, even if they hand-edit the URL. */
export function stripStaffFilters(s: SearchState): SearchState {
  const ranges = { ...s.ranges }
  delete ranges.retention
  delete ranges.salary
  return { ...s, status: [], freshness: [], dq: [], staleSection: [], listing: [], ranges }
}

/** Sort orders that would reveal staff-only verification dates. */
export const STAFF_ONLY_SORTS: readonly SortKey[] = ["verified", "stale"]
