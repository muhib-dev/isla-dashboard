"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  BookOpenTextIcon,
  CheckIcon,
  CopyIcon,
  DatabaseIcon,
  GraduationCapIcon,
  RotateCcwIcon,
  ShieldAlertIcon,
  SparklesIcon,
  SquarePenIcon,
  UsersIcon,
  UtensilsIcon,
  VideoIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { askKnowledge } from "@/features/knowledge/actions";
import type { KnowledgeSource } from "@/features/knowledge/schema";
import { cn } from "@/lib/utils";

type Message =
  | { id: number; role: "user"; text: string }
  | {
      id: number;
      role: "assistant";
      text: string;
      sources: KnowledgeSource[];
      question: string;
      failed?: boolean;
    };

const MAX_LENGTH = 500;

const SUGGESTIONS: { icon: LucideIcon; topic: string; question: string }[] = [
  { icon: WalletIcon, topic: "Compensation", question: "What do schools in my region pay teachers?" },
  { icon: UtensilsIcon, topic: "Operations", question: "How common are lunch programs near us?" },
  { icon: ShieldAlertIcon, topic: "Safety", question: "What should our emergency plan include?" },
  { icon: UsersIcon, topic: "HR", question: "How do we onboard new teachers?" },
];

const KIND_META: Record<KnowledgeSource["kind"], { label: string; icon: LucideIcon }> = {
  research: { label: "Research", icon: GraduationCapIcon },
  toolkit: { label: "Toolkit", icon: BookOpenTextIcon },
  data: { label: "School data", icon: DatabaseIcon },
  webinar: { label: "Webinar", icon: VideoIcon },
};

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const [atBottom, setAtBottom] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(0);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, pending]);

  function send(question: string, { echo = true } = {}) {
    const text = question.trim();
    if (text.length < 3 || pending) return;
    setDraft("");
    if (echo) setMessages((m) => [...m, { id: nextId.current++, role: "user", text }]);
    inputRef.current?.focus();
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
            question: text,
          },
        ]);
      } catch {
        setMessages((m) => [
          ...m,
          {
            id: nextId.current++,
            role: "assistant",
            text: "Something went wrong while searching. Please try again.",
            sources: [],
            question: text,
            failed: true,
          },
        ]);
      }
    });
  }

  function retry(message: Extract<Message, { role: "assistant" }>) {
    setMessages((m) => m.filter((x) => x.id !== message.id));
    send(message.question, { echo: false });
  }

  function reset() {
    setMessages([]);
    setDraft("");
    inputRef.current?.focus();
  }

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;
  const tooShort = draft.trim().length > 0 && draft.trim().length < 3;
  const nearLimit = draft.length > MAX_LENGTH * 0.8;

  return (
    <section
      aria-label="Knowledge assistant"
      className="flex h-[calc(100svh-15rem)] min-h-128 flex-col overflow-hidden rounded-xl border bg-card shadow-xs"
    >
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <AssistantAvatar />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">ISLA Assistant</p>
              <Badge variant="info">Prototype</Badge>
            </div>
            <p className="truncate text-caption text-muted-foreground">
              Research · Toolkits · School database
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} disabled={pending}>
            <SquarePenIcon aria-hidden />
            New chat
          </Button>
        )}
      </header>

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 48);
          }}
          className="h-full overflow-y-auto"
        >
          {messages.length === 0 ? (
            <EmptyState onPick={(q) => send(q)} />
          ) : (
            <div
              role="log"
              aria-live="polite"
              className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 md:px-6"
            >
              {messages.map((message) =>
                message.role === "user" ? (
                  <UserMessage key={message.id} text={message.text} />
                ) : (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    isLast={message.id === lastAssistantId && !pending}
                    onRetry={() => retry(message)}
                  />
                ),
              )}
              {pending && <ThinkingMessage />}
            </div>
          )}
        </div>

        {!atBottom && messages.length > 0 && (
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => scrollToBottom()}
            aria-label="Scroll to latest message"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full shadow-md"
          >
            <ArrowDownIcon />
          </Button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="border-t bg-surface-1 px-4 pt-3 pb-2 md:px-6"
      >
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-input bg-card shadow-xs transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
            <textarea
              ref={inputRef}
              value={draft}
              maxLength={MAX_LENGTH}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(draft);
                }
              }}
              placeholder={
                messages.length ? "Ask a follow-up…" : "Ask about salaries, programs, policies…"
              }
              rows={1}
              aria-label="Your question"
              className="field-sizing-content block max-h-40 min-h-12 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between gap-3 px-3 pb-2">
              <p className="text-caption text-muted-foreground">
                {tooShort ? (
                  "Type at least 3 characters"
                ) : (
                  <>
                    <Kbd>Enter</Kbd> to send · <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> for a new line
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                {nearLimit && (
                  <span
                    className={cn(
                      "text-caption tabular-nums text-muted-foreground",
                      draft.length >= MAX_LENGTH && "text-destructive",
                    )}
                  >
                    {draft.length}/{MAX_LENGTH}
                  </span>
                )}
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={draft.trim().length < 3 || pending}
                  className="rounded-full"
                  aria-label="Send"
                >
                  <ArrowUpIcon />
                </Button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-caption text-muted-foreground">
            Answers can be incomplete. Check the cited sources before acting on them.
          </p>
        </div>
      </form>
    </section>
  );
}

function AssistantAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground",
        className,
      )}
    >
      <SparklesIcon className="size-4" />
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-sm border bg-surface-2 px-1 py-px font-sans text-[11px] font-medium">
      {children}
    </kbd>
  );
}

function EmptyState({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-10 md:px-6">
      <AssistantAvatar className="size-11 rounded-xl [&_svg]:size-5" />
      <h2 className="mt-5 text-h3 font-semibold tracking-[-0.01em]">
        How can I help your school today?
      </h2>
      <p className="mt-1.5 max-w-lg text-[15px] text-pretty text-muted-foreground">
        I draw on ISLA&apos;s research reports, toolkits and the school database, and cite every
        source I use.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map(({ icon: Icon, topic, question }) => (
          <button
            key={question}
            type="button"
            onClick={() => onPick(question)}
            className="group flex items-start gap-3 rounded-lg border bg-card p-3.5 text-left transition-all outline-none hover:border-brand-300 hover:bg-surface-1 hover:shadow-xs focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-caption font-medium text-muted-foreground">
                {topic}
              </span>
              <span className="mt-0.5 block text-sm leading-snug">{question}</span>
            </span>
            <ArrowUpRightIcon
              className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              aria-hidden
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap text-brand-foreground">
        {text}
      </p>
    </div>
  );
}

function AssistantMessage({
  message,
  isLast,
  onRetry,
}: {
  message: Extract<Message, { role: "assistant" }>;
  isLast: boolean;
  onRetry: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure context, permissions); nothing to do.
    }
  }

  return (
    <article className="flex gap-3 animate-in fade-in-0 slide-in-from-bottom-1 duration-300">
      <AssistantAvatar className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-4">
        {message.failed ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive-subtle px-3.5 py-2.5 text-sm text-destructive">
            <span>{message.text}</span>
            <Button variant="outline" size="xs" onClick={onRetry}>
              <RotateCcwIcon aria-hidden />
              Retry
            </Button>
          </div>
        ) : (
          <p className="text-[15px] leading-7 text-pretty">{message.text}</p>
        )}

        {message.sources.length > 0 && (
          <div className="space-y-2">
            <p className="text-overline font-semibold tracking-wide text-muted-foreground uppercase">
              Sources
            </p>
            <ol className="grid gap-2 sm:grid-cols-2">
              {message.sources.map((source, i) => {
                const { label, icon: Icon } = KIND_META[source.kind];
                const body = (
                  <>
                    <span className="grid size-6 shrink-0 place-items-center rounded-sm bg-surface-2 text-caption font-semibold tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm leading-snug font-medium">
                        {source.title}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-caption text-muted-foreground">
                        <Icon className="size-3.5" aria-hidden />
                        {label}
                      </span>
                    </span>
                    {source.url && (
                      <ArrowUpRightIcon
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-px group-hover:-translate-y-px"
                        aria-hidden
                      />
                    )}
                  </>
                );
                const cls =
                  "group flex h-full items-start gap-2.5 rounded-lg border bg-card p-2.5 text-left transition-colors";
                return (
                  <li key={source.title}>
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className={cn(
                          cls,
                          "outline-none hover:border-brand-300 hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-ring",
                        )}
                      >
                        {body}
                      </a>
                    ) : (
                      <div className={cls}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {!message.failed && (
          <div className="-ml-2 flex items-center gap-0.5 text-muted-foreground">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={copy}
              aria-label={copied ? "Copied" : "Copy answer"}
              title={copied ? "Copied" : "Copy"}
            >
              {copied ? <CheckIcon className="text-success" /> : <CopyIcon />}
            </Button>
            {isLast && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={onRetry}
                aria-label="Regenerate answer"
                title="Regenerate"
              >
                <RotateCcwIcon />
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function ThinkingMessage() {
  return (
    <div className="flex gap-3" role="status">
      <AssistantAvatar className="mt-0.5 animate-pulse" />
      <div className="flex-1 space-y-3 pt-1.5">
        <p className="text-sm text-muted-foreground">
          Searching research, toolkits and school data…
        </p>
        <div className="space-y-2" aria-hidden>
          <div className="h-3 w-11/12 animate-pulse rounded-full bg-surface-2" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-surface-2 [animation-delay:150ms]" />
          <div className="h-3 w-3/5 animate-pulse rounded-full bg-surface-2 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
