import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export function Field({
  id,
  label,
  hint,
  error,
  className,
  children,
}: {
  id: string
  label: React.ReactNode
  hint?: React.ReactNode
  error?: string[]
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("grid gap-1.5", className)} data-invalid={Boolean(error?.length) || undefined}>
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      {children}
      {error?.length ? (
        <p className="text-xs text-destructive">{error[0]}</p>
      ) : hint ? (
        <p className="text-sm text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

/** Label + description on the left, control on the right. For on/off settings. */
export function ToggleRow({
  id,
  label,
  description,
  children,
}: {
  id: string
  label: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3">
      <div className="grid gap-0.5">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}
