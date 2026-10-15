"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { METRIC_META } from "@/features/analytics/lib";
import type { MetricKey, SchoolComparison } from "@/features/analytics/schema";
import { formatMetric } from "@/lib/format";
import { BenchmarkRanges } from "./benchmark-ranges";
import { ordinal } from "./median-delta";

// Design order; applications per vacancy slots in second when the backend sends it.
const ROWS: MetricKey[] = [
  "enrollment",
  "retentionRate",
  "studentTeacherRatio",
  "avgTeacherSalary",
  "tuition",
];

type BenchmarkRow = {
  key: string;
  label: string;
  format: Parameters<typeof formatMetric>[1];
  higherIsBetter: boolean | null;
  school: number;
  median: number;
  percentile: number;
};

export function benchmarkRows(c: SchoolComparison): BenchmarkRow[] {
  const rows: BenchmarkRow[] = ROWS.map((key) => ({
    key,
    label: METRIC_META[key].label,
    format: METRIC_META[key].format,
    higherIsBetter: METRIC_META[key].higherIsBetter,
    school: c.school[key],
    median: c.peerMedian[key],
    percentile: c.percentile[key],
  }));
  const apps = c.applicationsPerVacancy;
  if (apps) {
    rows.splice(1, 0, {
      key: "applicationsPerVacancy",
      label: "Applications per vacancy",
      format: "decimal",
      higherIsBetter: true,
      school: apps.school,
      median: apps.peerMedian,
      percentile: apps.percentile,
    });
  }
  return rows;
}

/** Every metric vs. peers, as a table (default) or as range strips. */
export function BenchmarkDetail({
  comparison,
  schoolName,
}: {
  comparison: SchoolComparison;
  schoolName: string;
}) {
  const [view, setView] = useState<"table" | "ranges">("table");

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b px-6 py-4 [.border-b]:pb-4">
        <CardTitle>Benchmark detail</CardTitle>
        <CardDescription>
          Where {schoolName} sits among {comparison.peerCount} peer schools.
        </CardDescription>
        <CardAction className="self-center">
          <Button
            variant="link"
            size="sm"
            className="px-0"
            onClick={() => setView(view === "table" ? "ranges" : "table")}
          >
            {view === "table" ? "View as ranges" : "View as table"}
          </Button>
        </CardAction>
      </CardHeader>

      {view === "ranges" ? (
        <div className="px-6 py-5">
          <BenchmarkRanges comparison={comparison} schoolName={schoolName} />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Metric</TableHead>
              <TableHead className="text-right">Your school</TableHead>
              <TableHead className="text-right">Peer median</TableHead>
              <TableHead className="w-[38%] min-w-56 pr-6 pl-8">
                Percentile among peers
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="tabular">
            {benchmarkRows(comparison).map((row) => {
              const fmt = (n: number) => formatMetric(n, row.format);
              const pct = Math.round(row.percentile * 100);
              return (
                <TableRow key={row.key}>
                  <TableCell className="pl-6">
                    <span className="font-medium">{row.label}</span>
                    {row.higherIsBetter === false && (
                      <span className="block text-caption text-muted-foreground">
                        Lower is better
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {fmt(row.school)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {fmt(row.median)}
                  </TableCell>
                  <TableCell className="pr-6 pl-8">
                    <PercentileTrack percentile={pct} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

/** 6px track, median tick at 50%, navy dot at the school's percentile. */
function PercentileTrack({ percentile }: { percentile: number }) {
  const left = `${Math.max(0, Math.min(100, percentile))}%`;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-1.5 flex-1 rounded-full bg-muted" aria-hidden>
        <div className="absolute -top-1 left-1/2 h-3.5 w-0.5 -translate-x-1/2 rounded-full bg-chart-median" />
        <div
          className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chart-1 ring-2 ring-card"
          style={{ left }}
        />
      </div>
      <span className="w-10 shrink-0 text-right font-medium">
        {ordinal(percentile)}
        <span className="sr-only"> percentile among peers</span>
      </span>
    </div>
  );
}
