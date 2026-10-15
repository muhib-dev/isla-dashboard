import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-h1 font-semibold tracking-[-0.015em] text-balance">
          {title}
        </h1>
        {description && (
          <p className="max-w-3xl text-base text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 max-sm:w-full">{actions}</div>
      )}
    </div>
  );
}

export function PageBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("w-full space-y-6 px-4 py-6 md:px-6 xl:p-8", className)}
    >
      {children}
    </div>
  );
}
