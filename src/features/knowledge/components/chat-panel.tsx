"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUpIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askKnowledge } from "@/features/knowledge/actions";
import type { KnowledgeSource } from "@/features/knowledge/schema";

type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; text: string; sources: KnowledgeSource[] };

const SUGGESTIONS = [
  "What do schools in my region pay teachers?",
  "How common are lunch programs near us?",
  "What should our emergency plan include?",
  "How do we onboard new teachers?",
];

const KIND_LABEL: Record<KnowledgeSource["kind"], string> = {
  research: "Research",
  toolkit: "Toolkit",
  data: "School data",
  webinar: "Webinar",
};

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  function ask(question: string) {
    const text = question.trim();
    if (!text || pending) return;
    setDraft("");
    setMessages((m) => [...m, { id: nextId.current++, role: "user", text }]);
    startTransition(async () => {
      try {
        const answer = await askKnowledge(text);
        setMessages((m) => [
          ...m,
          {
            id: nextId.current++,
            role: "assistant",
            text: answer.answer,
            sources: answer.sources,
          },
        ]);
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: nextId.current++,
            role: "assistant",
            text: "Something went wrong. Please try again.",
            sources: [],
          },
        ]);
      }
    });
  }

  return (
    <div className="flex min-h-[calc(100svh-14rem)] flex-col rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center py-10 text-center">
            <p className="font-medium">
              Ask about ISLA research, toolkits and school data
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Answers cite the sources they draw on.
            </p>
            <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <p className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground">
                  {message.text}
                </p>
              </div>
            ) : (
              <div key={message.id} className="max-w-[85%] space-y-3">
                <p className="text-sm leading-relaxed">{message.text}</p>
                {message.sources.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {message.sources.map((source) => (
                      <li key={source.title}>
                        <a
                          href={source.url ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted"
                        >
                          <FileTextIcon className="size-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {KIND_LABEL[source.kind]}
                          </span>
                          <span>{source.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          )
        )}
        {pending && (
          <div className="flex gap-1" aria-label="Thinking">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
        className="border-t p-3"
      >
        <div className="relative">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(draft);
              }
            }}
            placeholder="Ask a question…"
            rows={1}
            className="max-h-40 min-h-11 resize-none pr-12"
            aria-label="Your question"
          />
          <Button
            type="submit"
            size="icon-sm"
            disabled={!draft.trim() || pending}
            className="absolute right-2 bottom-2"
            aria-label="Send"
          >
            <ArrowUpIcon />
          </Button>
        </div>
      </form>
    </div>
  );
}
