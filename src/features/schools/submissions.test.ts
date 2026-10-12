import { describe, expect, it } from "vitest"
import { z } from "zod"
import schoolsJson from "../../data/schools.json"
import { slidingWindow } from "../../lib/sliding-window"
import { matchSchool, regionOf } from "./lib"
import { SchoolSchema } from "./schema"
import { toPublicDoc, toSearchDoc } from "./search/doc"
import { EMPTY_STATE, parseSearchState, stripStaffFilters } from "./search"
import { ContactMessageSchema, NewReportSchema, NewSchoolSchema } from "./submissions"

const valid = {
  name: "Noor Academy", street: "1 Main St", city: "Dallas", state: "texas", postalCode: "75201", country: "US" as const,
  phone: "(214) 555-0100", email: "office@example.org", website: "", head: "", type: "standard" as const,
  gradesFrom: "PK", gradesTo: "8", founded: "2010", submitterEmail: "me@example.org",
}
const errorsOf = (input: unknown) => {
  const r = NewSchoolSchema.safeParse(input)
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path.join("."), i.message]))
}

describe("new school submission", () => {
  it("accepts a valid school and normalises the state", () => {
    const r = NewSchoolSchema.safeParse(valid)
    expect(r.success && r.data.state).toBe("TX")
  })
  it.each([
    ["US ZIP+4", { postalCode: "75201-1234" }, undefined],
    ["US ZIP too short", { postalCode: "7520" }, "postalCode"],
    ["US with a CA code", { postalCode: "A1A 1A1" }, "postalCode"],
    ["CA postal", { country: "CA" as const, postalCode: "t5a1b2", state: "AB" }, undefined],
    ["CA with a ZIP", { country: "CA" as const, postalCode: "75201", state: "AB" }, "postalCode"],
    ["bad state", { state: "Narnia" }, "state"],
    ["short phone", { phone: "123" }, "phone"],
    ["bad email", { email: "nope" }, "email"],
    ["bad website", { website: "example.org" }, "website"],
    ["grades reversed", { gradesFrom: "8", gradesTo: "K" }, "gradesTo"],
    ["unknown grade", { gradesFrom: "13" }, "gradesFrom"],
    ["future founded year", { founded: "2999" }, "founded"],
    ["founded before 1900", { founded: "1850" }, "founded"],
    ["blank name", { name: " " }, "name"],
  ])("%s", (_n, patch, field) => {
    const e = errorsOf({ ...valid, ...patch })
    if (field) expect(Object.keys(e)).toContain(field)
    else expect(e).toEqual({})
  })
  it("treats a filled honeypot as a bot signal (schema allows only empty)", () => {
    expect(errorsOf({ ...valid, hp: "spam" })).toHaveProperty("hp")
    expect(errorsOf({ ...valid, hp: "" })).toEqual({})
  })
  it("trims and caps long input", () => {
    expect(errorsOf({ ...valid, name: "x".repeat(500) })).toHaveProperty("name")
    const r = NewSchoolSchema.safeParse({ ...valid, name: "  Noor  " })
    expect(r.success && r.data.name).toBe("Noor")
  })
})

describe("contact + report schemas", () => {
  it("requires a real message", () => {
    expect(ContactMessageSchema.safeParse({ name: "A", email: "a@b.co", message: "hi" }).success).toBe(false)
    expect(ContactMessageSchema.safeParse({ name: "Amy", email: "a@b.co", message: "Is there space in grade 3?" }).success).toBe(true)
    expect(ContactMessageSchema.safeParse({ name: "Amy", email: "a@b.co", message: "x".repeat(2001) }).success).toBe(false)
  })
  it("report: optional email may be blank but not invalid; kind is restricted", () => {
    const base = { kind: "closed", schoolName: "Noor", city: "Dallas", state: "TX" }
    expect(NewReportSchema.safeParse(base).success).toBe(true)
    expect(NewReportSchema.safeParse({ ...base, submitterEmail: "bad" }).success).toBe(false)
    expect(NewReportSchema.safeParse({ ...base, kind: "new" }).success).toBe(false) // only the server creates "new"
    expect(NewReportSchema.safeParse({ ...base, kind: "delete-everything" }).success).toBe(false)
  })
})

describe("rate limiting", () => {
  it("allows up to the limit inside the window, then blocks, then recovers", () => {
    const store = new Map<string, number[]>()
    const hit = (t: number, k = "a") => slidingWindow(store, k, 3, 1000, t)
    expect([hit(0), hit(100), hit(200)]).toEqual([true, true, true])
    expect(hit(300)).toBe(false)
    expect(hit(300, "b")).toBe(true) // separate keys don't share a budget
    expect(hit(1001)).toBe(true) // oldest hits aged out
  })
})

describe("public directory safety", () => {
  const schools = z.array(SchoolSchema).parse(schoolsJson)
  const staffDocs = schools.map((s) => toSearchDoc(s, Date.parse("2026-10-12"), { staffFields: true }))

  it("drops pending and closed schools", () => {
    const pub = staffDocs.map(toPublicDoc).filter(Boolean)
    expect(pub.length).toBe(staffDocs.filter((d) => d.listing === "open").length)
    expect(pub.some((d) => d!.listing !== "open")).toBe(false)
  })

  it("strips every staff-only field, and hides lapsed standing", () => {
    for (const d of staffDocs.map(toPublicDoc)) {
      if (!d) continue
      expect(d.dq).toEqual([])
      expect(d.staleSections).toEqual([])
      expect(d.salary).toBeNull()
      expect(d.retention).toBeNull()
      expect(d.leaderTokens).toEqual([])
      expect(d.updatedAt).toBe("")
      expect(d.oldestVerifiedAt).toBe("")
      expect(["active", "non_member"]).toContain(d.membership.status)
      expect(d.membership.memberSince).toBe(0)
    }
    const lapsed = { ...staffDocs[0], membership: { status: "lapsed" as const, memberSince: 2010 } }
    expect(toPublicDoc(lapsed)!.membership.status).toBe("non_member")
  })

  it("never serialises leader names or emails into the public payload", () => {
    const json = JSON.stringify(staffDocs.map(toPublicDoc))
    for (const s of schools) for (const l of s.leadership) if (l.name) expect(json).not.toContain(l.name)
    expect(json).not.toContain("@alnooracademy")
  })

  it("hand-edited URLs can't filter on staff data", () => {
    const s = stripStaffFilters(parseSearchState(new URLSearchParams("status=lapsed&fresh=stale&dq=stale&vs=programs&list=closed&sal=1..2&ret=1..2&tuition=1..9999")))
    expect(s.status).toEqual([])
    expect(s.freshness).toEqual([])
    expect(s.dq).toEqual([])
    expect(s.staleSection).toEqual([])
    expect(s.listing).toEqual([])
    expect(s.ranges.salary).toBeUndefined()
    expect(s.ranges.retention).toBeUndefined()
    expect(s.ranges.tuition).toEqual({ min: 1, max: 9999 }) // public filters survive
    expect(stripStaffFilters(EMPTY_STATE)).toEqual(EMPTY_STATE)
  })
})

describe("regionOf", () => {
  it.each([["TX", "US", "southwest"], ["tx", "US", "southwest"], ["NJ", "US", "northeast"], ["MI", "US", "midwest"], ["CA", "US", "west"], ["VA", "US", "southeast"], ["ON", "CA", "canada"], ["ZZ", "US", "southeast"]])("%s %s → %s", (st, c, region) => {
    expect(regionOf(st, c as "US" | "CA")).toBe(region)
  })
})

describe("matchSchool", () => {
  const list = [
    { id: "a", name: "Al-Noor Academy", address: { city: "Austin", state: "TX" } },
    { id: "b", name: "Noor Academy", address: { city: "Dallas", state: "TX" } },
    { id: "c", name: "Noor Academy", address: { city: "Dallas", state: "TX" } },
  ] as Parameters<typeof matchSchool>[0]
  it("matches ignoring case, hyphens and spelling variants", () => {
    expect(matchSchool(list, "al noor academy", "austin", "tx")).toBe("a")
    expect(matchSchool(list, "AL-NUR ACADEMY", "Austin", "TX")).toBe("a")
  })
  it("returns null when nothing or more than one school matches", () => {
    expect(matchSchool(list, "Noor Academy", "Dallas", "TX")).toBeNull() // two candidates: don't guess
    expect(matchSchool(list, "Al-Noor Academy", "Houston", "TX")).toBeNull()
    expect(matchSchool(list, "Al-Noor Academy", "Austin", "OK")).toBeNull()
  })
})
