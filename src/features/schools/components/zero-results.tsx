"use client";

import { SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Chip } from "@/features/schools/search";

export function ZeroResults({
  fixes,
  suggestion,
  notes,
  onApply,
  onSuggest,
  onClear,
}: {
  fixes: { chip: Chip; count: number }[];
  suggestion: string | null;
  notes: string[];
  onApply: (chip: Chip) => void;
  onSuggest: (q: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-lg border bg-surface-2 text-muted-foreground">
        <SearchXIcon className="size-7" strokeWidth={1.5} aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="font-semibold">No schools match.</p>
        {notes.length > 0 ? (
          notes.map((n) => (
            <p key={n} className="text-[15px] text-muted-foreground">
              {n}
            </p>
          ))
        ) : (
          <p className="text-[15px] text-muted-foreground">
            Try fewer words or remove a filter.
          </p>
        )}
      </div>
      {suggestion && (
        <p className="text-[15px]">
          Did you mean{" "}
          <button
            type="button"
            className="font-medium text-link underline-offset-3 hover:underline"
            onClick={() => onSuggest(suggestion)}
          >
            {suggestion}
          </button>
          ?
        </p>
      )}
      {fixes.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {fixes.slice(0, 4).map(({ chip, count }) => (
            <Button
              key={chip.id}
              variant="outline"
              size="sm"
              onClick={() => onApply(chip)}
            >
              Remove “{chip.label}” → {count}{" "}
              {count === 1 ? "school" : "schools"}
            </Button>
          ))}
        </div>
      )}
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear all
      </Button>
    </div>
  );
}
