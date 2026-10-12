"use client"

import Link from "next/link"
import { ExternalLinkIcon, MoveIcon } from "lucide-react"
import { FreshnessDot, MembershipStatusDot } from "@/components/shared/status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { gradeSpan } from "@/features/schools/lib"
import { FEATURE_LABELS, REGION_LABELS, SCHOOL_TYPE_LABELS } from "@/features/schools/schema"
import type { ResultRow } from "@/features/schools/search"
import { fmt } from "@/lib/format"
import { ContactSchoolForm } from "./submission-forms"

export function SchoolDetailSheet({
  row,
  unit,
  audience = "staff",
  onClose,
  onAdjustPin,
}: {
  row: ResultRow | null
  unit: "mi" | "km"
  audience?: "staff" | "public"
  onClose: () => void
  onAdjustPin?: (row: ResultRow) => void
}) {
  const doc = row?.doc
  const staff = audience === "staff"
  return (
    <Sheet open={!!row} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {doc && (
          <>
            <SheetHeader>
              <SheetTitle>{doc.name}</SheetTitle>
              <SheetDescription>
                {doc.city}, {doc.state}{staff && ` · ${REGION_LABELS[doc.region]}`}
              </SheetDescription>
              {!staff && doc.membership.status === "active" && <Badge variant="secondary" className="w-fit">ISLA member</Badge>}
            </SheetHeader>
            <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 px-4 text-sm">
              {staff && (
                <>
                  <dt className="text-muted-foreground">Membership</dt>
                  <dd><MembershipStatusDot status={doc.membership.status} /></dd>
                  <dt className="text-muted-foreground">Profile</dt>
                  <dd><FreshnessDot freshness={doc.freshness} /></dd>
                </>
              )}
              <dt className="text-muted-foreground">Type</dt>
              <dd>{SCHOOL_TYPE_LABELS[doc.schoolType]}</dd>
              <dt className="text-muted-foreground">Grades</dt>
              <dd>{gradeSpan(doc.gradesFrom, doc.gradesTo)}</dd>
              <dt className="text-muted-foreground">Students</dt>
              <dd className="tabular">{fmt.number(doc.enrollment)}</dd>
              <dt className="text-muted-foreground">Tuition</dt>
              <dd className="tabular">{doc.tuition === null ? "Not listed" : fmt.currency(doc.tuition)}</dd>
              <dt className="text-muted-foreground">Founded</dt>
              <dd className="tabular">{doc.founded}</dd>
              <dt className="text-muted-foreground">Accreditation</dt>
              <dd>{doc.accreditation.length ? doc.accreditation.join(", ") : "None listed"}</dd>
              {doc.features.length > 0 && (
                <>
                  <dt className="text-muted-foreground">Features</dt>
                  <dd>{doc.features.map((f) => FEATURE_LABELS[f]).join(", ")}</dd>
                </>
              )}
              <dt className="text-muted-foreground">Location</dt>
              <dd>
                {doc.lat === null ? "Not on map" : doc.precision === "rooftop" ? "Exact address" : "Approximate (city level)"}
                {row?.distance != null && <span className="text-muted-foreground"> · {row.distance.toFixed(1)} {unit} away</span>}
              </dd>
            </dl>

            {staff ? (
              <div className="mt-6 flex flex-wrap gap-2 px-4">
                <Button asChild>
                  <Link href={`/schools/${doc.id}`}>Open profile <ExternalLinkIcon /></Link>
                </Button>
                {onAdjustPin && row && (
                  <Button variant="outline" onClick={() => onAdjustPin(row)}><MoveIcon /> Adjust pin</Button>
                )}
              </div>
            ) : (
              <div className="mt-6 space-y-2 border-t px-4 pt-4">
                <h3 className="text-sm font-semibold">Contact this school</h3>
                <ContactSchoolForm schoolId={doc.id} schoolName={doc.name} />
              </div>
            )}
            <p className="mt-6 px-4 pb-4 text-xs text-muted-foreground">Listing or membership is not accreditation, certification or endorsement by ISLA.</p>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
