import { cn } from "@/lib/utils";

type Swatch = "line" | "dashed" | "square" | "ring" | "band";

export type LegendItem = {
  label: React.ReactNode;
  /** A token reference, e.g. `var(--chart-1)`. */
  color: string;
  swatch?: Swatch;
};

/** Inline chart legend: sits top-right in a card header, 13px 500 muted. */
export function ChartLegendInline({
  items,
  className,
}: {
  items: LegendItem[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption font-medium text-muted-foreground",
        className,
      )}
    >
      {items.map((item, i) => (
        <li key={i} className="inline-flex items-center gap-1.5">
          <LegendSwatch color={item.color} swatch={item.swatch ?? "square"} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function LegendSwatch({ color, swatch }: { color: string; swatch: Swatch }) {
  if (swatch === "line")
    return (
      <span
        className="h-0.5 w-4 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
    );
  if (swatch === "dashed")
    return (
      <svg width="16" height="2" className="shrink-0" aria-hidden>
        <line
          x1="0"
          y1="1"
          x2="16"
          y2="1"
          stroke={color}
          strokeWidth={1.75}
          strokeDasharray="5 4"
        />
      </svg>
    );
  if (swatch === "ring")
    return (
      <span
        className="size-2.5 shrink-0 rounded-[2px] border-[1.5px]"
        style={{ borderColor: color }}
        aria-hidden
      />
    );
  return (
    <span
      className="size-2.5 shrink-0 rounded-[2px]"
      style={{ background: color, opacity: swatch === "band" ? 0.25 : 1 }}
      aria-hidden
    />
  );
}
