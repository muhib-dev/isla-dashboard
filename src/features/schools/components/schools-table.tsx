"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FreshnessDot, MembershipStatusDot } from "@/components/shared/status";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

/** Band fields come from search docs; plain summaries fall back to the exact count. */
type Row = SchoolSummary & {
  freshness: Freshness;
  enrollmentExact?: number | null;
  enrollmentBand?: EnrollmentBand | null;
};

export function SchoolsTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const visibleSelected = rows.filter((r) => selected.has(r.id));
  const allChecked = rows.length > 0 && visibleSelected.length === rows.length;

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function sendRequests() {
    startTransition(async () => {
      const result = await requestProfileUpdates(
        visibleSelected.map((r) => r.id),
      );
      if (result.ok) {
        toast.success(
          `Update request sent to ${result.sent} ${result.sent === 1 ? "school" : "schools"}`,
        );
        setSelected(new Set());
      } else toast.error(result.error);
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl py-16 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
        No schools match these filters.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex min-h-10 items-center justify-between gap-3 text-sm text-muted-foreground">
        <span className="tabular">
          {visibleSelected.length
            ? `${visibleSelected.length} selected`
            : `${rows.length} schools`}
        </span>
        {visibleSelected.length > 0 && (
          <Button onClick={sendRequests} disabled={pending}>
            {pending ? "Sending…" : "Ask to review profile"}
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
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
              <TableHead className="hidden text-right lg:table-cell">
                Students
              </TableHead>
              <TableHead className="hidden sm:table-cell">Membership</TableHead>
              <TableHead>Profile</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={selected.has(row.id) ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => router.push(`/schools/${row.id}`)}
              >
                <TableCell
                  className="pl-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={selected.has(row.id)}
                    onCheckedChange={(checked) =>
                      toggle(row.id, checked === true)
                    }
                    aria-label={`Select ${row.name}`}
                  />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/schools/${row.id}`}
                    className="font-medium hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {row.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {row.city}, {row.state} ·{" "}
                    {gradeSpan(row.gradesFrom, row.gradesTo)}
                  </p>
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {REGION_LABELS[row.region]}
                </TableCell>
                <TableCell className="tabular hidden text-right lg:table-cell">
                  {row.enrollmentBand !== undefined
                    ? studentsLabel(
                        row.enrollmentExact ?? null,
                        row.enrollmentBand,
                      )
                    : fmt.number(row.enrollment)}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <MembershipStatusDot status={row.membership.status} />
                </TableCell>
                <TableCell>
                  <FreshnessDot freshness={row.freshness} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
