import { connection } from "next/server";
import Link from "next/link";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import { CardHeader } from "@/components/ui/card";
import type { RegionStats } from "@/features/analytics/schema";
import { REGION_LABELS, type MembershipStatus } from "@/features/schools/schema";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;

/** Request time. `connection()` opts out of prerendering, which Cache Components requires before reading the clock. */
export async function requestTime() {
  await connection();
  return Date.now();
}

/** "Good morning, Amina" — the hour comes from the server clock. */
export function greeting(firstName: string, now = new Date()) {
  const hour = now.getHours();
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return `Good ${part}, ${firstName}`;
}

const today = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

export function todayLabel(now = new Date()) {
  return today.format(now);
}

/** Whole days from an ISO date to now (positive = in the past). */
export function daysSince(iso: string, now = Date.now()) {
  return Math.floor((now - Date.parse(iso)) / DAY);
}

export function relativeDay(iso: string, now = Date.now()) {
  const days = daysSince(iso, now);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months < 12
    ? `${months} ${months === 1 ? "month" : "months"} ago`
    : `${Math.round(months / 12)}y ago`;
}

/** List-card header: title + optional muted subtitle, action on the right. */
export function ListCardHeader({
  title,
  description,
  action,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <CardHeader className="flex items-start justify-between gap-4 border-b px-6 py-4 [.border-b]:pb-4">
      <div className="min-w-0 space-y-0.5">
        <h2 className="text-h3 font-semibold">{title}</h2>
        {description && (
          <p className="text-[15px] text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </CardHeader>
  );
}

export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-[15px] font-medium text-link underline-offset-4 hover:underline",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export type QuickAction = {
  href: string;
  icon: LucideIcon;
  label: string;
  sub: string;
};

/** Stack of navigational rows: icon tile, label + hint, chevron. */
export function QuickActionList({ actions }: { actions: QuickAction[] }) {
  return (
    <ul className="space-y-2.5">
      {actions.map((action) => (
        <li key={action.href}>
          <Link
            href={action.href}
            className="group flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-2 text-primary">
              <action.icon className="size-[18px]" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">
                {action.label}
              </span>
              <span className="block truncate text-[13px] text-muted-foreground">
                {action.sub}
              </span>
            </span>
            <ChevronRightIcon
              className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

const ALERT_TONE = {
  danger:
    "border-[color-mix(in_oklch,var(--destructive)_25%,var(--border))] bg-destructive-subtle [&_svg]:text-destructive",
  warning:
    "border-[color-mix(in_oklch,var(--warning)_25%,var(--border))] bg-warning-subtle [&_svg]:text-warning",
} as const;

/** Banner: 20px icon, bold first sentence + muted second, optional action on the right. */
export function HomeAlert({
  tone,
  icon: Icon,
  title,
  children,
  action,
}: {
  tone: keyof typeof ALERT_TONE;
  icon: LucideIcon;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3",
        ALERT_TONE[tone],
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-[15px]">
        <span className="font-semibold">{title}</span>{" "}
        {children && <span className="text-muted-foreground">{children}</span>}
      </p>
      {action}
    </div>
  );
}

export const MEMBERSHIP_ORDER = [
  "active",
  "grace",
  "lapsed",
  "non_member",
] as const satisfies readonly MembershipStatus[];

export const MEMBERSHIP_LABELS: Record<MembershipStatus, string> = {
  active: "Active",
  grace: "Grace",
  lapsed: "Lapsed",
  non_member: "Not a member",
};

const MEMBER_FILL: Record<MembershipStatus, string> = {
  active: "bg-member-active",
  grace: "bg-member-grace",
  lapsed: "bg-member-lapsed",
  non_member: "bg-member-none",
};

const MEMBER_SWATCH: Record<MembershipStatus, string> = {
  ...MEMBER_FILL,
  non_member: "border-[1.5px] border-member-none",
};

export function MembershipLegend({
  statuses = MEMBERSHIP_ORDER,
}: {
  statuses?: readonly MembershipStatus[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-medium text-muted-foreground">
      {statuses.map((status) => (
        <li key={status} className="inline-flex items-center gap-1.5">
          <span
            className={cn("size-2.5 rounded-[2px]", MEMBER_SWATCH[status])}
            aria-hidden
          />
          {MEMBERSHIP_LABELS[status]}
        </li>
      ))}
    </ul>
  );
}

/** Stacked horizontal bar in member colors, 2px gaps, rounded ends. */
export function MembershipBar({
  counts,
  statuses = MEMBERSHIP_ORDER,
  label,
  className,
}: {
  counts: Partial<Record<MembershipStatus, number>>;
  statuses?: readonly MembershipStatus[];
  /** Accessible summary, e.g. "Northeast: 10 active, 2 grace". */
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "flex h-4 gap-[2px] overflow-hidden rounded-[3px]",
        className,
      )}
    >
      {statuses.map((status) =>
        counts[status] ? (
          <span
            key={status}
            className={MEMBER_FILL[status]}
            style={{ flexGrow: counts[status] }}
          />
        ) : null,
      )}
    </div>
  );
}

export function membershipSummary(
  counts: Partial<Record<MembershipStatus, number>>,
  statuses: readonly MembershipStatus[] = MEMBERSHIP_ORDER,
) {
  return statuses
    .map((s) => `${counts[s] ?? 0} ${MEMBERSHIP_LABELS[s].toLowerCase()}`)
    .join(", ");
}

/** Round icon chip for activity rows, tinted by meaning. */
export function ActivityIcon({
  icon: Icon,
  className,
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-surface-2",
        className,
      )}
    >
      <Icon className="size-4" aria-hidden />
    </span>
  );
}

/** Empty state: icon tile, title, one-line hint, optional action. */
export function HomeEmpty({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-lg border bg-surface-2 text-muted-foreground">
        <Icon className="size-7" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="mt-1 font-semibold">{title}</p>
      <p className="text-[15px] text-muted-foreground">{hint}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** One row per region: name, stacked membership bar sized by school count, total. */
export function RegionMembershipList({ regions }: { regions: RegionStats[] }) {
  const sorted = [...regions].sort((a, b) => b.schools - a.schools);
  const max = Math.max(1, ...regions.map((r) => r.schools));
  return (
    <ul className="space-y-3">
      {sorted.map((r) => (
        <li
          key={r.region}
          className="grid grid-cols-[minmax(0,130px)_1fr_auto] items-center gap-3 text-[15px]"
        >
          <span className="truncate">{REGION_LABELS[r.region]}</span>
          {/* Bar length is proportional to the region's school count. */}
          <span
            className="block min-w-1"
            style={{ width: `${(r.schools / max) * 100}%` }}
          >
            <MembershipBar
              counts={r.membership}
              label={`${REGION_LABELS[r.region]}: ${membershipSummary(r.membership)}`}
            />
          </span>
          <span className="tabular w-10 text-right font-medium">
            {r.schools}
          </span>
        </li>
      ))}
    </ul>
  );
}
