"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { resolveReportAction } from "@/features/schools/submission-actions"
import { REPORT_KIND_LABELS, type SchoolReport } from "@/features/schools/submissions"

const HINT: Partial<Record<SchoolReport["kind"], string>> = {
  new: "Approve to publish this school on the map; dismiss to hide it.",
  closed: "Approve to mark the school closed.",
}

export function ReportsTable({ reports }: { reports: SchoolReport[] }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [, start] = useTransition()

  function resolve(id: string, decision: "approved" | "dismissed") {
    setBusy(id)
    start(async () => {
      const r = await resolveReportAction(id, decision)
      setBusy(null)
      if (r.ok) toast.success(decision === "approved" ? "Approved" : "Dismissed")
      else toast.error(r.error)
    })
  }

  if (!reports.length) {
    return <div className="rounded-xl py-16 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">No reports yet.</div>
  }
  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
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
          {reports.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="pl-4 whitespace-normal">{REPORT_KIND_LABELS[r.kind]}</TableCell>
              <TableCell className="whitespace-normal">
                <p className="font-medium">{r.schoolId ? <Link href={`/schools/${r.schoolId}`} className="hover:underline">{r.schoolName}</Link> : r.schoolName}</p>
                {!r.schoolId && r.kind !== "new" && r.kind !== "opened" && r.kind !== "missing" && <p className="text-xs text-muted-foreground">No matching school found</p>}
                <p className="text-sm text-muted-foreground">{r.city}, {r.state}</p>
              </TableCell>
              <TableCell className="hidden max-w-xs whitespace-normal text-muted-foreground md:table-cell">
                {r.note || "—"}
                {r.submitterEmail && <p className="text-xs">From {r.submitterEmail}</p>}
              </TableCell>
              <TableCell className="tabular hidden text-muted-foreground sm:table-cell">{r.createdAt.slice(0, 10)}</TableCell>
              <TableCell className="pr-4 text-right">
                {r.status === "pending" ? (
                  <span className="inline-flex gap-2" title={HINT[r.kind]}>
                    <Button size="sm" disabled={busy === r.id} onClick={() => resolve(r.id, "approved")}>Approve</Button>
                    <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => resolve(r.id, "dismissed")}>Dismiss</Button>
                  </span>
                ) : (
                  <Badge variant={r.status === "approved" ? "secondary" : "outline"}>{r.status === "approved" ? "Approved" : "Dismissed"}</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
