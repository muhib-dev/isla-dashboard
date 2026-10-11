import "server-only"
import { median } from "@/features/analytics/lib"
import type { KnowledgeAnswer, KnowledgeSource } from "@/features/knowledge/schema"
import { REGION_LABELS } from "@/features/schools/schema"
import type { KnowledgeRepository } from "@/server/repositories/types"
import { fmt } from "@/lib/format"
import { latency, tables } from "./store"

const SOURCES = {
  compensation: { title: "Teacher Compensation & Retention Report (ISLA × ISPU)", kind: "research", url: "https://theisla.org/" },
  profileSurvey: { title: "Islamic School Profile Survey", kind: "data", url: "https://theisla.org/" },
  operations: { title: "School Operations, Safety & Readiness Toolkit", kind: "toolkit", url: "https://theisla.org/shop/" },
  governance: { title: "Board Governance & Leadership Toolkit", kind: "toolkit", url: "https://theisla.org/shop/" },
  hr: { title: "Employee & HR Essentials Toolkit", kind: "toolkit", url: "https://theisla.org/shop/" },
  crisis: { title: "Crisis Toolkit", kind: "toolkit", url: "https://theisla.org/" },
  palestine: { title: "Teaching Palestine Toolkit", kind: "toolkit", url: "https://theisla.org/" },
  abuse: { title: "Sexual Abuse Prevention Toolkit", kind: "toolkit", url: "https://theisla.org/" },
} satisfies Record<string, KnowledgeSource>

type Rule = { match: RegExp; answer: (schoolId: string | null) => KnowledgeAnswer }

function regionOf(schoolId: string | null) {
  return tables.schools.find((s) => s.id === schoolId)?.region ?? null
}

/**
 * Scripted stand-in for the retrieval-augmented assistant. The real
 * implementation sends the question to POST /knowledge/ask, which searches
 * ISLA research, toolkits and the school database and cites what it used.
 */
const RULES: Rule[] = [
  {
    match: /salar|pay|compensat|wage/i,
    answer: (schoolId) => {
      const region = regionOf(schoolId)
      const peers = tables.schools.filter((s) => !region || s.region === region)
      const value = median(peers.map((s) => s.metrics.avgTeacherSalary))
      const where = region ? `the ${REGION_LABELS[region]}` : "the ISLA network"
      return {
        answer: `Across ${peers.length} schools in ${where}, the median average teacher salary is ${fmt.currency(value)}. Schools at or above the median report noticeably better teacher retention. The ISLA × ISPU compensation report recommends publishing a salary scale and reviewing it every year.`,
        sources: [SOURCES.compensation, SOURCES.profileSurvey],
      }
    },
  },
  {
    match: /lunch|meal|food|cafeteria/i,
    answer: (schoolId) => {
      const region = regionOf(schoolId)
      const peers = tables.schools.filter((s) => !region || s.region === region)
      const share = peers.filter((s) => s.programs.lunch.offered).length / Math.max(peers.length, 1)
      return {
        answer: `${fmt.percent(share)} of schools in ${region ? `the ${REGION_LABELS[region]}` : "the network"} run a lunch program. Most use a local halal caterer rather than an in-house kitchen. The operations toolkit includes a vendor checklist and an allergy-management template.`,
        sources: [SOURCES.profileSurvey, SOURCES.operations],
      }
    },
  },
  {
    match: /board|governance|bylaw/i,
    answer: () => ({
      answer: "Start with a board calendar and a short annual self-evaluation. The governance toolkit includes sample bylaws, a conflict-of-interest policy and an agenda template that separates strategy from operations.",
      sources: [SOURCES.governance],
    }),
  },
  {
    match: /crisis|emergency|safety|drill|lockdown/i,
    answer: () => ({
      answer: "Every school should have a written emergency plan, a communication tree and a drill schedule reviewed each semester. ISLA's Crisis Toolkit covers communication with families and the media. The operations toolkit covers drills and facilities.",
      sources: [SOURCES.crisis, SOURCES.operations],
    }),
  },
  {
    match: /hire|hiring|recruit|onboard|handbook|hr\b|contract/i,
    answer: () => ({
      answer: "For hiring, post on the ISLA Job Portal and share the post on the educators listserv. The HR toolkit includes an employee handbook, offer-letter and contract templates, and a 30-60-90 day onboarding plan.",
      sources: [SOURCES.hr],
    }),
  },
  {
    match: /palestin/i,
    answer: () => ({
      answer: "ISLA's Teaching Palestine toolkit offers grade-banded lesson plans, a reading list and guidance for talking with families.",
      sources: [SOURCES.palestine],
    }),
  },
  {
    match: /abuse|child protect|safeguard/i,
    answer: () => ({
      answer: "The Sexual Abuse Prevention toolkit covers staff training, reporting procedures and policy language. ISLA recommends annual training for every adult who works with students.",
      sources: [SOURCES.abuse],
    }),
  },
]

export function createMockKnowledgeRepository(latencyMs: number): KnowledgeRepository {
  return {
    async ask({ question, schoolId }) {
      await latency(latencyMs * 3)
      const rule = RULES.find((r) => r.match.test(question))
      if (rule) return rule.answer(schoolId)
      return {
        answer: "I can answer questions using ISLA research, toolkits and school data. Try asking about teacher pay, lunch programs, board governance, hiring or emergency planning.",
        sources: [],
      }
    },
  }
}
