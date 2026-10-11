"use server"

import { repos } from "@/server/repositories"
import { getSession } from "@/server/session"
import { KnowledgeQuestionSchema, type KnowledgeAnswer } from "./schema"

export async function askKnowledge(question: string): Promise<KnowledgeAnswer> {
  const session = await getSession()
  const input = KnowledgeQuestionSchema.parse({ question, schoolId: session.schoolId })
  return repos.knowledge.ask(input)
}
