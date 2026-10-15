"use client";

import { DownloadIcon, MailIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { csvCell, downloadCsv } from "@/features/schools/csv";

/** "Remind all" in a list-card header. Reminders are emailed once messaging is connected. */
export function RemindAllButton({ count }: { count: number }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        toast.success(
          `Renewal reminders queued for ${count} ${count === 1 ? "school" : "schools"}.`,
        )
      }
    >
      <MailIcon /> Remind all
    </Button>
  );
}

/** Inline "Remind" link for one row. */
export function RemindLink({ school }: { school: string }) {
  return (
    <button
      type="button"
      className="text-[15px] font-medium text-link underline-offset-4 hover:underline"
      onClick={() => toast.success(`Renewal reminder queued for ${school}.`)}
    >
      Remind
    </button>
  );
}

export type ExportRow = Record<string, string | number | null>;

/** Outline "Export" button: downloads the rows as CSV. */
export function ExportCsvButton({
  filename,
  rows,
}: {
  filename: string;
  rows: ExportRow[];
}) {
  const exportRows = () => {
    if (!rows.length) return;
    const columns = Object.keys(rows[0]);
    const lines = [
      columns.join(","),
      ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(",")),
    ];
    downloadCsv(filename, lines.join("\r\n") + "\r\n");
  };
  return (
    <Button variant="outline" onClick={exportRows} disabled={!rows.length}>
      <DownloadIcon /> Export
    </Button>
  );
}
