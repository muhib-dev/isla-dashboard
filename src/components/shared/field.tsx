import { CircleAlertIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function Field({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  id: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string[];
  /** Shows the red asterisk. Validation stays server-side. */
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("grid gap-1.5", className)}
      data-invalid={Boolean(error?.length) || undefined}
    >
      <Label htmlFor={id} className="text-[15px] font-medium">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {error?.length ? (
        <p className="flex items-center gap-1.5 text-caption font-medium text-destructive">
          <CircleAlertIcon className="size-3.5 shrink-0" aria-hidden />
          {error[0]}
        </p>
      ) : hint ? (
        <p className="text-caption text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

/** Label + description on the left, control on the right. For on/off settings. */
export function ToggleRow({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="grid gap-0.5">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
