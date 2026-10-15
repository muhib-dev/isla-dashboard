import type { OrgBillingSummary } from "@/features/billing/schema";
import { fmt } from "@/lib/format";

const SOURCES = {
  membership: { label: "Membership dues", color: "var(--chart-1)" },
  store: { label: "Store", color: "var(--chart-2)" },
  event: { label: "Events", color: "var(--chart-3)" },
} as const;

const R = 62;
const STROKE = 20;
const C = 2 * Math.PI * R;
/** Gap between segments, in px along the ring. */
const GAP = 3;

/** Donut of paid revenue by kind, with the total in the middle and a legend table. */
export function RevenueBySource({
  byKind,
  since,
}: {
  byKind: OrgBillingSummary["byKind"];
  since: string;
}) {
  const total = byKind.reduce((n, k) => n + k.amount, 0);
  const parts = [...byKind]
    .sort((a, b) => b.amount - a.amount)
    .map((k) => ({ ...k, ...SOURCES[k.kind], share: total ? k.amount / total : 0 }));
  const shown = parts.filter((p) => p.amount > 0);

  const arcs = shown.map((p, i) => {
    // Ring length used by the segments before this one.
    const before = shown.slice(0, i).reduce((n, q) => n + q.share * C, 0);
    const length = p.share * C;
    return {
      ...p,
      dash: `${Math.max(0, length - (shown.length > 1 ? GAP : 0))} ${C}`,
      offset: -before,
    };
  });

  const top = parts[0];

  return (
    <section className="self-start rounded-lg border bg-card">
      <header className="border-b px-6 py-4">
        <h2 className="text-h3 font-semibold">Revenue by source</h2>
        <p className="text-[15px] text-muted-foreground">Paid since {since}</p>
      </header>

      <div className="flex flex-col items-center gap-5 px-6 py-5">
        <div className="relative size-44">
          <svg
            viewBox="0 0 160 160"
            className="size-full -rotate-90"
            role="img"
            aria-label={parts
              .map((p) => `${p.label} ${fmt.percent(p.share)}`)
              .join(", ")}
          >
            <circle
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={STROKE}
            />
            {arcs.map((a) => (
              <circle
                key={a.kind}
                cx="80"
                cy="80"
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={STROKE}
                strokeDasharray={a.dash}
                strokeDashoffset={a.offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="tabular text-h2 font-semibold tracking-[-0.01em]">
              {fmt.compactCurrency(total)}
            </span>
            <span className="text-[13px] text-muted-foreground">collected</span>
          </div>
        </div>

        <ul className="w-full divide-y">
          {parts.map((p) => (
            <li
              key={p.kind}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span
                className="size-2.5 rounded-[2px]"
                style={{ background: p.color }}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium">
                  {p.label}
                </span>
                {p.count !== undefined && (
                  <span className="tabular block text-[13px] text-muted-foreground">
                    {p.count} paid {p.count === 1 ? "invoice" : "invoices"}
                  </span>
                )}
              </span>
              <span className="text-right">
                <span className="tabular block text-[15px] font-medium">
                  {fmt.currency(p.amount)}
                </span>
                <span className="tabular block text-[13px] text-muted-foreground">
                  {fmt.percent(p.share)}
                </span>
              </span>
            </li>
          ))}
        </ul>

        {top && total > 0 && (
          <p className="w-full rounded-md bg-surface-2 px-3 py-2 text-[13px] text-muted-foreground">
            Largest source:{" "}
            <span className="font-medium text-foreground">{top.label}</span> ·{" "}
            {fmt.percent(top.share)} of revenue
            {top.count
              ? ` · avg ${fmt.currency(top.amount / top.count)} per invoice`
              : ""}
          </p>
        )}
      </div>
    </section>
  );
}
