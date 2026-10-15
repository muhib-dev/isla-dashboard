"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SchoolComparison } from "@/features/analytics/schema";
import { formatMetric } from "@/lib/format";
import { cn } from "@/lib/utils";
import { benchmarkRows } from "./benchmark-detail";
import { RANGE_OPTIONS, type RangeYears } from "./range";

/** Segmented control for how many school years the trend charts show. */
export function RangeControl({ value }: { value: RangeYears }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(years: RangeYears) {
    const search = new URLSearchParams(params);
    if (years === 5) search.delete("years");
    else search.set("years", String(years));
    const qs = search.toString();
    startTransition(() =>
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Trend range"
      data-pending={pending || undefined}
      className="inline-flex h-10 items-center gap-0.5 rounded-lg border bg-muted p-[3px] text-[15px] font-medium data-pending:opacity-70"
    >
      {RANGE_OPTIONS.map((years) => {
        const active = years === value;
        return (
          <button
            key={years}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => !active && select(years)}
            className={cn(
              "h-full rounded-md border px-3.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active
                ? "border-border bg-card text-foreground shadow-xs"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {years} years
          </button>
        );
      })}
    </div>
  );
}

const csvCell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Downloads the benchmark table (every metric vs. peers) as CSV. */
export function ExportBenchmarks({
  comparison,
  schoolName,
}: {
  comparison: SchoolComparison;
  schoolName: string;
}) {
  function download() {
    const lines = [
      ["Metric", schoolName, "Peer median", "Percentile among peers"],
      ...benchmarkRows(comparison).map((r) => [
        r.label,
        formatMetric(r.school, r.format),
        formatMetric(r.median, r.format),
        String(Math.round(r.percentile * 100)),
      ]),
    ];
    const csv = lines.map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schoolName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-benchmarks.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" onClick={download}>
      <DownloadIcon /> Export
    </Button>
  );
}
