"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmt } from "@/lib/format";

export const PAGE_SIZES = [10, 25, 50];

/**
 * Client-side paging over an in-memory list. Paging restarts at page 1 whenever
 * `resetKey` changes (pass the current search/filter state).
 */
export function usePagination<T>(items: T[], resetKey?: string) {
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(0);
  const [lastKey, setLastKey] = useState(resetKey);
  if (resetKey !== lastKey) {
    setLastKey(resetKey);
    setPage(0);
  }
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const start = current * pageSize;
  return {
    rows: items.slice(start, start + pageSize),
    page: current,
    pageCount,
    pageSize,
    start,
    total: items.length,
    setPage,
    setPageSize: (n: number) => {
      setPageSize(n);
      setPage(0);
    },
  };
}

/** Table footer: "Showing 1–10 of 42", rows-per-page select and prev/next. */
export function TablePagination({
  pager,
  unfiltered,
}: {
  pager: ReturnType<typeof usePagination>;
  /** Size of the list before filtering, for "filtered from N". */
  unfiltered?: number;
}) {
  const { page, pageCount, pageSize, start, total, rows } = pager;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[13px] text-muted-foreground">
      <p className="tabular" aria-live="polite">
        {total > 0 &&
          `Showing ${fmt.number(start + 1)}–${fmt.number(start + rows.length)} of `}
        {fmt.number(total)}
        {unfiltered !== undefined && unfiltered !== total && (
          <> · filtered from {fmt.number(unfiltered)}</>
        )}
      </p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Rows per page</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => pager.setPageSize(Number(v))}
          >
            <SelectTrigger size="sm" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="tabular">
          Page {page + 1} of {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Previous page"
            disabled={page === 0}
            onClick={() => pager.setPage(page - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Next page"
            disabled={page >= pageCount - 1}
            onClick={() => pager.setPage(page + 1)}
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
