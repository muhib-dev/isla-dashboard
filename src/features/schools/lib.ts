import { tokenize } from "./search/normalize"
import {
  PROFILE_SECTIONS,
  type Freshness,
  type Region,
  type ProfileSection,
  type School,
  type SchoolSummary,
  type SectionPatch,
} from "./schema"

const DAY = 86_400_000

export const SECTION_LABELS: Record<ProfileSection, string> = {
  overview: "Overview",
  leadership: "Leadership",
  schedule: "Schedule",
  programs: "Programs",
  contacts: "Contacts",
}

/** Under 6 months = fresh, 6–12 = aging, older = stale. */
export function freshnessOf(isoDate: string, now: number): Freshness {
  const days = (now - Date.parse(isoDate)) / DAY
  if (days < 183) return "fresh"
  if (days < 365) return "aging"
  return "stale"
}

export function oldestVerified(school: Pick<School, "verifiedAt">): string {
  return PROFILE_SECTIONS.map((s) => school.verifiedAt[s]).sort()[0]
}

export function gradeSpan(from: string, to: string) {
  return `${from}–${to}`
}

export function toSummary(school: School): SchoolSummary {
  return {
    id: school.id,
    name: school.name,
    region: school.region,
    gradesFrom: school.gradesFrom,
    gradesTo: school.gradesTo,
    membership: school.membership,
    updatedAt: school.updatedAt,
    city: school.address.city,
    state: school.address.state,
    enrollment: school.metrics.enrollment,
    oldestVerifiedAt: oldestVerified(school),
  }
}

export type CompletenessTask = { section: ProfileSection; label: string }

/** Profile completeness: required fields present and every section verified within a year. */
export function completeness(school: School, now: number) {
  const tasks: CompletenessTask[] = []
  let total = 0
  let done = 0
  const check = (ok: boolean, section: ProfileSection, label: string) => {
    total++
    if (ok) done++
    else tasks.push({ section, label })
  }

  check(school.accreditation.length > 0, "overview", "Add accreditation")
  check(school.metrics.tuition > 0, "overview", "Add tuition")
  for (const leader of school.leadership) {
    check(Boolean(leader.name && leader.email), "leadership", `Fill in ${leader.role.toLowerCase()}`)
  }
  check(Boolean(school.schedule.startTime && school.schedule.endTime), "schedule", "Add school hours")
  check(!school.programs.lunch.offered || Boolean(school.programs.lunch.provider), "programs", "Add lunch provider")
  check(Boolean(school.phone && school.email && school.website), "contacts", "Complete contact details")

  for (const section of PROFILE_SECTIONS) {
    check(
      freshnessOf(school.verifiedAt[section], now) !== "stale",
      section,
      `Review ${SECTION_LABELS[section].toLowerCase()} details`,
    )
  }

  return { score: Math.round((done / total) * 100), tasks }
}

/** Current values of a section, shaped as its PATCH payload. Seeds edit forms. */
export function sectionValues<S extends ProfileSection>(school: School, section: S): SectionPatch<S> {
  const values: { [K in ProfileSection]: SectionPatch<K> } = {
    overview: {
      name: school.name,
      gradesFrom: school.gradesFrom,
      gradesTo: school.gradesTo,
      founded: school.founded,
      enrollment: school.metrics.enrollment,
      teachers: school.metrics.teachers,
      tuition: school.metrics.tuition,
      accreditation: school.accreditation.join(", "),
    },
    leadership: { leaders: school.leadership },
    schedule: school.schedule,
    programs: school.programs,
    contacts: {
      phone: school.phone,
      email: school.email,
      website: school.website,
      street: school.address.street,
      city: school.address.city,
      state: school.address.state,
      postalCode: school.address.postalCode,
    },
  }
  return values[section]
}

/**
 * Finds the school a public report is about: same normalised name, city and state.
 * Returns null unless exactly one school matches, so a report never silently targets the wrong one.
 */
export function matchSchool(schools: Pick<School, "id" | "name" | "address">[], name: string, city: string, state: string): string | null {
  const key = (s: string) => tokenize(s).join(" ")
  const hits = schools.filter((s) => key(s.name) === key(name) && key(s.address.city) === key(city) && s.address.state.toUpperCase() === state.toUpperCase())
  return hits.length === 1 ? hits[0].id : null
}

const REGION_OF_STATE: Record<string, Region> = {
  ...Object.fromEntries("CT ME MA NH RI VT NJ NY PA".split(" ").map((c) => [c, "northeast" as const])),
  ...Object.fromEntries("IL IN MI OH WI IA KS MN MO NE ND SD".split(" ").map((c) => [c, "midwest" as const])),
  ...Object.fromEntries("DE DC FL GA MD NC SC VA WV AL KY MS TN AR LA PR VI".split(" ").map((c) => [c, "southeast" as const])),
  ...Object.fromEntries("TX OK AZ NM".split(" ").map((c) => [c, "southwest" as const])),
  ...Object.fromEntries("CO ID MT UT WY NV CA OR WA AK HI GU AS MP".split(" ").map((c) => [c, "west" as const])),
}

export function regionOf(state: string, country: "US" | "CA"): Region {
  return country === "CA" ? "canada" : (REGION_OF_STATE[state.toUpperCase()] ?? "southeast")
}
