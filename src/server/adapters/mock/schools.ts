import "server-only"
import { freshnessOf, toSummary } from "@/features/schools/lib"
import type { ProfileSection, School, SectionPatch } from "@/features/schools/schema"
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

    async requestUpdate(ids) {
      await latency(latencyMs)
      return { sent: ids.filter((id) => tables.schools.some((s) => s.id === id)).length }
    },
  }
}
