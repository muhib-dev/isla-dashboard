import { z } from "zod"

export const KnowledgeSourceSchema = z.object({
  title: z.string(),
  kind: z.enum(["research", "toolkit", "data", "webinar"]),
  url: z.url().nullable(),
})
export type KnowledgeSource = z.infer<typeof KnowledgeSourceSchema>

export const KnowledgeAnswerSchema = z.object({
  answer: z.string(),
  sources: z.array(KnowledgeSourceSchema),
})
export type KnowledgeAnswer = z.infer<typeof KnowledgeAnswerSchema>

export const KnowledgeQuestionSchema = z.object({
  question: z.string().trim().min(3).max(500),
  schoolId: z.string().nullable(),
})
export type KnowledgeQuestion = z.infer<typeof KnowledgeQuestionSchema>
