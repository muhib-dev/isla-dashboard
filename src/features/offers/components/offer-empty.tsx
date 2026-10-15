import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Empty state: 56px icon tile, title, one-line hint, optional outline action. */
export function OfferEmpty({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-lg border bg-card px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-lg border bg-surface-2 text-muted-foreground">
        <Icon className="size-7" strokeWidth={1.5} aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {hint && (
          <p className="max-w-md text-[15px] text-pretty text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
