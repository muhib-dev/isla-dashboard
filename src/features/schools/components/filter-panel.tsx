"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { FEATURE_LABELS, FEATURES, LISTING_STATUSES, PROFILE_SECTIONS, REGIONS, SCHOOL_TYPE_LABELS, SCHOOL_TYPES, type ProfileSection } from "@/features/schools/schema"
import { DQ_FLAGS } from "@/features/schools/search/doc"
import { gradeLabel } from "@/features/schools/search/grades"
import {
  DQ_LABELS,
  FRESHNESS_LABELS,
  MEMBERSHIP_LABELS,
  PROGRAM_LABELS,
  PROGRAM_TAGS,
  RANGE_FIELDS,
  RANGE_LABELS,
  REGION_NAMES,
  type FacetCounts,
  type ProgramTag,
  type RangeField,
  type RangeFilter,
  type SearchState,
} from "@/features/schools/search"
import { STATES } from "@/features/schools/search/states"

const GRADES = [-2, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const NONE = "none"

function Section({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <section className="space-y-2.5 border-b px-4 py-4 last:border-b-0">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}

type Option = { value: string; label: string; count?: number }

function CheckList({ idPrefix, options, selected, onChange, scroll }: { idPrefix: string; options: Option[]; selected: string[]; onChange: (next: string[]) => void; scroll?: boolean }) {
  return (
    <ul className={cn("grid gap-1.5", scroll && "max-h-48 overflow-y-auto pr-1")}>
      {options.map((o) => {
        const checked = selected.includes(o.value)
        const dead = o.count === 0 && !checked
        return (
          <li key={o.value} className="flex items-center gap-2">
            <Checkbox
              id={`${idPrefix}-${o.value}`}
              checked={checked}
              disabled={dead}
              onCheckedChange={(c) => onChange(c === true ? [...selected, o.value] : selected.filter((v) => v !== o.value))}
            />
            <Label htmlFor={`${idPrefix}-${o.value}`} className={cn("flex-1 font-normal", dead && "text-muted-foreground")}>
              {o.label}
            </Label>
            {o.count !== undefined && <span className="tabular text-xs text-muted-foreground">{o.count}</span>}
          </li>
        )
      })}
    </ul>
  )
}

/** Any / Yes / No for a program the school must (or must not) have. */
function Tri({ label, value, onChange, count }: { label: string; value: "any" | "yes" | "no"; onChange: (v: "any" | "yes" | "no") => void; count?: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>
        {label} {count !== undefined && <span className="tabular text-xs text-muted-foreground">({count})</span>}
      </span>
      <div role="radiogroup" aria-label={label} className="inline-flex rounded-md ring-1 ring-foreground/15">
        {(["any", "yes", "no"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cn("px-2.5 py-1 text-xs first:rounded-l-md last:rounded-r-md", value === v ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
          >
            {v === "any" ? "Any" : v === "yes" ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  )
}

function RangeRow({ field, value, onChange }: { field: RangeField; value: RangeFilter | undefined; onChange: (r: RangeFilter | null) => void }) {
  const { label, unit } = RANGE_LABELS[field]
  const [min, setMin] = useState(value?.min?.toString() ?? "")
  const [max, setMax] = useState(value?.max?.toString() ?? "")

  function commit(nextMin = min, nextMax = max, unknown = value?.unknown) {
    const parse = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s)) || Number(s) < 0 ? undefined : Number(s))
    let a = parse(nextMin)
    let b = parse(nextMax)
    if (a !== undefined && b !== undefined && a > b) [a, b] = [b, a] // swap instead of returning nothing
    if (a === undefined && b === undefined) return onChange(null)
    onChange({ ...(a !== undefined && { min: a }), ...(b !== undefined && { max: b }), ...(unknown && { unknown: true }) })
  }
  const onKey = (e: React.KeyboardEvent) => { if (e.key === "Enter") commit() }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Label className="w-28 shrink-0 text-sm font-normal">{label}</Label>
        <Input inputMode="decimal" aria-label={`${label} minimum`} placeholder={unit === "$" ? "$ min" : unit === "%" ? "% min" : "min"} value={min} onChange={(e) => setMin(e.target.value)} onBlur={() => commit()} onKeyDown={onKey} className="h-8" />
        <span className="text-muted-foreground">–</span>
        <Input inputMode="decimal" aria-label={`${label} maximum`} placeholder={unit === "$" ? "$ max" : unit === "%" ? "% max" : "max"} value={max} onChange={(e) => setMax(e.target.value)} onBlur={() => commit()} onKeyDown={onKey} className="h-8" />
      </div>
      {(value?.min !== undefined || value?.max !== undefined) && (
        <label className="ml-[7.5rem] flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox checked={!!value?.unknown} onCheckedChange={(c) => commit(min, max, c === true)} /> Include schools with no value
        </label>
      )}
    </div>
  )
}

function minutesToTime(m: number | null) {
  return m === null ? "" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}
function timeToMinutes(t: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(t)
  return m ? Number(m[1]) * 60 + Number(m[2]) : null
}

export function FilterPanel({ state, counts, onChange, audience = "staff" }: { audience?: "staff" | "public"; state: SearchState; counts: FacetCounts; onChange: (patch: Partial<SearchState>) => void }) {
  const staff = audience === "staff"
  const states = Object.keys(counts.state)
  const agencies = Object.keys(counts.agency)
  const program = (t: ProgramTag): "any" | "yes" | "no" => (state.yes.includes(t) ? "yes" : state.no.includes(t) ? "no" : "any")
  const setProgram = (t: ProgramTag, v: "any" | "yes" | "no") =>
    onChange({ yes: v === "yes" ? [...state.yes.filter((x) => x !== t), t] : state.yes.filter((x) => x !== t), no: v === "no" ? [...state.no.filter((x) => x !== t), t] : state.no.filter((x) => x !== t) })
  const setRange = (f: RangeField, r: RangeFilter | null) => {
    const next = { ...state.ranges }
    if (r) next[f] = r
    else delete next[f]
    onChange({ ranges: next })
  }
  const withCount = (o: string[], label: (v: string) => string, c: Record<string, number>): Option[] => o.map((v) => ({ value: v, label: label(v), count: c[v] }))

  return (
    <div>
      <Section title="Location">
        <p className="text-xs font-medium text-muted-foreground">Region</p>
        <CheckList idPrefix="region" options={withCount([...REGIONS], (v) => REGION_NAMES[v as keyof typeof REGION_NAMES], counts.region)} selected={state.region} onChange={(v) => onChange({ region: v as SearchState["region"] })} />
        <p className="pt-1 text-xs font-medium text-muted-foreground">Country</p>
        <CheckList idPrefix="country" options={withCount(["US", "CA"], (v) => (v === "US" ? "United States" : "Canada"), counts.country)} selected={state.country} onChange={(v) => onChange({ country: v as SearchState["country"] })} />
        <p className="pt-1 text-xs font-medium text-muted-foreground">State / province</p>
        <CheckList scroll idPrefix="state" options={withCount(states, (v) => STATES[v] ?? v, counts.state)} selected={state.state} onChange={(v) => onChange({ state: v })} />
      </Section>

      <Section title="School">
        <p className="text-xs font-medium text-muted-foreground">Type</p>
        <CheckList idPrefix="type" options={withCount([...SCHOOL_TYPES], (v) => SCHOOL_TYPE_LABELS[v as keyof typeof SCHOOL_TYPE_LABELS], counts.type)} selected={state.type} onChange={(v) => onChange({ type: v as SearchState["type"] })} />
        {staff && <label className="flex items-center justify-between gap-2 pt-1 text-sm">
          Also show closed schools
          <Switch checked={state.listing.includes("closed") && state.listing.length === 3} onCheckedChange={(c) => onChange({ listing: c ? ["open", "pending", "closed"] : [] })} />
        </label>}
        {staff && <>
          <p className="pt-1 text-xs font-medium text-muted-foreground">Listing status</p>
          <CheckList idPrefix="listing" options={withCount([...LISTING_STATUSES], (v) => v[0].toUpperCase() + v.slice(1), counts.listing)} selected={state.listing} onChange={(v) => onChange({ listing: v as SearchState["listing"] })} />
          <p className="text-xs text-muted-foreground">Tick statuses to show only those. With nothing ticked, closed schools are hidden.</p>
          <p className="pt-1 text-xs font-medium text-muted-foreground">Membership</p>
          <CheckList idPrefix="status" options={withCount(Object.keys(MEMBERSHIP_LABELS), (v) => MEMBERSHIP_LABELS[v as keyof typeof MEMBERSHIP_LABELS], counts.status)} selected={state.status} onChange={(v) => onChange({ status: v as SearchState["status"] })} />
          <p className="pt-1 text-xs font-medium text-muted-foreground">Profile status</p>
          <CheckList idPrefix="fresh" options={withCount(Object.keys(FRESHNESS_LABELS), (v) => FRESHNESS_LABELS[v as keyof typeof FRESHNESS_LABELS], counts.freshness)} selected={state.freshness} onChange={(v) => onChange({ freshness: v as SearchState["freshness"] })} />
        </>}
      </Section>

      <Section title="Grades" hint="Pick one grade, or two for a range.">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={state.grade === null ? NONE : gradeLabel(state.grade)} onValueChange={(v) => onChange(v === NONE ? { grade: null, gradeTo: null } : { grade: GRADES.find((g) => gradeLabel(g) === v) ?? null })}>
            <SelectTrigger className="w-24" aria-label="From grade"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={NONE}>Any</SelectItem>{GRADES.map((g) => <SelectItem key={g} value={gradeLabel(g)}>{gradeLabel(g)}</SelectItem>)}</SelectContent>
          </Select>
          <span className="text-muted-foreground">to</span>
          <Select disabled={state.grade === null} value={state.gradeTo === null ? NONE : gradeLabel(state.gradeTo)} onValueChange={(v) => onChange({ gradeTo: v === NONE ? null : (GRADES.find((g) => gradeLabel(g) === v) ?? null) })}>
            <SelectTrigger className="w-24" aria-label="To grade"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={NONE}>—</SelectItem>{GRADES.map((g) => <SelectItem key={g} value={gradeLabel(g)}>{gradeLabel(g)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {state.gradeTo !== null && (
          <Select value={state.gradeMode} onValueChange={(v) => onChange({ gradeMode: v as SearchState["gradeMode"] })}>
            <SelectTrigger className="w-full" aria-label="Grade match"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="covers">Serves every grade in the range</SelectItem>
              <SelectItem value="overlaps">Serves any grade in the range</SelectItem>
            </SelectContent>
          </Select>
        )}
      </Section>

      <Section title="Accreditation">
        <div role="radiogroup" aria-label="Accreditation" className="inline-flex rounded-md ring-1 ring-foreground/15">
          {([[null, "Any"], ["yes", "Accredited"], ["no", "Not accredited"]] as const).map(([v, l]) => (
            <button key={l} type="button" role="radio" aria-checked={state.accredited === v} onClick={() => onChange({ accredited: v })} className={cn("px-2.5 py-1 text-xs first:rounded-l-md last:rounded-r-md", state.accredited === v ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{l}</button>
          ))}
        </div>
        {agencies.length > 0 && (
          <>
            <CheckList scroll idPrefix="agency" options={withCount(agencies, (v) => v, counts.agency)} selected={state.agency} onChange={(v) => onChange({ agency: v })} />
            {state.agency.length > 1 && (
              <label className="flex items-center justify-between gap-2 text-sm">
                Must have all selected <Switch checked={state.agencyAll} onCheckedChange={(c) => onChange({ agencyAll: c })} />
              </label>
            )}
          </>
        )}
      </Section>

      <Section title="Programs" hint="Yes = must have it. No = must not.">
        {PROGRAM_TAGS.map((t) => <Tri key={t} label={PROGRAM_LABELS[t]} value={program(t)} onChange={(v) => setProgram(t, v)} count={counts.programs[t]} />)}
      </Section>

      <Section title="Features">
        <CheckList scroll idPrefix="feature" options={withCount([...FEATURES], (v) => FEATURE_LABELS[v as keyof typeof FEATURE_LABELS], counts.features)} selected={state.features} onChange={(v) => onChange({ features: v as SearchState["features"] })} />
        {state.features.length > 1 && (
          <label className="flex items-center justify-between gap-2 text-sm">
            Any of these (instead of all) <Switch checked={state.featuresAny} onCheckedChange={(c) => onChange({ featuresAny: c })} />
          </label>
        )}
      </Section>

      <Section title="Numbers" hint="Leave blank for no limit. Schools missing a value are left out unless you include them.">
        {RANGE_FIELDS.filter((f) => staff || (f !== "retention" && f !== "salary")).map((f) => <RangeRow key={`${f}:${state.ranges[f]?.min ?? ""}:${state.ranges[f]?.max ?? ""}`} field={f} value={state.ranges[f]} onChange={(r) => setRange(f, r)} />)}
      </Section>

      <Section title="Schedule">
        <Tri label="Friday early release" value={state.fridayEarly === null ? "any" : state.fridayEarly ? "yes" : "no"} onChange={(v) => onChange({ fridayEarly: v === "any" ? null : v === "yes" })} />
        <div className="flex items-center gap-2 text-sm">
          <Label className="font-normal">School starts after</Label>
          <Input type="time" className="h-8 w-28" value={minutesToTime(state.startAfter)} onChange={(e) => onChange({ startAfter: timeToMinutes(e.target.value) })} aria-label="Starts after" />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Label className="font-normal">School starts before</Label>
          <Input type="time" className="h-8 w-28" value={minutesToTime(state.startBefore)} onChange={(e) => onChange({ startBefore: timeToMinutes(e.target.value) })} aria-label="Starts before" />
        </div>
      </Section>

      {staff && <Section title="Data quality" hint="Staff only. Find profiles that need attention.">
        <CheckList idPrefix="dq" options={withCount([...DQ_FLAGS], (v) => DQ_LABELS[v as keyof typeof DQ_LABELS], counts.dq)} selected={state.dq} onChange={(v) => onChange({ dq: v as SearchState["dq"] })} />
        <p className="pt-1 text-xs font-medium text-muted-foreground">Section not verified in a year</p>
        <CheckList idPrefix="vs" options={withCount([...PROFILE_SECTIONS], (v) => v[0].toUpperCase() + v.slice(1), counts.staleSection)} selected={state.staleSection} onChange={(v) => onChange({ staleSection: v as ProfileSection[] })} />
      </Section>}
    </div>
  )
}
