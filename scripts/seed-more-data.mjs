// Appends extra fictional schools (plus their invoices, plans, jobs and claims) so
// tables, maps and charts look as dense as the design mocks.
// Usage: node scripts/seed-more-data.mjs
// Avoids cities near the search.test.ts fixtures (Dallas radius, Texas bounds box).
// Additive and idempotent: existing records are never changed, and records whose
// id already exists are skipped, so re-running is safe.
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { PLACES } from "./places-data.mjs"

const DATA = join(dirname(fileURLToPath(import.meta.url)), "../src/data")
const read = (name) => JSON.parse(readFileSync(join(DATA, name), "utf8"))
const write = (name, data) => writeFileSync(join(DATA, name), JSON.stringify(data, null, 2) + "\n")

let seed = 20261015
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const between = (min, max) => Math.round(min + rand() * (max - min))
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const chance = (p) => rand() < p
const iso = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10)
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

const REGION_OF = {
  NJ: "northeast", NY: "northeast", MA: "northeast", CT: "northeast", RI: "northeast", PA: "northeast", MD: "northeast", DC: "northeast",
  VA: "southeast", GA: "southeast", FL: "southeast", NC: "southeast", TN: "southeast", KY: "southeast", LA: "southeast",
  IL: "midwest", MI: "midwest", OH: "midwest", IN: "midwest", WI: "midwest", MN: "midwest", MO: "midwest",
  TX: "southwest", AZ: "southwest", OK: "southwest", NM: "southwest", NV: "southwest",
  WA: "west", OR: "west", CA: "west", UT: "west", CO: "west", HI: "west", AK: "west",
}
const REGION_BASE = {
  northeast: { tuition: 9800, salary: 46000 },
  southeast: { tuition: 7600, salary: 39000 },
  midwest: { tuition: 7200, salary: 38500 },
  southwest: { tuition: 7900, salary: 40500 },
  west: { tuition: 10400, salary: 48500 },
  canada: { tuition: 8600, salary: 44000 },
}

// [name, city, state] — all fictional.
const NEW_SCHOOLS = [
  ["Al-Bayan Academy", "Fort Worth", "TX"], ["Riverbend Islamic School", "Sugar Land", "TX"], ["Nasr Academy", "Round Rock", "TX"], ["Oasis Learning Academy", "Las Vegas", "NV"],
  ["Hudson Valley Islamic Academy", "New York", "NY"], ["Garden State Prep", "Newark", "NJ"], ["Liberty Crescent School", "Jersey City", "NJ"],
  ["Lakefront Academy", "Buffalo", "NY"], ["Pioneer Valley School", "Springfield", "MA"], ["Charter Oak Islamic School", "Hartford", "CT"],
  ["Ocean State Academy", "Providence", "RI"], ["Three Rivers Academy", "Pittsburgh", "PA"], ["Chesapeake Crescent School", "Baltimore", "MD"],
  ["Capitol Prep Academy", "Washington", "DC"],
  ["James River Academy", "Richmond", "VA"], ["Magnolia School", "Miami", "FL"], ["Gulf Coast Academy", "Tampa", "FL"],
  ["First Coast Islamic School", "Jacksonville", "FL"], ["Triangle Prep", "Raleigh", "NC"], ["Bluff City Academy", "Memphis", "TN"],
  ["Bluegrass Crescent School", "Louisville", "KY"], ["Crescent City Academy", "New Orleans", "LA"],
  ["Motor City Islamic Academy", "Detroit", "MI"], ["Lake Erie School", "Cleveland", "OH"], ["Queen City Prep", "Cincinnati", "OH"],
  ["Circle City Academy", "Indianapolis", "IN"], ["Brew City Islamic School", "Milwaukee", "WI"], ["Gateway Academy", "St. Louis", "MO"],
  ["Heartland Crescent School", "Kansas City", "MO"], ["Lincoln Land Academy", "Springfield", "IL"],
  ["Rose City Academy", "Portland", "OR"], ["Golden Gate Islamic School", "San Francisco", "CA"], ["River City Prep", "Sacramento", "CA"],
  ["Pacific Light Academy", "San Diego", "CA"], ["Wasatch Academy", "Salt Lake City", "UT"], ["Aloha Crescent School", "Honolulu", "HI"],
  ["Northern Lights School", "Anchorage", "AK"],
  ["Peel Crescent Academy", "Brampton", "ON"], ["Unionville Islamic School", "Markham", "ON"], ["Steeltown Academy", "Hamilton", "ON"],
  ["Forest City Prep", "London", "ON"], ["Capital Crescent School", "Ottawa", "ON"], ["Vieux-Port Academy", "Quebec City", "QC"],
  ["River Valley School", "Edmonton", "AB"], ["Coastal Crescent Academy", "Vancouver", "BC"], ["Fraser Academy", "Surrey", "BC"],
  ["Red River Islamic School", "Winnipeg", "MB"], ["Bridge City Academy", "Saskatoon", "SK"], ["Queen City Crescent School", "Regina", "SK"],
  ["Harbourview Academy", "Halifax", "NS"],
]

const FIRST = ["Amina", "Yusuf", "Fatima", "Omar", "Khadija", "Bilal", "Maryam", "Ibrahim", "Sumayyah", "Hamza", "Zainab", "Tariq", "Aisha", "Idris", "Hafsa", "Ismail", "Layla", "Kareem", "Noura", "Samir", "Ruqayyah", "Anas", "Salma", "Harun"]
const LAST = ["Rahman", "Siddiqui", "Haddad", "Qureshi", "Abdullah", "Hassan", "Malik", "Farouk", "Karim", "Nasser", "Shah", "Darwish", "Yilmaz", "Osman", "Bakr", "Sayed", "Hussain", "Ali", "Mansour", "Chaudhry", "Begum", "Diallo"]
const person = () => `${pick(FIRST)} ${pick(LAST)}`
const GRADE_SPANS = [["PK", "8"], ["PK", "12"], ["K", "8"], ["K", "12"], ["PK", "5"], ["6", "12"]]
const ACCREDITORS = ["Cognia", "WASC", "MSA-CESS", "NEASC", "CAIS", "FCIS"]
const LUNCH_PROVIDERS = ["In-house kitchen", "Local halal caterer", "Parent-run program", "Outside vendor"]
const ATHLETICS = ["Basketball", "Soccer", "Volleyball", "Track", "Swimming"]
const FEATURES = ["e_learning", "computer_lab", "library", "uniform", "afterschool_clubs", "scholarship", "financial_aid", "sports", "hot_lunch", "science_lab", "sibling_discount", "robotics_club"]
const BAND = 100
const tierFor = (n) => {
  const lower = Math.floor((n - 1) / BAND) * BAND + 1
  return { label: `${lower}–${lower + BAND - 1} students`, annualDues: 450 + Math.floor((n - 1) / BAND) * 150 }
}

const schools = read("schools.json")
const invoices = read("invoices.json")
const plans = read("plans.json")
const jobs = read("jobs.json")
const claims = read("claims.json")
const offers = read("offers.json")
const products = read("products.json")

const ids = new Set(schools.map((s) => s.id))
const nextNum = (list, re) => Math.max(0, ...list.map((x) => Number((x.id.match(re) || [])[1] || 0)))
let invoiceNo = nextNum(invoices, /^inv_(\d+)$/)
let jobNo = nextNum(jobs, /^job_(\d+)$/)
let claimNo = nextNum(claims, /^claim_(\d+)$/)

const added = []
for (const [name, city, state] of NEW_SCHOOLS) {
  const id = slug(name)
  const place = PLACES.find(([n, st]) => n === city && st === state)
  if (ids.has(id) || !place) continue
  const country = place[2]
  const region = country === "CA" ? "canada" : REGION_OF[state]
  const base = REGION_BASE[region]
  const enrollment = between(80, 920)
  const ratio = between(10, 16)
  const [gradesFrom, gradesTo] = pick(GRADE_SPANS)
  const history = []
  let value = Math.round(enrollment * (0.76 + rand() * 0.14))
  for (const year of [2022, 2023, 2024, 2025, 2026]) {
    if (year === 2026) value = enrollment
    history.push({ year, value })
    value = Math.round(value * (1.01 + rand() * 0.08))
  }
  const roll = rand()
  const status = roll < 0.66 ? "active" : roll < 0.8 ? "grace" : roll < 0.9 ? "lapsed" : "non_member"
  const lunchOffered = chance(0.72)
  const handle = id.replace(/-/g, "")
  const recent = () => iso(2026, between(4, 10), between(1, 14))
  const verified = chance(0.65)
  const features = FEATURES.filter(() => chance(0.32))
  if (lunchOffered && !features.includes("hot_lunch")) features.push("hot_lunch")
  const athletics = ATHLETICS.filter(() => chance(0.35))
  if (athletics.length && !features.includes("sports")) features.push("sports")

  const school = {
    id,
    name,
    region,
    address: {
      street: `${between(100, 9900)} ${pick(["Oak", "Cedar", "Maple", "Crescent", "Mill", "Park", "Lake", "River"])} ${pick(["Rd", "Ave", "Blvd", "Dr", "St"])}`,
      city,
      state,
      postalCode: country === "CA" ? `${pick(["M", "L", "T", "H", "V", "R", "S", "B", "K", "G"])}${between(1, 9)}${pick(["A", "B", "K"])} ${between(1, 9)}${pick(["C", "J", "R"])}${between(1, 9)}` : String(between(10000, 99999)),
      country,
      geo: { lat: place[3], lng: place[4], precision: "city", source: "gazetteer", updatedAt: "2026-10-15" },
    },
    phone: `(${between(201, 989)}) 555-${String(between(100, 999)).padStart(4, "0")}`,
    email: `office@${handle}.example.org`,
    website: `https://${id}.example.org`,
    founded: between(1988, 2020),
    gradesFrom,
    gradesTo,
    accreditation: chance(0.7) ? [pick(ACCREDITORS)] : [],
    metrics: {
      enrollment,
      teachers: Math.max(6, Math.round(enrollment / ratio)),
      tuition: Math.round((base.tuition + between(-1500, 2200)) / 50) * 50,
      avgTeacherSalary: Math.round((base.salary + between(-4500, 5500)) / 100) * 100,
      retentionRate: Math.round((0.7 + rand() * 0.22) * 100) / 100,
      enrollmentHistory: history,
    },
    leadership: [
      { id: "l1", name: person(), role: "Principal", email: `principal@${handle}.example.org`, since: between(2010, 2025) },
      { id: "l2", name: person(), role: "Board Chair", email: `board@${handle}.example.org`, since: between(2015, 2025) },
    ],
    schedule: {
      startTime: pick(["07:45", "08:00", "08:15", "08:30"]),
      endTime: pick(["15:00", "15:15", "15:30", "15:45"]),
      firstDay: "2026-08-17",
      lastDay: "2027-05-28",
      fridayEarlyRelease: chance(0.5),
      note: "",
    },
    programs: {
      lunch: { offered: lunchOffered, provider: lunchOffered ? pick(LUNCH_PROVIDERS) : "", allHalal: lunchOffered, freeReducedAvailable: lunchOffered && chance(0.35) },
      transportation: chance(0.3),
      quran: true,
      arabic: true,
      afterCare: chance(0.6),
      athletics,
    },
    membership: { status, memberSince: between(2008, 2024) },
    verifiedAt: Object.fromEntries(
      ["overview", "leadership", "schedule", "programs", "contacts"].map((k) => [
        k,
        verified || chance(0.5) ? recent() : chance(0.5) ? iso(between(2023, 2024), between(1, 12), between(1, 28)) : iso(2025, between(1, 9), between(1, 28)),
      ]),
    ),
    updatedAt: recent(),
    type: "standard",
    listing: "open",
    features: FEATURES.filter((f) => features.includes(f)),
    social: chance(0.6) ? { facebook: handle, instagram: handle } : {},
  }
  schools.push(school)
  ids.add(id)
  added.push(school)

  // Billing: membership history + current-year status that matches membership.
  if (status !== "non_member") {
    const tier = tierFor(enrollment)
    for (const year of [2022, 2023, 2024, 2025, 2026]) {
      if (year < school.membership.memberSince) continue
      const current = year === 2026
      invoices.push({
        id: `inv_${++invoiceNo}`,
        number: `ISLA-${year}-${invoiceNo}`,
        schoolId: id,
        issuedOn: iso(year, 8, 1),
        dueOn: iso(year, 8, 31),
        kind: "membership",
        description: `School membership ${year}–${String(year + 1).slice(2)} · ${tier.label}`,
        amount: tier.annualDues,
        status: !current ? "paid" : status === "active" ? "paid" : status === "grace" ? "open" : "overdue",
      })
    }
    if (chance(0.5)) {
      const product = pick(products)
      invoices.push({ id: `inv_${++invoiceNo}`, number: `ISLA-S-${invoiceNo}`, schoolId: id, issuedOn: iso(between(2024, 2026), between(1, 9), between(1, 28)), dueOn: null, kind: "store", description: product.name, amount: product.price, status: chance(0.9) ? "paid" : "refunded" })
    }
    if (chance(0.4)) {
      const n = between(1, 4)
      invoices.push({ id: `inv_${++invoiceNo}`, number: `ISLA-E-${invoiceNo}`, schoolId: id, issuedOn: "2025-10-20", dueOn: null, kind: "event", description: `Leadership Retreat 2025 · ${n} registration${n > 1 ? "s" : ""}`, amount: 450 * n, status: "paid" })
    }
    if (!plans.some((p) => p.schoolId === id)) {
      plans.push({
        schoolId: id,
        tier: tier.label,
        annualDues: tier.annualDues,
        renewsOn: iso(2027, 8, 1),
        autoRenew: chance(0.6),
        paymentMethod: chance(0.85) ? { brand: pick(["Visa", "Mastercard", "Amex"]), last4: String(between(1000, 9999)), expires: `${String(between(1, 12)).padStart(2, "0")}/${between(27, 30)}` } : null,
      })
    }
  }
}

// Jobs for new schools.
const JOB_TITLES = [
  ["Elementary Teacher (Grade 3)", "teaching"], ["Middle School Math Teacher", "teaching"], ["High School Science Teacher", "teaching"],
  ["Quran & Islamic Studies Teacher", "teaching"], ["Arabic Teacher", "teaching"], ["English Language Arts Teacher", "teaching"],
  ["School Counselor", "student_services"], ["Assistant Principal", "leadership"], ["Head of School", "leadership"],
  ["Front Office Coordinator", "operations"], ["Admissions Officer", "operations"], ["Special Education Coordinator", "student_services"],
  ["PE Coach", "teaching"], ["Learning Support Assistant", "student_services"],
]
for (const s of added) {
  for (let k = between(0, 3); k > 0; k--) {
    const [title, category] = pick(JOB_TITLES)
    const r = rand()
    jobs.push({
      id: `job_${++jobNo}`,
      schoolId: s.id,
      title,
      category,
      type: chance(0.8) ? "full_time" : "part_time",
      status: r < 0.7 ? "open" : r < 0.9 ? "filled" : "closed",
      postedOn: iso(2026, between(5, 10), between(1, 14)),
      applicants: between(0, 58),
    })
  }
}

// Offer claims from new member schools.
const liveOffers = offers.map((o) => o.id)
for (const s of added.filter((x) => x.membership.status !== "non_member")) {
  if (!liveOffers.length || !chance(0.35)) continue
  const claimedAt = new Date(Date.UTC(2026, between(6, 8), between(1, 28), between(13, 22)))
  const redeemed = chance(0.4)
  claims.push({
    id: `claim_${String(++claimNo).padStart(3, "0")}`,
    offerId: pick(liveOffers),
    schoolId: s.id,
    schoolName: s.name,
    contactName: s.leadership[0].name,
    contactEmail: s.leadership[0].email,
    note: "",
    claimedAt: claimedAt.toISOString(),
    status: redeemed ? "redeemed" : "claimed",
    ...(redeemed && { redeemedAt: new Date(claimedAt.getTime() + between(3, 20) * 86400000).toISOString() }),
  })
}

// Demo school: a few unpaid invoices so the billing screen shows its overdue / due states.
const DEMO_INVOICES = [
  { id: "inv_demo_1", number: "ISLA-E-2087", schoolId: "al-noor-academy", issuedOn: "2026-08-02", dueOn: "2026-09-01", kind: "event", description: "Leadership Conference 2026 · 4 delegates", amount: 3200, status: "overdue" },
  { id: "inv_demo_2", number: "ISLA-S-2104", schoolId: "al-noor-academy", issuedOn: "2026-09-18", dueOn: "2026-10-18", kind: "store", description: "Featured job · Middle School Math Teacher", amount: 450, status: "open" },
  { id: "inv_demo_3", number: "ISLA-S-2061", schoolId: "al-noor-academy", issuedOn: "2026-06-04", dueOn: "2026-07-04", kind: "store", description: "Promotion · Spring open day", amount: 680, status: "paid", paidOn: "2026-06-20" },
]
for (const inv of DEMO_INVOICES) if (!invoices.some((i) => i.id === inv.id)) invoices.push(inv)

// Teacher retention history (kept if already set): a gentle random walk ending at today's rate.
for (const s of schools) {
  const m = s.metrics
  if (m.retentionHistory || !m.retentionRate || !m.enrollmentHistory.length) continue
  const years = m.enrollmentHistory.map((h) => h.year)
  let v = m.retentionRate
  const back = [v]
  for (let k = 1; k < years.length; k++) {
    v = Math.min(0.97, Math.max(0.62, v + (rand() - 0.55) * 0.08))
    back.push(Math.round(v * 100) / 100)
  }
  m.retentionHistory = years.map((year, i) => ({ year, value: back[years.length - 1 - i] }))
}

// Payment dates for paid invoices (kept if already set). Most pay before the due date;
// about 15% of dues are paid late, which gives the overdue/renewal trends some history.
for (const inv of invoices) {
  if (inv.status !== "paid" || inv.paidOn) continue
  const issued = Date.parse(inv.issuedOn)
  const due = inv.dueOn ? Date.parse(inv.dueOn) : issued + 14 * 86400000
  const late = inv.kind === "membership" && chance(0.15)
  const t = late ? due + between(5, 75) * 86400000 : issued + Math.round(rand() * (due - issued))
  inv.paidOn = new Date(Math.min(t, Date.UTC(2026, 9, 14))).toISOString().slice(0, 10)
}

write("schools.json", schools)
write("invoices.json", invoices)
write("plans.json", plans)
write("jobs.json", jobs)
write("claims.json", claims)
console.log(`added schools=${added.length} → total schools=${schools.length} invoices=${invoices.length} plans=${plans.length} jobs=${jobs.length} claims=${claims.length}`)
