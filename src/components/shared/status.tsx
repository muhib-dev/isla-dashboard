import type { InvoiceStatus } from "@/features/billing/schema";
import type { Freshness, MembershipStatus } from "@/features/schools/schema";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  neutral: "border-[1.5px] border-member-none",
  brand: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
};

/** Quiet status: colored dot + label. Avoids loud filled pills in dense tables. */
export function StatusDot({
  tone,
  children,
  className,
  dotClassName,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
  /** Overrides the tone's dot, e.g. membership colors. */
  dotClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[15px] whitespace-nowrap",
        className,
      )}
    >
      <span
        className={cn("size-2 shrink-0 rounded-full", dotClassName ?? TONE[tone])}
        aria-hidden
      />
      {children}
    </span>
  );
}

const MEMBERSHIP: Record<MembershipStatus, [Tone, string]> = {
  active: ["success", "Active"],
  grace: ["warning", "Grace period"],
  lapsed: ["danger", "Lapsed"],
  non_member: ["neutral", "Not a member"],
};

const MEMBER_DOT: Record<MembershipStatus, string> = {
  active: "bg-member-active",
  grace: "bg-member-grace",
  lapsed: "bg-member-lapsed",
  non_member: "border-[1.5px] border-member-none",
};

export function MembershipStatusDot({
  status,
  className,
}: {
  status: MembershipStatus;
  className?: string;
}) {
  const [tone, label] = MEMBERSHIP[status];
  return (
    <StatusDot tone={tone} dotClassName={MEMBER_DOT[status]} className={className}>
      {label}
    </StatusDot>
  );
}

const FRESHNESS: Record<Freshness, [Tone, string]> = {
  fresh: ["success", "Up to date"],
  aging: ["warning", "Review soon"],
  stale: ["danger", "Out of date"],
};

export function FreshnessDot({
  freshness,
  className,
}: {
  freshness: Freshness;
  className?: string;
}) {
  const [tone, label] = FRESHNESS[freshness];
  return (
    <StatusDot tone={tone} className={className}>
      {label}
    </StatusDot>
  );
}

const INVOICE: Record<InvoiceStatus, [Tone, string]> = {
  paid: ["success", "Paid"],
  open: ["warning", "Due"],
  overdue: ["danger", "Overdue"],
  refunded: ["neutral", "Refunded"],
};

export function InvoiceStatusDot({ status }: { status: InvoiceStatus }) {
  const [tone, label] = INVOICE[status];
  return <StatusDot tone={tone}>{label}</StatusDot>;
}
