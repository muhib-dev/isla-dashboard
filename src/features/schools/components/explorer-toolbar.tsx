"use client";

import { PlusCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MembershipStatus } from "@/features/schools/schema";
import { cn } from "@/lib/utils";

const TABS: [MembershipStatus | null, string][] = [
  [null, "All"],
  ["active", "Active"],
  ["grace", "Grace period"],
  ["lapsed", "Lapsed"],
  ["non_member", "Not a member"],
];

/**
 * Underline tabs over the membership status filter. A single status selects its tab; several
 * (picked in the filter panel) leave no tab selected.
 */
export function StatusTabs({
  value,
  counts,
  onChange,
}: {
  value: MembershipStatus[];
  /** Counts with every other filter applied; `all` is the sum. */
  counts: Record<MembershipStatus | "all", number>;
  onChange: (next: MembershipStatus[]) => void;
}) {
  const current = value.length === 0 ? null : value.length === 1 ? value[0] : undefined;
  return (
    <div
      role="group"
      aria-label="Membership status"
      className="flex gap-6 overflow-x-auto border-b"
    >
      {TABS.map(([status, label]) => {
        const selected = current === status;
        return (
          <button
            key={label}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(status ? [status] : [])}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 py-2.5 text-[15px] font-medium whitespace-nowrap transition-colors -outline-offset-2 focus-visible:outline-2",
              selected
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            <span className="tabular rounded-sm bg-secondary px-1.5 text-[13px] text-muted-foreground">
              {counts[status ?? "all"].toLocaleString("en-US")}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Dashed toolbar filter button with a checkbox menu; the selection shows as a chip. */
export function FacetFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const chosen = options.filter((o) => selected.includes(o.value));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          <PlusCircleIcon />
          {label}
          {chosen.length > 0 && (
            <>
              <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
              <span className="rounded-sm bg-secondary px-1.5 text-[13px] font-medium">
                {chosen.length === 1
                  ? chosen[0].label
                  : `${chosen.length} selected`}
              </span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {options.map((o) => (
          <DropdownMenuCheckboxItem
            key={o.value}
            checked={selected.includes(o.value)}
            // Keep the menu open so several options can be ticked in a row.
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={(c) =>
              onChange(
                c === true
                  ? [...selected, o.value]
                  : selected.filter((v) => v !== o.value),
              )
            }
          >
            {o.label}
          </DropdownMenuCheckboxItem>
        ))}
        {selected.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onChange([])}>
              Clear {label.toLowerCase()}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
