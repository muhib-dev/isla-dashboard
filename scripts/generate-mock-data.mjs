// Generates deterministic sample data for the mock adapter.
// Usage: node scripts/generate-mock-data.mjs
// All schools, people and figures are fictional.
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../src/data")
mkdirSync(OUT, { recursive: true })

let seed = 20261011
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const between = (min, max) => Math.round(min + rand() * (max - min))
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const chance = (p) => rand() < p

const SCHOOLS = [
  ["al-noor-academy", "Al-Noor Academy", "Austin", "TX", "southwest"],
  ["crescent-valley-school", "Crescent Valley School", "Phoenix", "AZ", "southwest"],
  ["bayan-preparatory", "Bayan Preparatory", "Houston", "TX", "southwest"],
  ["iqra-learning-center", "Iqra Learning Center", "Dallas", "TX", "southwest"],
  ["hikmah-academy", "Hikmah Academy", "San Antonio", "TX", "southwest"],
  ["al-huda-school", "Al-Huda School", "Paterson", "NJ", "northeast"],
  ["furqan-academy", "Furqan Academy", "Brooklyn", "NY", "northeast"],
  ["salam-day-school", "Salam Day School", "Boston", "MA", "northeast"],
  ["noor-ul-ilm-school", "Noor ul Ilm School", "Philadelphia", "PA", "northeast"],
  ["darul-arqam-academy", "Darul Arqam Academy", "Chicago", "IL", "midwest"],
  ["ihsan-academy", "Ihsan Academy", "Dearborn", "MI", "midwest"],
  ["tawheed-prep", "Tawheed Prep", "Columbus", "OH", "midwest"],
  ["minaret-school", "Minaret School", "Minneapolis", "MN", "midwest"],
  ["rahmah-academy", "Rahmah Academy", "Atlanta", "GA", "southeast"],
  ["al-fajr-school", "Al-Fajr School", "Orlando", "FL", "southeast"],
  ["andalusia-academy", "Andalusia Academy", "Charlotte", "NC", "southeast"],
  ["sabeel-academy", "Sabeel Academy", "Nashville", "TN", "southeast"],
  ["madinah-prep", "Madinah Prep", "Fairfax", "VA", "southeast"],
  ["ilm-academy", "Ilm Academy", "Seattle", "WA", "west"],
  ["pacific-crescent-school", "Pacific Crescent School", "San Jose", "CA", "west"],
  ["sakinah-school", "Sakinah School", "Los Angeles", "CA", "west"],
  ["huda-academy", "Huda Academy", "Denver", "CO", "west"],
  ["maple-crescent-school", "Maple Crescent School", "Toronto", "ON", "canada"],
  ["al-rashid-academy", "Al-Rashid Academy", "Mississauga", "ON", "canada"],
  ["prairie-light-school", "Prairie Light School", "Calgary", "AB", "canada"],
  ["nur-academy", "Nur Academy", "Montreal", "QC", "canada"],
]

const REGION_BASE = {
  northeast: { tuition: 9800, salary: 46000 },
  southeast: { tuition: 7600, salary: 39000 },
  midwest: { tuition: 7200, salary: 38500 },
  southwest: { tuition: 7900, salary: 40500 },
  west: { tuition: 10400, salary: 48500 },
  canada: { tuition: 8600, salary: 44000 },
}

const FIRST = ["Amina", "Yusuf", "Fatima", "Omar", "Khadija", "Bilal", "Maryam", "Ibrahim", "Sumayyah", "Hamza", "Zainab", "Tariq", "Aisha", "Idris", "Hafsa", "Ismail", "Layla", "Kareem", "Noura", "Samir"]
const LAST = ["Rahman", "Siddiqui", "Haddad", "Qureshi", "Abdullah", "Hassan", "Malik", "Farouk", "Karim", "Nasser", "Shah", "Darwish", "Yilmaz", "Osman", "Bakr", "Sayed", "Hussain", "Ali", "Mansour", "Chaudhry"]
const person = () => `${pick(FIRST)} ${pick(LAST)}`

const GRADE_SPANS = [
  ["PK", "8"],
  ["PK", "12"],
  ["K", "8"],
  ["K", "12"],
  ["PK", "5"],
  ["6", "12"],
]
const ACCREDITORS = ["Cognia", "WASC", "MSA-CESS", "NEASC", "CAIS", "FCIS"]
const LUNCH_PROVIDERS = ["In-house kitchen", "Local halal caterer", "Parent-run program", "Outside vendor"]
const ATHLETICS = ["Basketball", "Soccer", "Volleyball", "Track", "Swimming"]

const iso = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10)
const randomDate = (fromYear, toYear) => {
  const y = between(fromYear, toYear)
  const m = y === 2026 ? between(1, 9) : between(1, 12)
  return iso(y, m, between(1, 28))
}

// Most schools keep their profile current; about a third have sections that slipped.
const verificationDates = () => {
  const keepsCurrent = chance(0.62)
  const recent = () => iso(2026, between(4, 9), between(1, 28))
  const slipped = () => (chance(0.5) ? randomDate(2023, 2024) : iso(2025, between(1, 9), between(1, 28)))
  return Object.fromEntries(
    ["overview", "leadership", "schedule", "programs", "contacts"].map((section) => [
      section,
      keepsCurrent || chance(0.55) ? recent() : slipped(),
    ]),
  )
}

const schools = SCHOOLS.map(([id, name, city, state, region]) => {
  const isDemo = id === "al-noor-academy"
  const enrollment = isDemo ? 342 : between(90, 880)
  const ratio = between(10, 16)
  const base = REGION_BASE[region]
  const [gradesFrom, gradesTo] = isDemo ? ["PK", "12"] : pick(GRADE_SPANS)
  const history = []
  let value = Math.round(enrollment * (0.78 + rand() * 0.12))
  for (const year of [2022, 2023, 2024, 2025, 2026]) {
    if (year === 2026) value = enrollment
    history.push({ year, value })
    value = Math.round(value * (1.02 + rand() * 0.07))
  }
  const statusRoll = rand()
  const membershipStatus = isDemo ? "active" : statusRoll < 0.6 ? "active" : statusRoll < 0.75 ? "grace" : statusRoll < 0.9 ? "lapsed" : "non_member"
  const lunchOffered = isDemo ? true : chance(0.72)

  return {
    id,
    name,
    region,
    address: {
      street: `${between(100, 9900)} ${pick(["Oak", "Cedar", "Maple", "Crescent", "Mill", "Park", "Lake"])} ${pick(["Rd", "Ave", "Blvd", "Dr", "St"])}`,
      city,
      state,
      postalCode: region === "canada" ? `${pick(["M", "L", "T", "H"])}${between(1, 9)}${pick(["A", "B", "K"])} ${between(1, 9)}${pick(["C", "J", "R"])}${between(1, 9)}` : isDemo ? "78704" : String(between(10000, 99999)),
      country: region === "canada" ? "CA" : "US",
    },
    phone: `(${between(201, 989)}) 555-${String(between(100, 999)).padStart(4, "0")}`,
    email: `office@${id.replace(/-/g, "")}.example.org`,
    website: `https://${id}.example.org`,
    founded: isDemo ? 2004 : between(1985, 2016),
    gradesFrom,
    gradesTo,
    accreditation: isDemo ? ["Cognia"] : chance(0.7) ? [pick(ACCREDITORS)] : [],
    metrics: {
      enrollment,
      teachers: Math.max(6, Math.round(enrollment / ratio)),
      tuition: isDemo ? 8450 : Math.round((base.tuition + between(-1500, 2200)) / 50) * 50,
      avgTeacherSalary: isDemo ? 41200 : Math.round((base.salary + between(-4500, 5500)) / 100) * 100,
      retentionRate: isDemo ? 0.84 : Math.round((0.7 + rand() * 0.22) * 100) / 100,
      enrollmentHistory: history,
    },
    leadership: isDemo
      ? [
          { id: "l1", name: "Amina Rahman", role: "Principal", email: "a.rahman@alnooracademy.example.org", since: 2018 },
          { id: "l2", name: "Yusuf Haddad", role: "Board Chair", email: "board@alnooracademy.example.org", since: 2021 },
          { id: "l3", name: "", role: "Vice Principal", email: "", since: null },
        ]
      : [
          { id: "l1", name: person(), role: "Principal", email: `principal@${id.replace(/-/g, "")}.example.org`, since: between(2010, 2025) },
          { id: "l2", name: person(), role: "Board Chair", email: `board@${id.replace(/-/g, "")}.example.org`, since: between(2015, 2025) },
        ],
    schedule: {
      startTime: isDemo ? "07:50" : pick(["07:45", "08:00", "08:15", "08:30"]),
      endTime: isDemo ? "15:20" : pick(["15:00", "15:15", "15:30", "15:45"]),
      firstDay: "2026-08-17",
      lastDay: "2027-05-28",
      fridayEarlyRelease: isDemo ? true : chance(0.5),
      note: isDemo ? "Early release on Fridays at 12:45 for Jumu'ah." : "",
    },
    programs: {
      lunch: {
        offered: lunchOffered,
        provider: lunchOffered ? (isDemo ? "Local halal caterer" : pick(LUNCH_PROVIDERS)) : "",
        allHalal: lunchOffered,
        freeReducedAvailable: lunchOffered && chance(0.35),
      },
      transportation: isDemo ? false : chance(0.3),
      quran: true,
      arabic: true,
      afterCare: isDemo ? true : chance(0.6),
      athletics: isDemo ? ["Basketball", "Soccer"] : ATHLETICS.filter(() => chance(0.35)),
    },
    membership: {
      status: membershipStatus,
      memberSince: isDemo ? 2016 : between(2008, 2024),
    },
    verifiedAt: isDemo
      ? { overview: "2026-08-20", leadership: "2025-06-02", schedule: "2026-08-20", programs: "2025-03-14", contacts: "2026-01-10" }
      : verificationDates(),
    updatedAt: isDemo ? "2026-08-20" : randomDate(2024, 2026),
  }
})

const PRODUCTS = [
  { id: "board-governance", name: "Board Governance & Leadership Toolkit", price: 599, summary: "Bylaws, board calendars, evaluation forms and meeting templates." },
  { id: "complete-series", name: "Complete Series: All Five Toolkits", price: 2299, summary: "Every Template Series toolkit in one bundle." },
  { id: "employee-hr", name: "Employee & HR Essentials Toolkit", price: 799, summary: "Handbook, contracts, onboarding and evaluation templates." },
  { id: "school-launch", name: "School Launch & Continuous Improvement Toolkit", price: 399, summary: "Planning templates for new schools and annual improvement cycles." },
  { id: "operations-safety", name: "School Operations, Safety & Readiness Toolkit", price: 599, summary: "Emergency plans, drills, facilities and operations checklists." },
  { id: "student-family", name: "Student, Family & School Culture Toolkit", price: 699, summary: "Family handbook, behavior policy and school-culture templates." },
].map((p) => ({ ...p, category: "Template Series", url: "https://theisla.org/shop/" }))

const BAND = 100
const tierFor = (enrollment) => {
  const lower = Math.floor((enrollment - 1) / BAND) * BAND + 1
  return { label: `${lower}–${lower + BAND - 1} students`, annualDues: 450 + Math.floor((enrollment - 1) / BAND) * 150 }
}

const invoices = []
let invoiceNo = 1040
for (const s of schools) {
  if (s.membership.status === "non_member") continue
  const tier = tierFor(s.metrics.enrollment)
  for (const year of [2022, 2023, 2024, 2025, 2026]) {
    if (year < s.membership.memberSince) continue
    const isCurrent = year === 2026
    const status = !isCurrent ? "paid" : s.membership.status === "active" ? "paid" : s.membership.status === "grace" ? "open" : "overdue"
    invoices.push({
      id: `inv_${++invoiceNo}`,
      number: `ISLA-${year}-${invoiceNo}`,
      schoolId: s.id,
      issuedOn: iso(year, 8, 1),
      dueOn: iso(year, 8, 31),
      kind: "membership",
      description: `School membership ${year}–${String(year + 1).slice(2)} · ${tier.label}`,
      amount: tier.annualDues,
      status,
    })
  }
  if (chance(0.55) || s.id === "al-noor-academy") {
    const product = s.id === "al-noor-academy" ? PRODUCTS[2] : pick(PRODUCTS)
    invoices.push({
      id: `inv_${++invoiceNo}`,
      number: `ISLA-S-${invoiceNo}`,
      schoolId: s.id,
      issuedOn: s.id === "al-noor-academy" ? "2026-02-11" : randomDate(2024, 2026),
      dueOn: null,
      kind: "store",
      description: product.name,
      amount: product.price,
      status: "paid",
    })
  }
  if (chance(0.4) || s.id === "al-noor-academy") {
    invoices.push({
      id: `inv_${++invoiceNo}`,
      number: `ISLA-E-${invoiceNo}`,
      schoolId: s.id,
      issuedOn: "2025-10-20",
      dueOn: null,
      kind: "event",
      description: "Leadership Retreat 2025 · 2 registrations",
      amount: 900,
      status: "paid",
    })
  }
}

const plans = schools
  .filter((s) => s.membership.status !== "non_member")
  .map((s) => ({
    schoolId: s.id,
    tier: tierFor(s.metrics.enrollment).label,
    annualDues: tierFor(s.metrics.enrollment).annualDues,
    renewsOn: s.id === "al-noor-academy" ? "2026-11-01" : iso(2027, 8, 1),
    autoRenew: s.id === "al-noor-academy" ? false : chance(0.6),
    paymentMethod: chance(0.85) || s.id === "al-noor-academy" ? { brand: pick(["Visa", "Mastercard", "Amex"]), last4: String(between(1000, 9999)), expires: `${String(between(1, 12)).padStart(2, "0")}/${between(27, 30)}` } : null,
  }))

const JOB_TITLES = [
  ["Elementary Teacher (Grade 3)", "teaching"],
  ["Middle School Math Teacher", "teaching"],
  ["High School Science Teacher", "teaching"],
  ["Quran & Islamic Studies Teacher", "teaching"],
  ["Arabic Teacher", "teaching"],
  ["School Counselor", "student_services"],
  ["Assistant Principal", "leadership"],
  ["Front Office Coordinator", "operations"],
  ["Special Education Coordinator", "student_services"],
  ["PE Coach", "teaching"],
]
const jobs = []
let jobNo = 300
const demoJobs = [
  ["Middle School Math Teacher", "teaching", "full_time", "open", "2026-09-22", 14],
  ["Quran & Islamic Studies Teacher", "teaching", "full_time", "open", "2026-09-30", 9],
  ["After-care Assistant", "operations", "part_time", "open", "2026-10-03", 4],
  ["High School Science Teacher", "teaching", "full_time", "filled", "2026-05-12", 22],
]
for (const [title, category, type, status, postedOn, applicants] of demoJobs) {
  jobs.push({ id: `job_${++jobNo}`, schoolId: "al-noor-academy", title, category, type, status, postedOn, applicants })
}
for (const s of schools.slice(1)) {
  const n = between(0, 3)
  for (let k = 0; k < n; k++) {
    const [title, category] = pick(JOB_TITLES)
    jobs.push({
      id: `job_${++jobNo}`,
      schoolId: s.id,
      title,
      category,
      type: chance(0.8) ? "full_time" : "part_time",
      status: chance(0.8) ? "open" : "filled",
      postedOn: randomDate(2026, 2026),
      applicants: between(0, 30),
    })
  }
}

const write = (name, data) => writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + "\n")
write("schools.json", schools)
write("products.json", PRODUCTS)
write("invoices.json", invoices)
write("plans.json", plans)
write("jobs.json", jobs)
console.log(`schools=${schools.length} invoices=${invoices.length} plans=${plans.length} jobs=${jobs.length} products=${PRODUCTS.length}`)
