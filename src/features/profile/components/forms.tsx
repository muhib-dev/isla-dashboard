"use client"

import { PlusIcon, XIcon } from "lucide-react"
import { DatePicker } from "@/components/shared/date-picker"
import { Field, ToggleRow } from "@/components/shared/field"
import { TimePicker } from "@/components/shared/time-picker"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { ProfileSection, SectionPatch } from "@/features/schools/schema"

export type SectionFormProps<S extends ProfileSection> = {
  value: SectionPatch<S>
  onChange: (value: SectionPatch<S>) => void
  errors: Record<string, string[]>
}

const ATHLETICS = ["Basketball", "Soccer", "Volleyball", "Track", "Swimming"]

export function OverviewForm({ value, onChange, errors }: SectionFormProps<"overview">) {
  const set = <K extends keyof typeof value>(key: K, v: (typeof value)[K]) => onChange({ ...value, [key]: v })
  const num = (key: "founded" | "enrollment" | "teachers" | "tuition") => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="name" label="School name" error={errors.name} className="sm:col-span-2">
        <Input id="name" value={value.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field id="gradesFrom" label="Lowest grade" error={errors.gradesFrom}>
        <Input id="gradesFrom" value={value.gradesFrom} onChange={(e) => set("gradesFrom", e.target.value)} />
      </Field>
      <Field id="gradesTo" label="Highest grade" error={errors.gradesTo}>
        <Input id="gradesTo" value={value.gradesTo} onChange={(e) => set("gradesTo", e.target.value)} />
      </Field>
      <Field id="enrollment" label="Enrollment" error={errors.enrollment}>
        <Input id="enrollment" type="number" inputMode="numeric" value={value.enrollment} onChange={num("enrollment")} />
      </Field>
      <Field id="teachers" label="Full-time teachers" error={errors.teachers}>
        <Input id="teachers" type="number" inputMode="numeric" value={value.teachers} onChange={num("teachers")} />
      </Field>
      <Field id="tuition" label="Annual tuition (USD)" error={errors.tuition}>
        <Input id="tuition" type="number" inputMode="numeric" value={value.tuition} onChange={num("tuition")} />
      </Field>
      <Field id="founded" label="Year founded" error={errors.founded}>
        <Input id="founded" type="number" inputMode="numeric" value={value.founded} onChange={num("founded")} />
      </Field>
      <Field id="accreditation" label="Accreditation" hint="Separate with commas" error={errors.accreditation} className="sm:col-span-2">
        <Input id="accreditation" value={value.accreditation} onChange={(e) => set("accreditation", e.target.value)} />
      </Field>
    </div>
  )
}

export function LeadershipForm({ value, onChange, errors }: SectionFormProps<"leadership">) {
  const leaders = value.leaders
  const update = (index: number, patch: Partial<(typeof leaders)[number]>) =>
    onChange({ leaders: leaders.map((l, i) => (i === index ? { ...l, ...patch } : l)) })

  return (
    <div className="space-y-3">
      {leaders.map((leader, i) => (
        <fieldset key={leader.id} className="relative grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
          <legend className="sr-only">{leader.role || "New role"}</legend>
          <Field id={`role-${i}`} label="Role" error={errors[`leaders.${i}.role`]}>
            <Input id={`role-${i}`} value={leader.role} onChange={(e) => update(i, { role: e.target.value })} />
          </Field>
          <Field id={`name-${i}`} label="Name" error={errors[`leaders.${i}.name`]}>
            <Input id={`name-${i}`} value={leader.name} onChange={(e) => update(i, { name: e.target.value })} />
          </Field>
          <Field id={`email-${i}`} label="Email" error={errors[`leaders.${i}.email`]}>
            <Input id={`email-${i}`} type="email" value={leader.email} onChange={(e) => update(i, { email: e.target.value })} />
          </Field>
          <Field id={`since-${i}`} label="In role since" error={errors[`leaders.${i}.since`]}>
            <Input
              id={`since-${i}`}
              type="number"
              inputMode="numeric"
              value={leader.since ?? ""}
              onChange={(e) => update(i, { since: Number.isNaN(e.target.valueAsNumber) ? null : e.target.valueAsNumber })}
            />
          </Field>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-2 right-2 text-muted-foreground"
            onClick={() => onChange({ leaders: leaders.filter((_, j) => j !== i) })}
            aria-label={`Remove ${leader.role || "role"}`}
          >
            <XIcon />
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({ leaders: [...leaders, { id: crypto.randomUUID(), role: "", name: "", email: "", since: null }] })
        }
      >
        <PlusIcon /> Add a role
      </Button>
    </div>
  )
}

export function ScheduleForm({ value, onChange, errors }: SectionFormProps<"schedule">) {
  const set = <K extends keyof typeof value>(key: K, v: (typeof value)[K]) => onChange({ ...value, [key]: v })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="startTime" label="School starts" error={errors.startTime}>
        <TimePicker id="startTime" value={value.startTime} onChange={(v) => set("startTime", v)} />
      </Field>
      <Field id="endTime" label="School ends" error={errors.endTime}>
        <TimePicker id="endTime" value={value.endTime} onChange={(v) => set("endTime", v)} />
      </Field>
      <Field id="firstDay" label="First day of school" error={errors.firstDay}>
        <DatePicker id="firstDay" value={value.firstDay} onChange={(v) => set("firstDay", v)} />
      </Field>
      <Field id="lastDay" label="Last day of school" error={errors.lastDay}>
        <DatePicker id="lastDay" value={value.lastDay} onChange={(v) => set("lastDay", v)} />
      </Field>
      <div className="sm:col-span-2">
        <ToggleRow id="fridayEarlyRelease" label="Friday early release" description="For Jumu'ah prayer.">
          <Switch
            id="fridayEarlyRelease"
            checked={value.fridayEarlyRelease}
            onCheckedChange={(v) => set("fridayEarlyRelease", v)}
          />
        </ToggleRow>
      </div>
      <Field id="note" label="Note for families" error={errors.note} className="sm:col-span-2">
        <Textarea id="note" rows={3} value={value.note} onChange={(e) => set("note", e.target.value)} />
      </Field>
    </div>
  )
}

export function ProgramsForm({ value, onChange, errors }: SectionFormProps<"programs">) {
  const set = <K extends keyof typeof value>(key: K, v: (typeof value)[K]) => onChange({ ...value, [key]: v })
  const setLunch = (patch: Partial<typeof value.lunch>) => set("lunch", { ...value.lunch, ...patch })

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Lunch program</h3>
        <div className="divide-y">
          <ToggleRow id="lunchOffered" label="Lunch is offered">
            <Switch id="lunchOffered" checked={value.lunch.offered} onCheckedChange={(v) => setLunch({ offered: v })} />
          </ToggleRow>
          {value.lunch.offered && (
            <>
              <div className="py-3">
                <Field id="provider" label="Provider" error={errors["lunch.provider"]}>
                  <Input id="provider" value={value.lunch.provider} onChange={(e) => setLunch({ provider: e.target.value })} />
                </Field>
              </div>
              <ToggleRow id="allHalal" label="All meals are halal">
                <Switch id="allHalal" checked={value.lunch.allHalal} onCheckedChange={(v) => setLunch({ allHalal: v })} />
              </ToggleRow>
              <ToggleRow id="freeReduced" label="Free or reduced-price meals available">
                <Switch
                  id="freeReduced"
                  checked={value.lunch.freeReducedAvailable}
                  onCheckedChange={(v) => setLunch({ freeReducedAvailable: v })}
                />
              </ToggleRow>
            </>
          )}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Programs</h3>
        <div className="divide-y">
          {(
            [
              ["quran", "Quran"],
              ["arabic", "Arabic"],
              ["afterCare", "After-care"],
              ["transportation", "Transportation"],
            ] as const
          ).map(([key, label]) => (
            <ToggleRow key={key} id={key} label={label}>
              <Switch id={key} checked={value[key]} onCheckedChange={(v) => set(key, v)} />
            </ToggleRow>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Athletics</h3>
        <div className="grid grid-cols-2 gap-2">
          {ATHLETICS.map((sport) => (
            <Label key={sport} className="flex items-center gap-2 text-sm font-normal">
              <Checkbox
                checked={value.athletics.includes(sport)}
                onCheckedChange={(checked) =>
                  set("athletics", checked ? [...value.athletics, sport] : value.athletics.filter((s) => s !== sport))
                }
              />
              {sport}
            </Label>
          ))}
        </div>
      </section>
    </div>
  )
}

export function ContactsForm({ value, onChange, errors }: SectionFormProps<"contacts">) {
  const set = <K extends keyof typeof value>(key: K, v: string) => onChange({ ...value, [key]: v })
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id="phone" label="Phone" error={errors.phone}>
        <Input id="phone" type="tel" value={value.phone} onChange={(e) => set("phone", e.target.value)} />
      </Field>
      <Field id="email" label="Office email" error={errors.email}>
        <Input id="email" type="email" value={value.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field id="website" label="Website" error={errors.website} className="sm:col-span-2">
        <Input id="website" type="url" value={value.website} onChange={(e) => set("website", e.target.value)} />
      </Field>
      <Field id="street" label="Street address" error={errors.street} className="sm:col-span-2">
        <Input id="street" value={value.street} onChange={(e) => set("street", e.target.value)} />
      </Field>
      <Field id="city" label="City" error={errors.city}>
        <Input id="city" value={value.city} onChange={(e) => set("city", e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field id="state" label="State" error={errors.state}>
          <Input id="state" value={value.state} onChange={(e) => set("state", e.target.value)} />
        </Field>
        <Field id="postalCode" label="Postal code" error={errors.postalCode}>
          <Input id="postalCode" value={value.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
        </Field>
      </div>
    </div>
  )
}
