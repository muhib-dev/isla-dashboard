"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckIcon, InboxIcon, XIcon } from "lucide-react";
import {
  TablePagination,
  usePagination,
} from "@/components/shared/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveReportAction } from "@/features/schools/submission-actions";
import {
  REPORT_KIND_LABELS,
  type SchoolReport,
} from "@/features/schools/submissions";

const HINT: Partial<Record<SchoolReport["kind"], string>> = {
  new: "Approve to publish this school on the map; dismiss to hide it.",
  closed: "Approve to mark the school closed.",
};

export function ReportsTable({ reports }: { reports: SchoolReport[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const pager = usePagination(reports);

  function resolve(id: string, decision: "approved" | "dismissed") {
    setBusy(id);
    start(async () => {
      const r = await resolveReportAction(id, decision);
      setBusy(null);
      if (r.ok)
        toast.success(decision === "approved" ? "Approved" : "Dismissed");
      else toast.error(r.error);
    });
  }

  if (!reports.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-lg border bg-surface-2 text-muted-foreground">
          <InboxIcon className="size-7" strokeWidth={1.5} aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="font-semibold">No reports yet.</p>
          <p className="text-[15px] text-muted-foreground">
            Schools added or reported on the public map show up here.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-4">Report</TableHead>
            <TableHead>School</TableHead>
            <TableHead className="hidden md:table-cell">Details</TableHead>
            <TableHead className="hidden sm:table-cell">Received</TableHead>
            <TableHead className="pr-4 text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pager.rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="pl-4 whitespace-normal font-medium">
                {REPORT_KIND_LABELS[r.kind]}
              </TableCell>
              <TableCell className="whitespace-normal">
                <p className="font-medium">
                  {r.schoolId ? (
                    <Link
                      href={`/schools/${r.schoolId}`}
                      className="hover:underline"
                    >
                      {r.schoolName}
                    </Link>
                  ) : (
                    r.schoolName
                  )}
                </p>
                {!r.schoolId &&
                  r.kind !== "new" &&
                  r.kind !== "opened" &&
                  r.kind !== "missing" && (
                    <p className="text-[13px] font-medium text-warning">
                      No matching school found
                    </p>
                  )}
                <p className="text-[13px] text-muted-foreground">
                  {r.city}, {r.state}
                </p>
              </TableCell>
              <TableCell className="hidden max-w-xs whitespace-normal text-muted-foreground md:table-cell">
                {r.note || "—"}
                {r.submitterEmail && (
                  <p className="text-[13px]">From {r.submitterEmail}</p>
                )}
              </TableCell>
              <TableCell className="tabular hidden text-muted-foreground sm:table-cell">
                {r.createdAt.slice(0, 10)}
              </TableCell>
              <TableCell className="pr-4 text-right">
                {r.status === "pending" ? (
                  <span className="inline-flex gap-2" title={HINT[r.kind]}>
                    <Button
                      size="sm"
                      disabled={busy === r.id}
                      onClick={() => resolve(r.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === r.id}
                      onClick={() => resolve(r.id, "dismissed")}
                    >
                      Dismiss
                    </Button>
                  </span>
                ) : (
                  <Badge
                    variant={r.status === "approved" ? "success" : "secondary"}
                  >
                    {r.status === "approved" ? (
                      <>
                        <CheckIcon /> Approved
                      </>
                    ) : (
                      <>
                        <XIcon /> Dismissed
                      </>
                    )}
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination pager={pager} />
    </div>
  );
}
