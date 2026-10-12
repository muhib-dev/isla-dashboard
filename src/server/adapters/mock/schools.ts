import "server-only"
import { freshnessOf, regionOf, toSummary } from "@/features/schools/lib"
import type { ProfileSection, School, SectionPatch } from "@/features/schools/schema"
import type { SchoolReport } from "@/features/schools/submissions"
import type { SchoolRepository } from "@/server/repositories/types"
import { latency, tables } from "./store"

/** Mirrors what the API does server-side for PATCH /schools/:id/{section}. */
const applySection: { [S in ProfileSection]: (school: School, patch: SectionPatch<S>) => School } = {
  overview: (school, p) => ({
    ...school,
    name: p.name,
    gradesFrom: p.gradesFrom,
    gradesTo: p.gradesTo,
    founded: p.founded,
    accreditation: p.accreditation.split(",").map((a) => a.trim()).filter(Boolean),
    metrics: { ...school.metrics, enrollment: p.enrollment, teachers: p.teachers, tuition: p.tuition },
  }),
  leadership: (school, p) => ({ ...school, leadership: p.leaders }),
  schedule: (school, p) => ({ ...school, schedule: p }),
  programs: (school, p) => ({ ...school, programs: p }),
  contacts: (school, p) => ({
    ...school,
    phone: p.phone,
    email: p.email,
    website: p.website,
    address: { ...school.address, street: p.street, city: p.city, state: p.state, postalCode: p.postalCode },
  }),
}

export function createMockSchoolRepository(latencyMs: number): SchoolRepository {
  return {
    async list(filter) {
      await latency(latencyMs)
      const now = Date.now()
      const q = filter.q?.toLowerCase()
      return tables.schools
        .map(toSummary)
        .filter(
          (s) =>
            (!q || `${s.name} ${s.city} ${s.state}`.toLowerCase().includes(q)) &&
            (!filter.region || s.region === filter.region) &&
            (!filter.status || s.membership.status === filter.status) &&
            (!filter.freshness || freshnessOf(s.oldestVerifiedAt, now) === filter.freshness),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
    },

    async listAll() {
      await latency(latencyMs)
      return tables.schools
    },

    async get(id) {
      await latency(latencyMs)
      return tables.schools.find((s) => s.id === id) ?? null
    },

    async updateSection(id, section, patch) {
      await latency(latencyMs)
      const index = tables.schools.findIndex((s) => s.id === id)
      if (index === -1) throw new Error(`School ${id} not found`)
      const today = new Date().toISOString().slice(0, 10)
      const apply = applySection[section] as (school: School, patch: SectionPatch<typeof section>) => School
      let next = apply(tables.schools[index], patch)
      next = { ...next, updatedAt: today, verifiedAt: { ...next.verifiedAt, [section]: today } }
      tables.schools[index] = next
      return next
    },

    async createPending(input) {
      await latency(latencyMs)
      const today = new Date().toISOString().slice(0, 10)
      const base = input.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      let id = `${base}-${input.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
      for (let n = 2; tables.schools.some((s) => s.id === id); n++) id = `${base}-${n}`
      const school: School = {
        id,
        name: input.name,
        region: regionOf(input.state, input.country),
        address: { street: input.street, city: input.city, state: input.state, postalCode: input.postalCode, country: input.country },
        phone: input.phone,
        email: input.email,
        website: input.website,
        founded: input.founded ?? new Date().getFullYear(),
        gradesFrom: input.gradesFrom,
        gradesTo: input.gradesTo,
        accreditation: [],
        metrics: { enrollment: 0, teachers: 0, tuition: 0, avgTeacherSalary: 0, retentionRate: 0, enrollmentHistory: [] },
        leadership: [{ id: "l1", name: input.head, role: "Head of School", email: "", since: null }],
        schedule: { startTime: "08:00", endTime: "15:00", firstDay: today, lastDay: today, fridayEarlyRelease: false, note: "" },
        programs: { lunch: { offered: false, provider: "", allHalal: false, freeReducedAvailable: false }, transportation: false, quran: false, arabic: false, afterCare: false, athletics: [] },
        membership: { status: "non_member", memberSince: new Date().getFullYear() },
        type: input.type,
        listing: "pending",
        features: [],
        social: {},
        verifiedAt: { overview: today, leadership: today, schedule: today, programs: today, contacts: today },
        updatedAt: today,
      }
      tables.schools.push(school)
      return school
    },

    async submitReport(input) {
      await latency(latencyMs)
      const report: SchoolReport = {
        id: crypto.randomUUID(),
        kind: input.kind,
        schoolId: input.schoolId ?? null,
        schoolName: input.schoolName,
        city: input.city,
        state: input.state,
        note: input.note,
        submitterEmail: input.submitterEmail,
        createdAt: new Date().toISOString(),
        status: "pending",
      }
      tables.reports.unshift(report)
      return report
    },

    async listReports() {
      await latency(latencyMs)
      return [...tables.reports]
    },

    async resolveReport(id, decision) {
      await latency(latencyMs)
      const index = tables.reports.findIndex((r) => r.id === id)
      if (index === -1) throw new Error(`Report ${id} not found`)
      const report = tables.reports[index]
      const school = report.schoolId ? tables.schools.findIndex((s) => s.id === report.schoolId) : -1
      if (school !== -1) {
        // new + approved → live; new + dismissed → hidden; closed + approved → closed.
        const listing = report.kind === "new" ? (decision === "approved" ? "open" : "closed") : report.kind === "closed" && decision === "approved" ? "closed" : null
        if (listing) tables.schools[school] = { ...tables.schools[school], listing }
      }
      tables.reports[index] = { ...report, status: decision }
      return tables.reports[index]
    },

    async sendContactMessage(schoolId, message) {
      await latency(latencyMs)
      if (!tables.schools.some((s) => s.id === schoolId)) throw new Error(`School ${schoolId} not found`)
      tables.messages.unshift({ id: crypto.randomUUID(), schoolId, ...message, at: new Date().toISOString() })
      tables.messages.length = Math.min(tables.messages.length, 200)
    },

    async setGeo(id, geo) {
      await latency(latencyMs)
      const index = tables.schools.findIndex((s) => s.id === id)
      if (index === -1) throw new Error(`School ${id} not found`)
      const school = tables.schools[index]
      tables.schools[index] = { ...school, address: { ...school.address, geo } }
      return tables.schools[index]
    },

    async requestUpdate(ids) {
      await latency(latencyMs)
      return { sent: ids.filter((id) => tables.schools.some((s) => s.id === id)).length }
    },
  }
}
