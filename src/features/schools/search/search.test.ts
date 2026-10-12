import { describe, expect, it } from "vitest"
import { z } from "zod"
import schoolsJson from "../../../data/schools.json"
import { SchoolSchema } from "../schema"
import { markDuplicates, toSearchDoc, type SchoolSearchDoc } from "./doc"
import { distance, inBounds } from "./geo"
import { gradeIndex, parseGradeQuery } from "./grades"
import { computeFacetCounts, didYouMean, explainEmpty, EMPTY_STATE, parseSearchState, runSearch, serializeSearchState, type SearchState } from "./index"
import { normalize, editDistance } from "./normalize"
import { parseQuery, parseRange } from "./parse-query"
import { resolvePlace } from "./gazetteer"

const NOW = Date.parse("2026-10-12")
const schools = z.array(SchoolSchema).parse(schoolsJson)
const docs = markDuplicates(schools.map((s) => toSearchDoc(s, NOW, { staffFields: true })), schools, true)
/** Closed schools are hidden unless asked for. */
const shown = docs.filter((d) => d.listing !== "closed").length

const search = (q: string, patch: Partial<SearchState> = {}, d: SchoolSearchDoc[] = docs) =>
  runSearch(d, { ...EMPTY_STATE, q, ...patch })
const ids = (q: string, patch: Partial<SearchState> = {}, d: SchoolSearchDoc[] = docs) => search(q, patch, d).rows.map((r) => r.doc.id)

function withDoc(patch: Partial<SchoolSearchDoc>, base = docs[0]): SchoolSearchDoc {
  return { ...base, ...patch }
}

describe("normalize", () => {
  it.each([
    ["Al-Noor", "al noor"],
    ["AL‑NŪR", "al nur"],
    ["  Dar   ul-Uloom ", "dar ul uloom"],
    ["Jumu'ah", "jumuah"],
    ["St. Louis", "st louis"],
    ["🕌 Masjid", "masjid"],
    ["", ""],
  ])("%s → %s", (input, out) => expect(normalize(input)).toBe(out))

  it("strips Arabic marks and unifies letter variants", () => {
    expect(normalize("إِقْرَأ")).toBe(normalize("اقرا"))
    expect(normalize("مدرسة")).toBe(normalize("مدرسه"))
  })

  it("edit distance counts transpositions as one", () => {
    expect(editDistance("academy", "acadmey", 2)).toBe(1)
    expect(editDistance("abc", "xyz", 1)).toBeGreaterThan(1)
  })
})

describe("text search", () => {
  it("finds across hyphen / space / case / joined spellings", () => {
    for (const q of ["Al-Noor", "al noor", "alnoor", "AL NOOR", "al nur"]) expect(ids(q)).toContain("al-noor-academy")
  })

  it("matches transliteration aliases", () => {
    expect(ids("nur")).toEqual(expect.arrayContaining(["nur-academy", "al-noor-academy"]))
    expect(ids("medina")).toContain("madinah-prep")
  })

  it("tolerates typos on longer words but not short ones", () => {
    expect(ids("acadmey")).toContain("al-noor-academy")
    expect(ids("hikmh")).toContain("hikmah-academy")
    expect(ids("xyz")).toEqual([])
    expect(ids("alx")).toEqual([]) // 3 chars: exact only
  })

  it("ranks exact name above prefix above city hit", () => {
    const r = search("huda").rows
    expect(r[0].doc.nameTokens).toContain("huda")
    expect(r[0].score).toBeGreaterThan(r[r.length - 1].score - 1)
  })

  it("searches city, state and leaders", () => {
    expect(ids("dallas")).toContain("iqra-learning-center")
    expect(ids("Texas").length).toBeGreaterThan(0)
    expect(ids("rahman")).toContain("al-noor-academy")
  })

  it("only treats 2-letter words as state codes when typed in capitals", () => {
    expect(ids("tx", { q: "TX" }).every((id) => docs.find((d) => d.id === id)!.state === "TX")).toBe(true)
    expect(ids("in")).not.toContain("ihsan-academy") // "in" is a word, not Indiana
  })

  it("AND across words, OR with |, exclusion with -", () => {
    const both = ids("noor dallas")
    expect(both).toEqual([])
    const either = ids("noor | iqra")
    expect(either).toEqual(expect.arrayContaining(["al-noor-academy", "iqra-learning-center"]))
    expect(ids("academy -noor")).not.toContain("al-noor-academy")
    expect(ids("academy -noor")).toContain("hikmah-academy")
  })

  it("matches quoted phrases only as phrases", () => {
    expect(ids('"noor academy"')).toContain("al-noor-academy")
    expect(ids('"academy noor"')).toEqual([])
  })

  it("keeps stopword-only queries working", () => {
    expect(ids("islamic academy").length).toBeGreaterThan(0)
    expect(ids("school")).toHaveLength(shown)
    expect(ids("islamic academy")[0]).toMatch(/academy/) // name matches still rank first
    expect(ids("islamic noor")).toContain("al-noor-academy") // soft word doesn't veto a real one
    expect(ids("islamic zzzzz")).toEqual([])
  })

  it("is safe on hostile input", () => {
    for (const q of ["", "   ", "(", "[a-z]+", ".*", "\\", '"', '"unclosed', "-", "- -", "||", "a||b", "🕌🕌", "x".repeat(5000), "state:", ":", "tuition:<", "$$$"]) {
      expect(() => search(q)).not.toThrow()
    }
    expect(search("").rows).toHaveLength(shown)
    expect(ids("   ")).toHaveLength(shown)
  })

  it("caps query length", () => {
    expect(parseQuery("a".repeat(5000)).parts[0].raw.length).toBeLessThanOrEqual(200)
    expect(parseQuery("a ".repeat(500)).parts.length).toBeLessThanOrEqual(100)
  })
})

describe("operators", () => {
  it("state:", () => {
    const r = ids("state:TX")
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((id) => docs.find((d) => d.id === id)!.state === "TX")).toBe(true)
    expect(ids("state:Texas")).toEqual(r)
    expect(ids("state:TX,AZ").length).toBeGreaterThan(r.length)
    expect(ids("-state:TX")).toHaveLength(shown - r.length)
  })

  it("city: with quotes", () => {
    expect(ids('city:"San Antonio"')).toEqual(["hikmah-academy"])
    expect(ids("city:san")).toEqual([]) // exact city, not prefix
  })

  it("zip: prefix, case/space insensitive for CA postal codes", () => {
    const ca = docs.find((d) => d.country === "CA")!
    expect(ids(`zip:${ca.postalCode.replace(" ", "").toLowerCase()}`)).toContain(ca.id)
    expect(ids(`zip:${ca.postalCode.slice(0, 3)}`)).toContain(ca.id)
    expect(ids("zip:78704")).toContain("al-noor-academy")
  })

  it("numeric ranges incl. $ , k and ..", () => {
    expect(parseRange("<8k")).toEqual({ max: 8000, maxExclusive: true })
    expect(parseRange("$5,000..9,000")).toEqual({ min: 5000, max: 9000 })
    expect(parseRange("9000..5000")).toEqual({ min: 5000, max: 9000 })
    expect(parseRange(">=200")).toEqual({ min: 200 })
    expect(parseRange("abc")).toBeNull()
    expect(ids("enrolled:>300").every((id) => docs.find((d) => d.id === id)!.enrollment > 300)).toBe(true)
    expect(parseRange("..2000")).toEqual({ max: 2000 })
    expect(parseRange("5k..")).toEqual({ min: 5000 })
    expect(parseRange("..")).toBeNull()
  })

  it("unusable operator values fall back to text and add a note", () => {
    const r = search("tuition:<abc")
    expect(r.notes.join()).toMatch(/tuition:<abc/)
    expect(r.rows).toEqual([])
  })

  it("has: and accredited:", () => {
    const quran = ids("has:quran")
    expect(quran.every((id) => docs.find((d) => d.id === id)!.tags.includes("quran"))).toBe(true)
    expect(ids("accredited:yes").length + ids("accredited:no").length).toBe(shown)
    expect(ids("accredited:cognia").length).toBeGreaterThan(0)
  })

  it("unknown operators are just text", () => {
    expect(ids("foo:bar")).toEqual([])
  })
})

describe("grades", () => {
  it("orders PK3 < PK < K < 1..12 and accepts variants", () => {
    expect(gradeIndex("PK3")).toBeLessThan(gradeIndex("PK")!)
    expect(gradeIndex("PK")).toBeLessThan(gradeIndex("K")!)
    expect(gradeIndex("K")).toBeLessThan(gradeIndex("1")!)
    for (const v of ["pre-k", "Pre K", "TK", "PK4"]) expect(gradeIndex(v)).toBe(gradeIndex("PK"))
    for (const v of ["kg", "Kindergarten"]) expect(gradeIndex(v)).toBe(0)
    expect(gradeIndex("5th")).toBe(5)
    expect(gradeIndex("Grade 12")).toBe(12)
    for (const v of ["13", "0", "", "abc", "-1"]) expect(gradeIndex(v)).toBeNull()
  })

  it("parses grade ranges either way round", () => {
    expect(parseGradeQuery("k-5")).toEqual({ from: 0, to: 5 })
    expect(parseGradeQuery("5..k")).toEqual({ from: 0, to: 5 })
    expect(parseGradeQuery("nope")).toBeNull()
  })

  it("serves / covers semantics, and bad school data never matches", () => {
    const k12 = withDoc({ id: "a", gradeFrom: -2, gradeTo: 12 })
    const elem = withDoc({ id: "b", gradeFrom: 0, gradeTo: 5 })
    const bad = withDoc({ id: "c", gradeFrom: null, gradeTo: null })
    const pool = [k12, elem, bad]
    expect(ids("grade:3", {}, pool).sort()).toEqual(["a", "b"])
    expect(ids("grade:k-8", {}, pool)).toEqual(["a"])
    expect(ids("", { grade: 12 }, pool)).toEqual(["a"])
  })
})

describe("filters, sorting and nulls", () => {
  it("combines facets with AND and multi-values with OR", () => {
    const tx = ids("", { state: ["TX"] })
    const txOrAz = ids("", { state: ["TX", "AZ"] })
    expect(txOrAz.length).toBeGreaterThan(tx.length)
    expect(ids("", { state: ["TX"], region: ["west"] })).toEqual([])
  })

  it("treats unknown tuition as null, not 0, and sorts nulls last", () => {
    const free = withDoc({ id: "free", name: "Free", tuition: 0 })
    const unknown = withDoc({ id: "unk", name: "Unknown", tuition: null })
    const paid = withDoc({ id: "paid", name: "Paid", tuition: 5000 })
    expect(ids("", { sort: "tuition" }, [unknown, paid, free])).toEqual(["free", "paid", "unk"])
    expect(ids("tuition:..0", {}, [unknown, free])).toEqual(["free"])
    expect(ids("tuition:<9000", {}, [unknown, paid])).toEqual(["paid"])
  })

  it("sorts stably with duplicate names in different cities", () => {
    const a = withDoc({ id: "z1", name: "Dup", city: "A" })
    const b = withDoc({ id: "a1", name: "Dup", city: "B" })
    expect(ids("", { sort: "name" }, [a, b])).toEqual(["a1", "z1"])
  })

  it("falls back from distance/relevance sort when they don't apply", () => {
    expect(search("", { sort: "distance" }).sort).toBe("name")
    expect(search("", { sort: "relevance" }).sort).toBe("name")
    expect(search("noor", {}).sort).toBe("relevance")
  })

  it("a bare state name becomes a state filter", () => {
    const r = search("Texas")
    expect(r.state.state).toEqual(["TX"])
    expect(r.state.q).toBe("")
    expect(search("TX").state.state).toEqual(["TX"])
  })
})

describe("geo", () => {
  it("haversine matches known distances", () => {
    const austinDallasMi = distance(30.2672, -97.7431, 32.7767, -96.797, "mi")
    expect(austinDallasMi).toBeGreaterThan(178)
    expect(austinDallasMi).toBeLessThan(186)
    expect(distance(30, -97, 30, -97, "km")).toBe(0)
    expect(distance(0, 0, 0, 1, "km")).toBeCloseTo(111.2, 0)
  })

  it("resolves places with state hints and ambiguity", () => {
    expect(resolvePlace("Dallas")?.label).toBe("Dallas, TX")
    expect(resolvePlace("dallas, tx")?.label).toBe("Dallas, TX")
    expect(resolvePlace("springfield illinois")?.label).toBe("Springfield, IL")
    const s = resolvePlace("Springfield")!
    expect(s.alternatives!.length).toBeGreaterThan(0)
    expect(resolvePlace("Atlantis")).toBeNull()
    expect(resolvePlace("")).toBeNull()
  })

  it("radius search includes inside, excludes outside, boundary inclusive", () => {
    const r = search('near:"Dallas, TX" within:50mi')
    expect(r.center?.radius).toBe(50)
    expect(r.rows.map((x) => x.doc.id)).toContain("iqra-learning-center")
    expect(r.rows.map((x) => x.doc.id)).not.toContain("al-noor-academy")
    expect(r.sort).toBe("distance")
    expect(r.rows[0].distance).toBeLessThan(1)

    const edge = withDoc({ id: "edge", lat: 30, lng: -97 })
    const d = distance(30, -97, 30.5, -97, "mi")
    const at = runSearch([edge], { ...EMPTY_STATE, center: { lat: 30.5, lng: -97 }, radius: 25 })
    expect(at.rows).toHaveLength(d <= 25 ? 1 : 0)
    const exact = runSearch([withDoc({ id: "x", lat: 30.5, lng: -97 })], { ...EMPTY_STATE, center: { lat: 30.5, lng: -97 }, radius: 5 })
    expect(exact.rows[0].distance).toBe(0)
  })

  it("keeps schools without coordinates visible as unlocated, never silently dropped", () => {
    const noGeo = withDoc({ id: "ng", lat: null, lng: null, precision: "none" })
    const r = runSearch([noGeo, docs[0]], { ...EMPTY_STATE, center: { lat: docs[0].lat!, lng: docs[0].lng! } })
    expect(r.unlocated.map((d) => d.id)).toEqual(["ng"])
    expect(r.rows.map((x) => x.doc.id)).toEqual([docs[0].id])
  })

  it("an unknown place stays pending until the client resolves it, then is reported", () => {
    const pending = search("near:Atlantis")
    expect(pending.pending).toEqual(["place:atlantis"])
    expect(pending.rows).toHaveLength(shown)
    const missing = runSearch(docs, { ...EMPTY_STATE, q: "near:Atlantis" }, { resolved: { "place:atlantis": null } })
    expect(missing.pending).toEqual([])
    expect(missing.notes.join()).toMatch(/Atlantis/)
    expect(missing.rows).toHaveLength(shown)
  })

  it("a bare ZIP or postal code searches around it", () => {
    const austin = { lat: 30.2428, lng: -97.7658, label: "78704 · Austin, TX" }
    const ctx = { resolved: { "code:78704": austin } }
    const r = runSearch(docs, { ...EMPTY_STATE, q: "78704", radius: 10 }, ctx)
    expect(r.center?.label).toBe("78704 · Austin, TX")
    expect(r.rows.map((x) => x.doc.id)).toContain("al-noor-academy")
    expect(r.rows.map((x) => x.doc.id)).not.toContain("iqra-learning-center")
    expect(r.state.q).toBe("78704")
    expect(r.chips.find((c) => c.id === "center")?.without.q).toBe("")
    // ZIP+4, and not yet loaded → pending (no wrong results shown as "found")
    expect(runSearch(docs, { ...EMPTY_STATE, q: "78704-1234" }, ctx).center).not.toBeNull()
    expect(runSearch(docs, { ...EMPTY_STATE, q: "90210" }, ctx).pending).toEqual(["code:90210"])
    // Canadian: spaced, unspaced, lowercase all share one key
    for (const q of ["T5A 1B2", "t5a1b2", "T5A", "t5a-1b2"]) expect(runSearch(docs, { ...EMPTY_STATE, q }).pending).toEqual(["code:T5A"])
    // Looks like a code but isn't
    for (const q of ["1234", "123456", "A1", "noor"]) expect(runSearch(docs, { ...EMPTY_STATE, q }).pending).toEqual([])
  })

  it("near: accepts a ZIP too", () => {
    const ctx = { resolved: { "code:75201": { lat: 32.7889, lng: -96.8, label: "75201 · Dallas, TX" } } }
    const r = runSearch(docs, { ...EMPTY_STATE, q: "near:75201 within:30mi" }, ctx)
    expect(r.rows.map((x) => x.doc.id)).toEqual(["iqra-learning-center"])
  })

  it("bounds handle the antimeridian", () => {
    expect(inBounds(0, 179, { south: -1, west: 170, north: 1, east: -170 })).toBe(true)
    expect(inBounds(0, -175, { south: -1, west: 170, north: 1, east: -170 })).toBe(true)
    expect(inBounds(0, 0, { south: -1, west: 170, north: 1, east: -170 })).toBe(false)
  })

  it("co-located schools all stay in results", () => {
    const a = withDoc({ id: "a", lat: 1, lng: 1 })
    const b = withDoc({ id: "b", lat: 1, lng: 1 })
    expect(ids("", {}, [a, b])).toHaveLength(2)
  })
})

describe("url state", () => {
  it("round-trips", () => {
    const s: SearchState = {
      ...EMPTY_STATE,
      q: 'noor "dar ul"', region: ["west"], state: ["CA", "TX"], status: ["active"], freshness: ["stale"],
      grade: 5, sort: "name", view: "split", center: { lat: 30.2672, lng: -97.7431, label: "Austin, TX" },
      radius: 40, unit: "km", map: { lat: 30.1, lng: -97.2, zoom: 9 },
    }
    expect(parseSearchState(serializeSearchState(s))).toEqual(s)
  })

  it("omits defaults", () => {
    expect(serializeSearchState(EMPTY_STATE).toString()).toBe("")
  })

  it("keeps valid params when others are tampered with", () => {
    const s = parseSearchState(new URLSearchParams("q=noor&region=narnia,west&st=zz,tx&status=bogus&grade=99&sort=hack&view=3d&ll=999,5&r=99999&m=1,2,99&u=parsec"))
    expect(s.q).toBe("noor")
    expect(s.region).toEqual(["west"])
    expect(s.state).toEqual(["TX"])
    expect(s.status).toEqual([])
    expect(s.grade).toBeNull()
    expect(s.sort).toBeNull()
    expect(s.view).toBeNull()
    expect(s.center).toBeNull()
    expect(s.radius).toBe(250)
    expect(s.map).toBeNull()
    expect(s.unit).toBe("mi")
  })

  it("ignores unknown params, takes the first of repeated ones, and accepts record input", () => {
    expect(parseSearchState({ q: ["a", "b"], junk: "1" }).q).toBe("a")
    expect(parseSearchState(new URLSearchParams("r=abc")).radius).toBe(25)
  })

  it("clamps radius and caps q", () => {
    expect(parseSearchState(new URLSearchParams("ll=1,1&r=1")).radius).toBe(5)
    expect(parseSearchState(new URLSearchParams(`q=${"a".repeat(1000)}`)).q).toHaveLength(200)
  })
})

describe("zero-result help", () => {
  it("names the filter that kills results", () => {
    const state: SearchState = { ...EMPTY_STATE, q: "noor", region: ["west"] }
    const r = runSearch(docs, state)
    expect(r.rows).toEqual([])
    const fixes = explainEmpty(docs, r)
    expect(fixes.map((f) => f.chip.id)).toContain("region:west")
    expect(runSearch(docs, fixes[0].chip.without).rows.length).toBe(fixes[0].count)
  })

  it("removing an operator chip rebuilds the query", () => {
    const r = search("noor state:TX")
    const chip = r.chips.find((c) => c.label === "state:TX")!
    expect(chip.without.q).toBe("noor")
  })

  it("suggests a correction", () => {
    expect(didYouMean(docs, "furqn")).toBe("furqan")
    expect(didYouMean(docs, "noor")).toBeNull()
  })
})

describe("data safety", () => {
  it("leaves staff-only tokens out of non-staff docs", () => {
    const doc = toSearchDoc(schools[0], NOW, { staffFields: false })
    expect(doc.leaderTokens).toEqual([])
    expect(doc.contactTokens.join(" ")).not.toMatch(/office/)
  })
})

describe("facets", () => {
  const f = (patch: Partial<SearchState>) => ids("", patch)

  it("hides closed schools by default and shows them on request", () => {
    expect(f({})).not.toContain("prairie-light-school")
    expect(f({ listing: ["closed"] })).toEqual(["prairie-light-school"])
    expect(f({ listing: ["open", "pending", "closed"] })).toHaveLength(docs.length)
    expect(f({ listing: ["pending"] })).toEqual(["maple-crescent-school"])
  })

  it("filters by type, country and listing together", () => {
    expect(f({ type: ["weekend"] })).toEqual(["salam-day-school"])
    expect(f({ type: ["weekend", "hifdh"] }).sort()).toEqual(["ilm-academy", "salam-day-school"])
    expect(f({ country: ["CA"] }).every((id) => docs.find((d) => d.id === id)!.country === "CA")).toBe(true)
    expect(f({ type: ["weekend"], country: ["CA"] })).toEqual([])
  })

  it("grade ranges: covers vs overlaps, either order, K and PK", () => {
    const k12 = withDoc({ id: "a", gradeFrom: -2, gradeTo: 12 })
    const hs = withDoc({ id: "b", gradeFrom: 9, gradeTo: 12 })
    const elem = withDoc({ id: "c", gradeFrom: 0, gradeTo: 5 })
    const pool = [k12, hs, elem]
    expect(ids("", { grade: 0, gradeTo: 8, gradeMode: "covers" }, pool)).toEqual(["a"])
    expect(ids("", { grade: 0, gradeTo: 8, gradeMode: "overlaps" }, pool).sort()).toEqual(["a", "b", "c"].filter((x) => x !== "b"))
    expect(ids("", { grade: 8, gradeTo: 0, gradeMode: "overlaps" }, pool).sort()).toEqual(["a", "c"])
    expect(ids("", { grade: 11, gradeTo: 12, gradeMode: "overlaps" }, pool).sort()).toEqual(["a", "b"])
    expect(ids("", { grade: -2 }, pool)).toEqual(["a"])
  })

  it("accreditation: any / none / specific, with any-vs-all", () => {
    const a = withDoc({ id: "a", accreditation: ["Cognia", "ISLA"] })
    const b = withDoc({ id: "b", accreditation: ["Cognia"] })
    const c = withDoc({ id: "c", accreditation: [] })
    const pool = [a, b, c]
    expect(ids("", { accredited: "yes" }, pool).sort()).toEqual(["a", "b"])
    expect(ids("", { accredited: "no" }, pool)).toEqual(["c"])
    expect(ids("", { agency: ["cognia"] }, pool).sort()).toEqual(["a", "b"])
    expect(ids("", { agency: ["Cognia", "isla"], agencyAll: true }, pool)).toEqual(["a"])
    expect(ids("", { agency: ["Cognia", "isla"], agencyAll: false }, pool).sort()).toEqual(["a", "b"])
  })

  it("programs tri-state: yes, no, any", () => {
    const a = withDoc({ id: "a", tags: ["quran", "arabic"] })
    const b = withDoc({ id: "b", tags: ["quran"] })
    const c = withDoc({ id: "c", tags: [] })
    const pool = [a, b, c]
    expect(ids("", { yes: ["quran"] }, pool).sort()).toEqual(["a", "b"])
    expect(ids("", { yes: ["quran"], no: ["arabic"] }, pool)).toEqual(["b"])
    expect(ids("", { no: ["quran"] }, pool)).toEqual(["c"])
  })

  it("features: all by default, any on request", () => {
    const a = withDoc({ id: "a", features: ["library", "dorms"] })
    const b = withDoc({ id: "b", features: ["library"] })
    const pool = [a, b]
    expect(ids("", { features: ["library", "dorms"] }, pool)).toEqual(["a"])
    expect(ids("", { features: ["library", "dorms"], featuresAny: true }, pool).sort()).toEqual(["a", "b"])
  })

  it("ranges: bounds inclusive, unknown excluded unless opted in, swapped min/max handled at parse", () => {
    const a = withDoc({ id: "a", tuition: 5000 })
    const b = withDoc({ id: "b", tuition: 9000 })
    const c = withDoc({ id: "c", tuition: null })
    const pool = [a, b, c]
    expect(ids("", { ranges: { tuition: { min: 5000, max: 9000 } } }, pool).sort()).toEqual(["a", "b"])
    expect(ids("", { ranges: { tuition: { max: 6000 } } }, pool)).toEqual(["a"])
    expect(ids("", { ranges: { tuition: { max: 6000, unknown: true } } }, pool).sort()).toEqual(["a", "c"])
    expect(ids("", { ranges: { tuition: {} } }, pool)).toHaveLength(3) // empty range = inactive
    expect(parseSearchState(new URLSearchParams("tuition=9000..5000")).ranges.tuition).toEqual({ min: 5000, max: 9000 })
    expect(ids("", { ranges: { retention: { min: 80 } } }, [withDoc({ id: "r", retention: 0.84 }), withDoc({ id: "s", retention: null })])).toEqual(["r"])
  })

  it("schedule filters", () => {
    const a = withDoc({ id: "a", fridayEarly: true, startMinutes: 470 })
    const b = withDoc({ id: "b", fridayEarly: false, startMinutes: 540 })
    const c = withDoc({ id: "c", fridayEarly: false, startMinutes: null })
    const pool = [a, b, c]
    expect(ids("", { fridayEarly: true }, pool)).toEqual(["a"])
    expect(ids("", { fridayEarly: false }, pool).sort()).toEqual(["b", "c"])
    expect(ids("", { startBefore: 480 }, pool)).toEqual(["a"])
    expect(ids("", { startAfter: 480 }, pool)).toEqual(["b"]) // unparseable start never matches a window
  })

  it("data-quality flags and stale sections (staff)", () => {
    expect(f({ dq: ["approx-coords"] }).length).toBeGreaterThan(0)
    expect(f({ dq: ["no-coords"] })).toEqual([])
    expect(f({ dq: ["approx-coords", "no-coords"] })).toEqual([]) // flags AND together
    const pub = toSearchDoc(schools[0], NOW, { staffFields: false })
    expect(pub.dq).toEqual([])
    expect(pub.salary).toBeNull()
    expect(pub.retention).toBeNull()
    expect(pub.staleSections).toEqual([])
  })

  it("flags duplicates by phone, website host or name+city", () => {
    const dup = schools.map((s, i) => (i === 1 ? { ...schools[0], id: "copy" } : s)).slice(0, 3)
    const marked = markDuplicates(dup.map((s) => toSearchDoc(s, NOW, { staffFields: true })), dup, true)
    expect(marked.filter((d) => d.dq.includes("duplicate")).map((d) => d.id).sort()).toEqual(["al-noor-academy", "copy"])
    expect(markDuplicates(dup.map((s) => toSearchDoc(s, NOW, { staffFields: false })), dup, false).some((d) => d.dq.length)).toBe(false)
  })

  it("map bounds: filters, and counts schools without coordinates separately", () => {
    const texas = { south: 25, west: -107, north: 37, east: -93 }
    const r = runSearch(docs, { ...EMPTY_STATE, bounds: texas })
    expect(r.rows.length).toBeGreaterThan(0)
    expect(r.rows.every((x) => x.doc.state === "TX")).toBe(true)
    const noGeo = withDoc({ id: "ng", lat: null, lng: null })
    expect(runSearch([noGeo], { ...EMPTY_STATE, bounds: texas }).unlocated).toHaveLength(1)
  })

  it("combines everything and still behaves", () => {
    const r = runSearch(docs, {
      ...EMPTY_STATE, q: "academy -noor state:TX", region: ["southwest"], status: ["active", "grace"], type: ["standard"],
      grade: 5, features: ["sports"], ranges: { enrollment: { min: 100 }, tuition: { max: 20000, unknown: true } },
      sort: "enrollment",
    })
    expect(r.rows.every((x) => x.doc.state === "TX" && x.doc.region === "southwest")).toBe(true)
    expect(r.chips.length).toBeGreaterThan(5)
    expect(() => explainEmpty(docs, r)).not.toThrow()
  })

  it("facet counts exclude their own facet and match real results", () => {
    const state: SearchState = { ...EMPTY_STATE, region: ["southwest"], type: ["standard"] }
    const counts = computeFacetCounts(docs, state)
    // Region counts ignore the region filter itself...
    expect(counts.region.northeast).toBe(runSearch(docs, { ...state, region: ["northeast"] }).rows.length)
    // ...but respect the other filters.
    expect(counts.type.weekend).toBe(runSearch(docs, { ...state, type: ["weekend"] }).rows.length)
    expect(counts.type.weekend).toBe(0) // the weekend school isn't southwest
    // Listing counts include closed schools even though they are hidden by default.
    expect(computeFacetCounts(docs, { ...EMPTY_STATE, region: ["canada"] }).listing.closed).toBe(1)
    for (const g of Object.values(counts)) for (const n of Object.values(g)) expect(n).toBeGreaterThanOrEqual(0)
  })

  it("chip removal for every facet returns a state without that facet", () => {
    const state: SearchState = { ...EMPTY_STATE, region: ["west"], type: ["standard"], yes: ["quran"], no: ["arabic"], features: ["library"], agency: ["Cognia"], dq: ["stale"], staleSection: ["programs"], country: ["US"], listing: ["closed"], ranges: { tuition: { max: 9000 } }, fridayEarly: true, startAfter: 420, startBefore: 540, grade: 3, gradeTo: 6, accredited: "yes", bounds: { south: 0, west: 0, north: 1, east: 1 } }
    const r = runSearch(docs, state)
    for (const chip of r.chips) {
      const before = JSON.stringify(serializeSearchState(r.state).toString())
      expect(JSON.stringify(serializeSearchState(chip.without).toString())).not.toBe(before)
    }
    expect(r.chips.length).toBeGreaterThanOrEqual(15)
  })
})

describe("url state: facets", () => {
  it("round-trips every facet", () => {
    const s: SearchState = {
      ...EMPTY_STATE,
      q: "noor", country: ["US", "CA"], type: ["weekend", "hifdh"], listing: ["open", "closed"],
      grade: 0, gradeTo: 8, gradeMode: "overlaps", accredited: "yes", agency: ["Cognia", "ISLA"], agencyAll: true,
      yes: ["quran"], no: ["arabic"], features: ["library", "dorms"], featuresAny: true,
      ranges: { tuition: { min: 5000, max: 9000, unknown: true }, enrollment: { min: 100 }, retention: { max: 90 } },
      fridayEarly: true, startAfter: 420, startBefore: 540, dq: ["stale", "duplicate"], staleSection: ["programs"],
      bounds: { south: 25, west: -107, north: 37, east: -93 }, sort: "tuition",
    }
    expect(parseSearchState(serializeSearchState(s))).toEqual(s)
  })

  it("rejects bad facet values individually", () => {
    const s = parseSearchState(new URLSearchParams("type=weekend,bogus&list=open,x&cn=us,mx&py=quran,quran,nope&pn=quran&ft=library,xx&tuition=abc&enr=..&gto=7&acc=maybe&fe=2&sa=99999&dq=stale,zzz&vs=programs,nope&b=1,2,3&ag=" + "x".repeat(100)))
    expect(s.type).toEqual(["weekend"])
    expect(s.listing).toEqual(["open"])
    expect(s.country).toEqual(["US"])
    expect(s.yes).toEqual(["quran"])
    expect(s.no).toEqual([]) // can't be both required and forbidden
    expect(s.features).toEqual(["library"])
    expect(s.ranges).toEqual({})
    expect(s.gradeTo).toBeNull() // gto without grade
    expect(s.accredited).toBeNull()
    expect(s.fridayEarly).toBeNull()
    expect(s.startAfter).toBe(1439)
    expect(s.dq).toEqual(["stale"])
    expect(s.staleSection).toEqual(["programs"])
    expect(s.bounds).toBeNull()
    expect(s.agency[0]).toHaveLength(60)
  })

  it("empty range params and any/all flags without multiple values are omitted", () => {
    const qs = serializeSearchState({ ...EMPTY_STATE, ranges: { tuition: {} }, agency: ["A"], agencyAll: true, features: ["library"], featuresAny: true }).toString()
    expect(qs).not.toMatch(/tuition|agall|fany/)
  })
})
