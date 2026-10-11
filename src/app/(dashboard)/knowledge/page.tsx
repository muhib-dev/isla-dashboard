import type { Metadata } from "next"
import { PageBody, PageHeader } from "@/components/layout/page-header"
import { ChatPanel } from "@/features/knowledge/components/chat-panel"

export const metadata: Metadata = { title: "Knowledge" }

export default function KnowledgePage() {
  return (
    <PageBody>
      <PageHeader
        title="Knowledge"
        description="An assistant that draws on ISLA's research reports, toolkits and the school database. The prototype uses scripted answers."
      />
      <ChatPanel />
    </PageBody>
  )
}
