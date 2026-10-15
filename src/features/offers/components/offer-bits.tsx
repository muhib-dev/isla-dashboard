import { StatusDot } from "@/components/shared/status";
import type { OfferPhase } from "@/features/offers/lib";
import type { Offer } from "@/features/offers/schema";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OfferPhaseDot({
  phase,
  daysLeft,
  startsOn,
}: {
  phase: OfferPhase;
  daysLeft: number;
  startsOn: string;
}) {
  switch (phase) {
    case "live":
      return <StatusDot tone="success">Live</StatusDot>;
    case "ending_soon":
      return (
        <StatusDot tone="warning">
          {daysLeft === 0
            ? "Ends today"
            : `Ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`}
        </StatusDot>
      );
    case "upcoming":
      return <StatusDot tone="brand">Opens {fmt.date(startsOn)}</StatusDot>;
    case "draft":
      return <StatusDot tone="neutral">Draft</StatusDot>;
    case "paused":
      return <StatusDot tone="neutral">Paused</StatusDot>;
    case "expired":
      return <StatusDot tone="neutral">Ended</StatusDot>;
  }
}

const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

/** "Oct 1 – Oct 31, 2026"; the year shows on both ends only when they differ. */
export function redeemWindow(offer: Pick<Offer, "startsOn" | "endsOn">) {
  const sameYear = offer.startsOn.slice(0, 4) === offer.endsOn.slice(0, 4);
  const start = sameYear
    ? monthDay.format(new Date(offer.startsOn))
    : fmt.date(offer.startsOn);
  return `${start} – ${fmt.date(offer.endsOn)}`;
}

/** Partner monogram. Logos aren't collected yet, so initials stand in. */
export function PartnerMark({
  initials,
  className,
}: {
  initials: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-semibold text-primary",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function ValueTag({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-md bg-primary/10 px-2 py-1 text-sm font-semibold whitespace-nowrap text-primary",
        className,
      )}
    >
      {label}
    </span>
  );
}
