import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  hint,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="tabular text-2xl font-semibold tracking-tight sm:text-3xl">{value}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Stats in one bordered surface, separated by hairlines (gap-px over the border color). */
export function StatGroup({
  children,
  columns = 4,
  className,
}: {
  children: React.ReactNode;
  columns?: 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10 *:bg-card *:p-5",
        columns === 4
          ? "grid-cols-2 lg:grid-cols-4"
          : "grid-cols-3 max-sm:*:px-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
