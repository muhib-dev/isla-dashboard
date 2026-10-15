"use client";

import { useEffect, useRef } from "react";
import { MapPinOffIcon } from "lucide-react";
import { MembershipStatusDot } from "@/components/shared/status";
import { studentsLabel } from "@/features/schools/lib";
import { canon } from "@/features/schools/search/aliases";
import { highlight } from "@/features/schools/search";
import type { TextAtom } from "@/features/schools/search/parse-query";
import type { ResultRow } from "@/features/schools/search";
import { cn } from "@/lib/utils";
import { SchoolTile } from "./school-tile";

export function HighlightedName({
  text,
  atoms,
}: {
  text: string;
  atoms: TextAtom[];
}) {
  return (
    <>
      {highlight(text, atoms, canon).map((run, i) =>
        run.hit ? (
          <mark
            key={i}
            className="rounded-sm bg-[color-mix(in_oklch,var(--primary)_15%,transparent)] px-0.5 text-foreground"
          >
            {run.text}
          </mark>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </>
  );
}

export function SchoolResultList({
  rows,
  atoms,
  unit,
  selectedId,
  hoverId,
  onSelect,
  onHover,
}: {
  rows: ResultRow[];
  atoms: TextAtom[];
  unit: "mi" | "km";
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const refs = useRef(new Map<string, HTMLLIElement>());
  useEffect(() => {
    if (selectedId)
      refs.current.get(selectedId)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <ul className="divide-y border-b" aria-label="Schools">
      {rows.map(({ doc, distance }) => {
        const students = studentsLabel(doc.enrollmentExact, doc.enrollmentBand);
        return (
          <li
            key={doc.id}
            ref={(el) => {
              if (el) refs.current.set(doc.id, el);
              else refs.current.delete(doc.id);
            }}
            className={cn(
              "transition-colors hover:bg-surface-2",
              doc.id === hoverId && "bg-surface-2",
              doc.id === selectedId &&
                "bg-[color-mix(in_oklch,var(--primary)_6%,var(--card))] shadow-[inset_3px_0_0_var(--primary)] hover:bg-[color-mix(in_oklch,var(--primary)_6%,var(--card))]",
            )}
            onMouseEnter={() => onHover(doc.id)}
            onMouseLeave={() => onHover(null)}
          >
            <button
              type="button"
              onClick={() => onSelect(doc.id)}
              aria-current={doc.id === selectedId ? "true" : undefined}
              className="flex w-full items-start gap-3 px-5 py-3 text-left -outline-offset-2 focus-visible:outline-2"
            >
              <SchoolTile
                name={doc.name}
                className="text-[12px] text-muted-foreground"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-medium">
                    <HighlightedName text={doc.name} atoms={atoms} />
                  </span>
                  {distance !== null && (
                    <span className="tabular shrink-0 text-[13px] text-muted-foreground">
                      {distance < 10
                        ? distance.toFixed(1)
                        : Math.round(distance)}{" "}
                      {unit}
                    </span>
                  )}
                </span>
                <span className="truncate text-[13px] text-muted-foreground">
                  {doc.city}, {doc.state}
                  {students !== "Not listed" && ` · ${students} students`}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <MembershipStatusDot
                    status={doc.membership.status}
                    className="text-[13px]"
                  />
                  {doc.lat === null && (
                    <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
                      <MapPinOffIcon className="size-3.5" /> Not on map
                    </span>
                  )}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
