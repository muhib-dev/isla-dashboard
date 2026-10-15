"use client";

import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type FilterTab<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

/** Underline tabs that filter the table below (all rows stay in one table). */
export function UnderlineTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  controls,
}: {
  label: string;
  tabs: FilterTab<T>[];
  value: T;
  onChange: (value: T) => void;
  controls: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="-mb-px flex gap-6">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={controls}
            onClick={() => onChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-2 border-b-2 py-2.5 text-[15px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:text-foreground focus-visible:underline",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="tabular rounded-sm bg-secondary px-1.5 text-[13px] text-muted-foreground">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TableSearch({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="relative w-full sm:w-60">
      <SearchIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-9 pl-9"
      />
    </div>
  );
}

/** Card header row holding the tabs (left, sitting on the border) and search (right). */
export function TableCardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-b px-6 pt-3 sm:flex-row sm:items-end sm:justify-between sm:pt-0">
      {children}
    </div>
  );
}

export function TableEmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-6 py-10 text-center text-[15px] text-muted-foreground"
      >
        {children}
      </td>
    </tr>
  );
}
