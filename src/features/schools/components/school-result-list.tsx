"use client"

import { useEffect, useRef } from "react"
import { MapPinOffIcon } from "lucide-react"
import { MembershipStatusDot } from "@/components/shared/status"
import { gradeSpan } from "@/features/schools/lib"
import { canon } from "@/features/schools/search/aliases"
import { highlight } from "@/features/schools/search"
import type { TextAtom } from "@/features/schools/search/parse-query"
import type { ResultRow } from "@/features/schools/search"
import { cn } from "@/lib/utils"

export function HighlightedName({ text, atoms }: { text: string; atoms: TextAtom[] }) {
  return (
    <>
      {highlight(text, atoms, canon).map((run, i) =>
        run.hit ? <mark key={i} className="rounded-sm bg-primary/15 px-0.5 text-foreground">{run.text}</mark> : <span key={i}>{run.text}</span>,
      )}
    </>
  )
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
  rows: ResultRow[]
  atoms: TextAtom[]
  unit: "mi" | "km"
  selectedId: string | null
  hoverId: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
}) {
  const refs = useRef(new Map<string, HTMLLIElement>())
  useEffect(() => {
    if (selectedId) refs.current.get(selectedId)?.scrollIntoView({ block: "nearest" })
  }, [selectedId])

  return (
    <ul className="divide-y rounded-xl bg-card ring-1 ring-foreground/10" aria-label="Schools">
      {rows.map(({ doc, distance }) => (
        <li
          key={doc.id}
          ref={(el) => { if (el) refs.current.set(doc.id, el); else refs.current.delete(doc.id) }}
          className={cn(doc.id === selectedId && "bg-primary/5", doc.id === hoverId && "bg-muted/60")}
          onMouseEnter={() => onHover(doc.id)}
          onMouseLeave={() => onHover(null)}
        >
          <button type="button" onClick={() => onSelect(doc.id)} className="flex w-full flex-col gap-1 px-4 py-3 text-left outline-offset-[-2px] focus-visible:outline-2">
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-medium"><HighlightedName text={doc.name} atoms={atoms} /></span>
              {distance !== null && <span className="tabular shrink-0 text-xs text-muted-foreground">{distance < 10 ? distance.toFixed(1) : Math.round(distance)} {unit}</span>}
            </span>
            <span className="text-sm text-muted-foreground">
              {doc.city}, {doc.state} · {gradeSpan(doc.gradesFrom, doc.gradesTo)}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <MembershipStatusDot status={doc.membership.status} />
              {doc.lat === null && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><MapPinOffIcon className="size-3" /> Not on map</span>
              )}
              {doc.lat !== null && doc.precision !== "rooftop" && <span className="text-xs text-muted-foreground">Approximate location</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
