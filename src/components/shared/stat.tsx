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
      <p className="text-[15px] font-medium text-muted-foreground">{label}</p>
      <p className="tabular text-2xl font-semibold tracking-[-0.015em] sm:text-h1">{value}</p>
      {hint && <p className="text-caption text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** KPI tiles: one bordered card per stat, on the 16px grid gutter. */
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
        "grid gap-4 *:rounded-lg *:border *:bg-card *:px-5 *:py-4",
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
