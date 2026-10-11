"use client"

import { useState, useTransition } from "react"
import { PencilIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { updateSchoolSection } from "@/features/schools/actions"
import { SECTION_LABELS } from "@/features/schools/lib"
import type { ProfileSection, SectionPatch } from "@/features/schools/schema"
import { ContactsForm, LeadershipForm, OverviewForm, ProgramsForm, ScheduleForm, type SectionFormProps } from "./forms"

const FORMS: { [S in ProfileSection]: React.ComponentType<SectionFormProps<S>> } = {
  overview: OverviewForm,
  leadership: LeadershipForm,
  schedule: ScheduleForm,
  programs: ProgramsForm,
  contacts: ContactsForm,
}

export function EditSectionSheet<S extends ProfileSection>({
  schoolId,
  section,
  initial,
}: {
  schoolId: string
  section: S
  initial: SectionPatch<S>
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(initial)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [pending, startTransition] = useTransition()
  const Form = FORMS[section] as React.ComponentType<SectionFormProps<S>>
  const label = SECTION_LABELS[section]

  function onOpenChange(next: boolean) {
    if (next) {
      setValue(initial)
      setErrors({})
    }
    setOpen(next)
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await updateSchoolSection(schoolId, section, value)
      if (result.ok) {
        toast.success(`${label} saved`)
        setOpen(false)
      } else {
        setErrors(result.fieldErrors ?? {})
        toast.error(result.error)
      }
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilIcon /> Edit
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 sm:max-w-lg">
        <form onSubmit={onSubmit} className="flex h-full flex-col">
          <SheetHeader className="border-b">
            <SheetTitle>Edit {label.toLowerCase()}</SheetTitle>
            <SheetDescription>Saving also marks this section as verified today.</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <Form value={value} onChange={setValue} errors={errors} />
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/** One-click "still accurate" for sections that only need re-verifying. */
export function ConfirmSectionButton<S extends ProfileSection>({
  schoolId,
  section,
  current,
}: {
  schoolId: string
  section: S
  current: SectionPatch<S>
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await updateSchoolSection(schoolId, section, current)
          if (result.ok) toast.success(`${SECTION_LABELS[section]} confirmed`)
          else toast.error(result.error)
        })
      }
    >
      {pending ? "Confirming…" : "Still accurate"}
    </Button>
  )
}
