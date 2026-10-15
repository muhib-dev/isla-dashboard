"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  MailIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { FreshnessDot, MembershipStatusDot } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requestProfileUpdates } from "@/features/schools/actions";
import { gradeSpan, studentsLabel } from "@/features/schools/lib";
import {
  REGION_LABELS,
  type EnrollmentBand,
  type Freshness,
  type SchoolSummary,
} from "@/features/schools/schema";
import { fmt } from "@/lib/format";
import { SchoolTile } from "./school-tile";

/** Band fields come from search docs; plain summaries fall back to the exact count. */
type Row = SchoolSummary & {
  freshness: Freshness;
  enrollmentExact?: number | null;
  enrollmentBand?: EnrollmentBand | null;
};

const PAGE_SIZES = [25, 50, 100];

export function SchoolsTable({
  rows,
  total,
  pageKey,
}: {
  rows: Row[];
  /** Size of the whole directory, for "filtered from N". */
  total?: number;
  /** Changes whenever the search changes, so paging restarts at page 1. */
  pageKey?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(0);
  const [lastKey, setLastKey] = useState(pageKey);
  if (pageKey !== lastKey) {
    setLastKey(pageKey);
    setPage(0);
  }
  const visibleSelected = rows.filter((r) => selected.has(r.id));
  const allChecked = rows.length > 0 && visibleSelected.length === rows.length;

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const start = current * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  /** `all` keeps the old bulk behaviour: a successful send clears the whole selection. */
  function sendRequests(ids: string[], all = false) {
    startTransition(async () => {
      const result = await requestProfileUpdates(ids);
      if (result.ok) {
        toast.success(
          `Update request sent to ${result.sent} ${result.sent === 1 ? "school" : "schools"}`,
        );
        setSelected((prev) => {
          if (all) return new Set();
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
      } else toast.error(result.error);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-[15px] text-muted-foreground">
        No schools match these filters.
      </div>
    );
  }

  return (
    <div>
      {visibleSelected.length > 0 && (
        <div className="flex min-h-12 flex-wrap items-center gap-3 border-b bg-info-subtle px-4 py-2 text-[15px]">
          <span className="tabular font-medium">
            {visibleSelected.length} selected
          </span>
          <Button
            size="sm"
            onClick={() =>
              sendRequests(
                visibleSelected.map((r) => r.id),
                true,
              )
            }
            disabled={pending}
          >
            <MailIcon />
            {pending ? "Sending…" : "Ask to review profile"}
          </Button>
          <Button
            variant="link"
            size="sm"
            className="ml-auto px-0"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 pl-4">
              <Checkbox
                checked={
                  allChecked
                    ? true
                    : visibleSelected.length
                      ? "indeterminate"
                      : false
                }
                onCheckedChange={(checked) =>
                  setSelected(
                    checked ? new Set(rows.map((r) => r.id)) : new Set(),
                  )
                }
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>School</TableHead>
            <TableHead className="hidden md:table-cell">Region</TableHead>
            <TableHead className="hidden xl:table-cell">Grades</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="hidden text-right lg:table-cell">
              Students
            </TableHead>
            <TableHead>Profile</TableHead>
            <TableHead className="w-12 pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((row) => (
            <TableRow
              key={row.id}
              data-state={selected.has(row.id) ? "selected" : undefined}
              className="cursor-pointer"
              onClick={() => router.push(`/schools/${row.id}`)}
            >
              <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selected.has(row.id)}
                  onCheckedChange={(checked) =>
                    toggle(row.id, checked === true)
                  }
                  aria-label={`Select ${row.name}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <SchoolTile name={row.name} size="sm" />
                  <div className="min-w-0">
                    <Link
                      href={`/schools/${row.id}`}
                      className="block truncate font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.name}
                    </Link>
                    <p className="text-[13px] text-muted-foreground">
                      {row.city}, {row.state}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {REGION_LABELS[row.region]}
              </TableCell>
              <TableCell className="hidden text-muted-foreground xl:table-cell">
                {gradeSpan(row.gradesFrom, row.gradesTo)}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <MembershipStatusDot status={row.membership.status} />
              </TableCell>
              <TableCell className="tabular hidden text-right lg:table-cell">
                {row.enrollmentBand !== undefined
                  ? studentsLabel(
                      row.enrollmentExact ?? null,
                      row.enrollmentBand,
                    )
                  : fmt.number(row.enrollment)}
              </TableCell>
              <TableCell>
                <FreshnessDot freshness={row.freshness} />
              </TableCell>
              {/* Menu items render in a portal but still bubble here in React, so stop row navigation. */}
              <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Actions for ${row.name}`}
                    >
                      <MoreHorizontalIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem asChild>
                      <Link href={`/schools/${row.id}`}>
                        <ExternalLinkIcon /> Open profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={pending}
                      onSelect={() => sendRequests([row.id])}
                    >
                      <MailIcon /> Ask to review profile
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-[13px] text-muted-foreground">
        <p className="tabular" aria-live="polite">
          Showing {fmt.number(start + 1)}–
          {fmt.number(start + pageRows.length)} of {fmt.number(rows.length)}
          {total !== undefined && total !== rows.length && (
            <> · filtered from {fmt.number(total)}</>
          )}
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(0);
              }}
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
            Page {current + 1} of {pageCount}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous page"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next page"
              disabled={current >= pageCount - 1}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
