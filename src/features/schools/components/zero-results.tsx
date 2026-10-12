"use client"

import { Button } from "@/components/ui/button"
import type { Chip } from "@/features/schools/search"

export function ZeroResults({
  fixes,
  suggestion,
  notes,
  onApply,
  onSuggest,
  onClear,
}: {
  fixes: { chip: Chip; count: number }[]
  suggestion: string | null
  notes: string[]
  onApply: (chip: Chip) => void
  onSuggest: (q: string) => void
  onClear: () => void
}) {
  return (
    <div className="space-y-4 rounded-xl px-6 py-12 text-center ring-1 ring-foreground/10">
      <p className="font-medium">No schools match.</p>
      {notes.map((n) => <p key={n} className="text-sm text-muted-foreground">{n}</p>)}
      {suggestion && (
        <p className="text-sm">
          Did you mean{" "}
          <button type="button" className="font-medium underline underline-offset-2" onClick={() => onSuggest(suggestion)}>{suggestion}</button>?
        </p>
      )}
      {fixes.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {fixes.slice(0, 4).map(({ chip, count }) => (
            <Button key={chip.id} variant="outline" size="sm" onClick={() => onApply(chip)}>
              Remove “{chip.label}” → {count} {count === 1 ? "school" : "schools"}
            </Button>
          ))}
        </div>
      )}
      <Button variant="ghost" size="sm" onClick={onClear}>Clear all</Button>
    </div>
  )
}
