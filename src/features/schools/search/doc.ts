import type { Freshness, GeoPrecisionLike, School, SchoolSummary } from "./types"
import { completeness, freshnessOf, oldestVerified, toSummary } from "../lib"
import { PROFILE_SECTIONS, type Feature, type ListingStatus, type ProfileSection, type SchoolType } from "../schema"
import { gradeSpanOf } from "./grades"
import { normalize, tokenize } from "./normalize"
import { stateName } from "./states"

/**
 * One searchable row per school: the table-row fields plus everything the engine
 * needs, normalized once at index time. Built on the server and shipped to the client,
 * so only put fields here that the viewing role may see.
 */
export type SchoolSearchDoc = SchoolSummary & {
  freshness: Freshness
  country: "US" | "CA"
  postalCode: string
  postalNorm: string
  nameNorm: string
  nameTokens: string[]
  nameJoined: string
  cityTokens: string[]
  stateName: string
  stateNameTokens: string[]
  gradeFrom: number | null
  gradeTo: number | null
  tuition: number | null
  founded: number
  accreditation: string[]
  accredTokens: string[]
  leaderTokens: string[]
  /** Machine tags used by has: and program tokens. */
  tags: string[]
  extraTokens: string[]
  contactTokens: string[]
  lat: number | null
  lng: number | null
  precision: GeoPrecisionLike
  schoolType: SchoolType
  listing: ListingStatus
  features: Feature[]
  teachers: number
  /** 0–1. Staff-only metrics are null for other viewers. */
  retention: number | null
  salary: number | null
  fridayEarly: boolean
  /** Minutes after midnight; null if unparseable. */
  startMinutes: number | null
  /** Staff-only data-quality signals (empty for other viewers). */
  dq: DataQualityFlag[]
  staleSections: ProfileSection[]
}

export const DQ_FLAGS = ["no-coords", "approx-coords", "no-email", "no-phone", "no-website", "stale", "incomplete", "duplicate"] as const
export type DataQualityFlag = (typeof DQ_FLAGS)[number]

function minutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  const v = Number(m[1]) * 60 + Number(m[2])
  return v < 24 * 60 ? v : null
}

function dataQuality(school: School, geoPrecision: string, now: number): DataQualityFlag[] {
  const flags: DataQualityFlag[] = []
  if (geoPrecision === "none") flags.push("no-coords")
  else if (geoPrecision !== "rooftop") flags.push("approx-coords")
  if (!school.email.trim()) flags.push("no-email")
  if (!school.phone.trim()) flags.push("no-phone")
  if (!school.website.trim()) flags.push("no-website")
  if (freshnessOf(oldestVerified(school), now) === "stale") flags.push("stale")
  if (completeness(school, now).score < 80) flags.push("incomplete")
  return flags
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function programTags(p: School["programs"]): string[] {
  const tags: string[] = []
  if (p.lunch.offered) tags.push("lunch")
  if (p.lunch.offered && p.lunch.allHalal) tags.push("halal")
  if (p.lunch.offered && p.lunch.freeReducedAvailable) tags.push("freereduced")
  if (p.transportation) tags.push("transportation")
  if (p.quran) tags.push("quran")
  if (p.arabic) tags.push("arabic")
  if (p.afterCare) tags.push("aftercare")
  if (p.athletics.length) tags.push("athletics")
  return tags
}

export function toSearchDoc(school: School, now: number, opts: { staffFields: boolean }): SchoolSearchDoc {
  const summary = toSummary(school)
  const span = gradeSpanOf(school.gradesFrom, school.gradesTo)
  const geo = school.address.geo
  const tags = programTags(school.programs)
  const nameTokens = tokenize(school.name)
  return {
    ...summary,
    freshness: freshnessOf(oldestVerified(school), now),
    country: school.address.country,
    postalCode: school.address.postalCode,
    postalNorm: school.address.postalCode.toLowerCase().replace(/[\s-]/g, ""),
    nameNorm: nameTokens.join(" "),
    nameTokens,
    nameJoined: nameTokens.join(""),
    cityTokens: tokenize(school.address.city),
    stateName: stateName(school.address.state),
    stateNameTokens: tokenize(stateName(school.address.state)),
    gradeFrom: span?.from ?? null,
    gradeTo: span?.to ?? null,
    tuition: school.metrics.tuition > 0 ? school.metrics.tuition : null,
    founded: school.founded,
    accreditation: school.accreditation,
    accredTokens: school.accreditation.flatMap(tokenize),
    leaderTokens: opts.staffFields ? school.leadership.flatMap((l) => tokenize(l.name)) : [],
    tags,
    extraTokens: [...tags, ...school.programs.athletics.flatMap(tokenize), ...tokenize(school.programs.lunch.provider)],
    contactTokens: opts.staffFields ? tokenize(`${host(school.website)} ${school.email.split("@")[1] ?? ""}`) : tokenize(host(school.website)),
    lat: geo && geo.precision !== "none" ? geo.lat : null,
    lng: geo && geo.precision !== "none" ? geo.lng : null,
    precision: geo?.precision ?? "none",
    schoolType: school.type,
    listing: school.listing,
    features: school.features,
    teachers: school.metrics.teachers,
    retention: opts.staffFields ? school.metrics.retentionRate : null,
    salary: opts.staffFields && school.metrics.avgTeacherSalary > 0 ? school.metrics.avgTeacherSalary : null,
    fridayEarly: school.schedule.fridayEarlyRelease,
    startMinutes: minutes(school.schedule.startTime),
    dq: opts.staffFields ? dataQuality(school, geo?.precision ?? "none", now) : [],
    staleSections: opts.staffFields ? PROFILE_SECTIONS.filter((s) => freshnessOf(school.verifiedAt[s], now) === "stale") : [],
  }
}

export { normalize }

/** Flags schools that share a phone, website host or name+city with another school. Staff only. */
export function markDuplicates(docs: SchoolSearchDoc[], schools: School[], staffFields: boolean): SchoolSearchDoc[] {
  if (!staffFields) return docs
  const keys = new Map<string, string[]>()
  const keysOf = (s: School) =>
    [
      s.phone.replace(/\D/g, "").length >= 7 ? `p:${s.phone.replace(/\D/g, "")}` : "",
      s.website.trim() ? `w:${host(s.website)}` : "",
      `n:${tokenize(s.name).join(" ")}|${tokenize(s.address.city).join(" ")}`,
    ].filter(Boolean)
  for (const s of schools) for (const k of keysOf(s)) keys.set(k, [...(keys.get(k) ?? []), s.id])
  const dup = new Set<string>()
  for (const ids of keys.values()) if (ids.length > 1) ids.forEach((id) => dup.add(id))
  return docs.map((d) => (dup.has(d.id) ? { ...d, dq: [...d.dq, "duplicate" as const] } : d))
}

/**
 * What the public directory may expose. Strips everything staff-only (data quality, salary,
 * retention, verification dates, leader names, exact membership standing) and drops
 * schools that aren't open, so pending and closed listings never leave the server.
 */
export function toPublicDoc(doc: SchoolSearchDoc): SchoolSearchDoc | null {
  if (doc.listing !== "open") return null
  const member = doc.membership.status === "active" || doc.membership.status === "grace"
  return {
    ...doc,
    // Summary fields the shared row type requires, neutralised.
    membership: { status: member ? "active" : "non_member", memberSince: 0 },
    updatedAt: "",
    oldestVerifiedAt: "",
    freshness: "fresh",
    leaderTokens: [],
    contactTokens: doc.contactTokens.filter((t) => !t.includes("@")),
    retention: null,
    salary: null,
    dq: [],
    staleSections: [],
  }
}
