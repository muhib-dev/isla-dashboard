"use client";

import { useState } from "react";
import { CalendarIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ENROLLMENT_BAND_LABELS,
  ENROLLMENT_BANDS,
  FEATURE_LABELS,
  FEATURES,
  LISTING_STATUSES,
  PROFILE_SECTIONS,
  REGIONS,
  SCHOOL_TYPE_LABELS,
  SCHOOL_TYPES,
  type ProfileSection,
} from "@/features/schools/schema";
import { DQ_FLAGS } from "@/features/schools/search/doc";
import { gradeLabel } from "@/features/schools/search/grades";
import {
  dateRangeLabel,
  DQ_LABELS,
  FRESHNESS_LABELS,
  MEMBERSHIP_LABELS,
  PROGRAM_LABELS,
  PROGRAM_TAGS,
  RANGE_FIELDS,
  RANGE_LABELS,
  RANGE_STEP,
  REGION_NAMES,
  type DateRange,
  type FacetCounts,
  type ProgramTag,
  type RangeField,
  type RangeFilter,
  type SearchState,
} from "@/features/schools/search";
import { STATES } from "@/features/schools/search/states";

const GRADES = [-2, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const NONE = "none";

function Section({
  title,
  children,
  hint,
}: {
  title: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <section className="space-y-3 border-b px-4 py-5 last:border-b-0">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {hint && (
          <p className="text-[13px] text-muted-foreground">{hint}</p>
        )}
      </div>
      {children}
    </section>
  );
}

type Option = { value: string; label: string; count?: number };

function CheckList({
  idPrefix,
  options,
  selected,
  onChange,
  scroll,
}: {
  idPrefix: string;
  options: Option[];
  selected: string[];
  onChange: (next: string[]) => void;
  scroll?: boolean;
}) {
  return (
    <ul
      className={cn("grid gap-1.5", scroll && "max-h-48 overflow-y-auto pr-1")}
    >
      {options.map((o) => {
        const checked = selected.includes(o.value);
        const dead = o.count === 0 && !checked;
        return (
          <li key={o.value} className="flex items-center gap-2">
            <Checkbox
              id={`${idPrefix}-${o.value}`}
              checked={checked}
              disabled={dead}
              onCheckedChange={(c) =>
                onChange(
                  c === true
                    ? [...selected, o.value]
                    : selected.filter((v) => v !== o.value),
                )
              }
            />
            <Label
              htmlFor={`${idPrefix}-${o.value}`}
              className={cn(
                "flex-1 font-normal",
                dead && "text-muted-foreground",
              )}
            >
              {o.label}
            </Label>
            {o.count !== undefined && (
              <span className="tabular text-xs text-muted-foreground">
                {o.count}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Any / Yes / No for a program the school must (or must not) have. */
function Tri({
  label,
  value,
  onChange,
  count,
}: {
  label: string;
  value: "any" | "yes" | "no";
  onChange: (v: "any" | "yes" | "no") => void;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span>
        {label}{" "}
        {count !== undefined && (
          <span className="tabular text-xs text-muted-foreground">
            ({count})
          </span>
        )}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex gap-0.5 rounded-lg border bg-muted p-[3px]"
      >
        {(["any", "yes", "no"] as const).map((v) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={cn(
              "rounded-md border border-transparent px-2.5 py-1 text-[13px] font-medium text-muted-foreground transition-colors",
              value === v
                ? "border-border bg-card text-foreground shadow-xs"
                : "hover:text-foreground",
            )}
          >
            {v === "any" ? "Any" : v === "yes" ? "Yes" : "No"}
          </button>
        ))}
      </div>
    </div>
  );
}

function RangeRow({
  field,
  extent,
  value,
  onChange,
}: {
  field: RangeField;
  extent: { min: number; max: number };
  value: RangeFilter | undefined;
  onChange: (r: RangeFilter | null) => void;
}) {
  const { label, unit } = RANGE_LABELS[field];
  const step = RANGE_STEP[field];
  // Round the ends out to the step so every school's value is reachable.
  const lo = Math.floor(extent.min / step) * step;
  const hi = Math.max(lo + step, Math.ceil(extent.max / step) * step);
  const clamp = (n: number) => Math.min(hi, Math.max(lo, n));
  const fromValue = (): [number, number] => [
    clamp(value?.min ?? lo),
    clamp(value?.max ?? hi),
  ];
  const [draft, setDraft] = useState(fromValue);
  // Follow outside changes (chip removed, "Clear all") without remounting, which would drop keyboard focus.
  const valueKey = `${value?.min ?? ""}:${value?.max ?? ""}`;
  const [seenKey, setSeenKey] = useState(valueKey);
  if (seenKey !== valueKey) {
    setSeenKey(valueKey);
    setDraft(fromValue());
  }
  const active = value?.min !== undefined || value?.max !== undefined;
  const fmt = (n: number) =>
    unit === "$"
      ? `$${n.toLocaleString("en-US")}`
      : unit === "%"
        ? `${n}%`
        : String(n);
  const [a, b] = draft;
  const summary =
    a <= lo && b >= hi
      ? "Any"
      : a <= lo
        ? `up to ${fmt(b)}`
        : b >= hi
          ? `${fmt(a)}+`
          : `${fmt(a)} – ${fmt(b)}`;

  // A thumb parked at either end means "no limit" on that side.
  function commit([min, max]: number[], unknown = value?.unknown) {
    const r: RangeFilter = {
      ...(min > lo && { min }),
      ...(max < hi && { max }),
    };
    if (r.min === undefined && r.max === undefined) return onChange(null);
    onChange({ ...r, ...(unknown && { unknown: true }) });
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span
          className={cn(
            "tabular text-xs",
            active ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {summary}
        </span>
      </div>
      <Slider
        min={lo}
        max={hi}
        step={step}
        value={draft}
        onValueChange={(v) => setDraft([v[0], v[1]])}
        onValueCommit={(v) => commit(v)}
        thumbLabels={[`${label} minimum`, `${label} maximum`]}
      />
      {active && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={!!value?.unknown}
            onCheckedChange={(c) => commit(draft, c === true)}
          />{" "}
          Include schools with no value
        </label>
      )}
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDay = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromDay = (s: string | undefined) => {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function FirstDayPicker({
  value,
  onChange,
}: {
  value: DateRange | null;
  onChange: (r: DateRange | null) => void;
}) {
  const selected = value
    ? { from: fromDay(value.from), to: fromDay(value.to) }
    : undefined;
  // School years start in late summer, so open on August unless a range is already picked.
  const month = selected?.from ?? new Date(new Date().getFullYear(), 7, 1);
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-normal">First day of school</Label>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "flex-1 justify-start font-normal",
                !value && "text-muted-foreground",
              )}
            >
              <CalendarIcon /> {value ? dateRangeLabel(value) : "Any date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              resetOnSelect
              selected={selected}
              defaultMonth={month}
              captionLayout="dropdown"
              onSelect={(r) =>
                onChange(
                  r?.from
                    ? { from: toDay(r.from), ...(r.to && { to: toDay(r.to) }) }
                    : null,
                )
              }
            />
          </PopoverContent>
        </Popover>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear first day of school"
            onClick={() => onChange(null)}
          >
            <XIcon />
          </Button>
        )}
      </div>
    </div>
  );
}

// Start-time choices: every 15 minutes from 6:00 to 10:00 AM.
const START_TIMES = Array.from({ length: 17 }, (_, i) => 6 * 60 + i * 15);
const timeLabel = (m: number) =>
  `${Math.floor(m / 60) % 12 || 12}:${pad(m % 60)} ${m < 720 ? "AM" : "PM"}`;

function StartTimeSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (m: number | null) => void;
}) {
  // Keep a hand-typed URL value selectable even if it isn't on the 15-minute grid.
  const options =
    value === null || START_TIMES.includes(value)
      ? START_TIMES
      : [...START_TIMES, value].sort((x, y) => x - y);
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <Label className="font-normal">{label}</Label>
      <Select
        value={value === null ? NONE : String(value)}
        onValueChange={(v) => onChange(v === NONE ? null : Number(v))}
      >
        <SelectTrigger className="w-32" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Any time</SelectItem>
          {options.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {timeLabel(m)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FilterPanel({
  state,
  counts,
  extents,
  onChange,
  audience = "staff",
}: {
  audience?: "staff" | "public";
  state: SearchState;
  counts: FacetCounts;
  /** Lowest/highest value of each numeric field across all schools; sets each slider's ends. */
  extents: Partial<Record<RangeField, { min: number; max: number }>>;
  onChange: (patch: Partial<SearchState>) => void;
}) {
  const staff = audience === "staff";
  const states = Object.keys(counts.state);
  const agencies = Object.keys(counts.agency);
  const program = (t: ProgramTag): "any" | "yes" | "no" =>
    state.yes.includes(t) ? "yes" : state.no.includes(t) ? "no" : "any";
  const setProgram = (t: ProgramTag, v: "any" | "yes" | "no") =>
    onChange({
      yes:
        v === "yes"
          ? [...state.yes.filter((x) => x !== t), t]
          : state.yes.filter((x) => x !== t),
      no:
        v === "no"
          ? [...state.no.filter((x) => x !== t), t]
          : state.no.filter((x) => x !== t),
    });
  const setRange = (f: RangeField, r: RangeFilter | null) => {
    const next = { ...state.ranges };
    if (r) next[f] = r;
    else delete next[f];
    onChange({ ranges: next });
  };
  const withCount = (
    o: string[],
    label: (v: string) => string,
    c: Record<string, number>,
  ): Option[] => o.map((v) => ({ value: v, label: label(v), count: c[v] }));

  return (
    <div>
      <Section title="Location">
        <p className="text-xs font-medium text-muted-foreground">Region</p>
        <CheckList
          idPrefix="region"
          options={withCount(
            [...REGIONS],
            (v) => REGION_NAMES[v as keyof typeof REGION_NAMES],
            counts.region,
          )}
          selected={state.region}
          onChange={(v) => onChange({ region: v as SearchState["region"] })}
        />
        <p className="pt-1 text-xs font-medium text-muted-foreground">
          Country
        </p>
        <CheckList
          idPrefix="country"
          options={withCount(
            ["US", "CA"],
            (v) => (v === "US" ? "United States" : "Canada"),
            counts.country,
          )}
          selected={state.country}
          onChange={(v) => onChange({ country: v as SearchState["country"] })}
        />
        <p className="pt-1 text-xs font-medium text-muted-foreground">
          State / province
        </p>
        <CheckList
          scroll
          idPrefix="state"
          options={withCount(states, (v) => STATES[v] ?? v, counts.state)}
          selected={state.state}
          onChange={(v) => onChange({ state: v })}
        />
      </Section>

      <Section title="School">
        <p className="text-xs font-medium text-muted-foreground">Type</p>
        <CheckList
          idPrefix="type"
          options={withCount(
            [...SCHOOL_TYPES],
            (v) => SCHOOL_TYPE_LABELS[v as keyof typeof SCHOOL_TYPE_LABELS],
            counts.type,
          )}
          selected={state.type}
          onChange={(v) => onChange({ type: v as SearchState["type"] })}
        />
        {staff && (
          <label className="flex items-center justify-between gap-2 pt-1 text-sm">
            Also show closed schools
            <Switch
              checked={
                state.listing.includes("closed") && state.listing.length === 3
              }
              onCheckedChange={(c) =>
                onChange({ listing: c ? ["open", "pending", "closed"] : [] })
              }
            />
          </label>
        )}
        {staff && (
          <>
            <p className="pt-1 text-xs font-medium text-muted-foreground">
              Listing status
            </p>
            <CheckList
              idPrefix="listing"
              options={withCount(
                [...LISTING_STATUSES],
                (v) => v[0].toUpperCase() + v.slice(1),
                counts.listing,
              )}
              selected={state.listing}
              onChange={(v) =>
                onChange({ listing: v as SearchState["listing"] })
              }
            />
            <p className="text-xs text-muted-foreground">
              Tick statuses to show only those. With nothing ticked, closed
              schools are hidden.
            </p>
            <p className="pt-1 text-xs font-medium text-muted-foreground">
              Membership
            </p>
            <CheckList
              idPrefix="status"
              options={withCount(
                Object.keys(MEMBERSHIP_LABELS),
                (v) => MEMBERSHIP_LABELS[v as keyof typeof MEMBERSHIP_LABELS],
                counts.status,
              )}
              selected={state.status}
              onChange={(v) => onChange({ status: v as SearchState["status"] })}
            />
            <p className="pt-1 text-xs font-medium text-muted-foreground">
              Profile status
            </p>
            <CheckList
              idPrefix="fresh"
              options={withCount(
                Object.keys(FRESHNESS_LABELS),
                (v) => FRESHNESS_LABELS[v as keyof typeof FRESHNESS_LABELS],
                counts.freshness,
              )}
              selected={state.freshness}
              onChange={(v) =>
                onChange({ freshness: v as SearchState["freshness"] })
              }
            />
          </>
        )}
      </Section>

      <Section title="Grades" hint="Pick one grade, or two for a range.">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={state.grade === null ? NONE : gradeLabel(state.grade)}
            onValueChange={(v) =>
              onChange(
                v === NONE
                  ? { grade: null, gradeTo: null }
                  : { grade: GRADES.find((g) => gradeLabel(g) === v) ?? null },
              )
            }
          >
            <SelectTrigger className="w-24" aria-label="From grade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Any</SelectItem>
              {GRADES.map((g) => (
                <SelectItem key={g} value={gradeLabel(g)}>
                  {gradeLabel(g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">to</span>
          <Select
            disabled={state.grade === null}
            value={state.gradeTo === null ? NONE : gradeLabel(state.gradeTo)}
            onValueChange={(v) =>
              onChange({
                gradeTo:
                  v === NONE
                    ? null
                    : (GRADES.find((g) => gradeLabel(g) === v) ?? null),
              })
            }
          >
            <SelectTrigger className="w-24" aria-label="To grade">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>—</SelectItem>
              {GRADES.map((g) => (
                <SelectItem key={g} value={gradeLabel(g)}>
                  {gradeLabel(g)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {state.gradeTo !== null && (
          <Select
            value={state.gradeMode}
            onValueChange={(v) =>
              onChange({ gradeMode: v as SearchState["gradeMode"] })
            }
          >
            <SelectTrigger className="w-full" aria-label="Grade match">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="covers">
                Serves every grade in the range
              </SelectItem>
              <SelectItem value="overlaps">
                Serves any grade in the range
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </Section>

      <Section title="Accreditation">
        <div
          role="radiogroup"
          aria-label="Accreditation"
          className="inline-flex gap-0.5 rounded-lg border bg-muted p-[3px]"
        >
          {(
            [
              [null, "Any"],
              ["yes", "Accredited"],
              ["no", "Not accredited"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={state.accredited === v}
              onClick={() => onChange({ accredited: v })}
              className={cn(
                "rounded-md border border-transparent px-2.5 py-1 text-[13px] font-medium text-muted-foreground transition-colors",
                state.accredited === v
                  ? "border-border bg-card text-foreground shadow-xs"
                  : "hover:text-foreground",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        {agencies.length > 0 && (
          <>
            <CheckList
              scroll
              idPrefix="agency"
              options={withCount(agencies, (v) => v, counts.agency)}
              selected={state.agency}
              onChange={(v) => onChange({ agency: v })}
            />
            {state.agency.length > 1 && (
              <label className="flex items-center justify-between gap-2 text-sm">
                Must have all selected{" "}
                <Switch
                  checked={state.agencyAll}
                  onCheckedChange={(c) => onChange({ agencyAll: c })}
                />
              </label>
            )}
          </>
        )}
      </Section>

      <Section title="Programs" hint="Yes = must have it. No = must not.">
        {PROGRAM_TAGS.map((t) => (
          <Tri
            key={t}
            label={PROGRAM_LABELS[t]}
            value={program(t)}
            onChange={(v) => setProgram(t, v)}
            count={counts.programs[t]}
          />
        ))}
      </Section>

      <Section title="Features">
        <CheckList
          scroll
          idPrefix="feature"
          options={withCount(
            [...FEATURES],
            (v) => FEATURE_LABELS[v as keyof typeof FEATURE_LABELS],
            counts.features,
          )}
          selected={state.features}
          onChange={(v) => onChange({ features: v as SearchState["features"] })}
        />
        {state.features.length > 1 && (
          <label className="flex items-center justify-between gap-2 text-sm">
            Any of these (instead of all){" "}
            <Switch
              checked={state.featuresAny}
              onCheckedChange={(c) => onChange({ featuresAny: c })}
            />
          </label>
        )}
      </Section>

      <Section
        title="Numbers"
        hint="Drag the ends to set a range. Schools missing a value are left out unless you include them."
      >
        <p className="text-xs font-medium text-muted-foreground">Students</p>
        <CheckList
          idPrefix="eb"
          options={withCount(
            [...ENROLLMENT_BANDS],
            (v) =>
              ENROLLMENT_BAND_LABELS[v as keyof typeof ENROLLMENT_BAND_LABELS],
            counts.enrollBand,
          )}
          selected={state.enrollBand}
          onChange={(v) =>
            onChange({ enrollBand: v as SearchState["enrollBand"] })
          }
        />
        {RANGE_FIELDS.filter(
          (f) => (staff || (f !== "retention" && f !== "salary")) && extents[f],
        ).map((f) => (
          <RangeRow
            key={f}
            field={f}
            extent={extents[f]!}
            value={state.ranges[f]}
            onChange={(r) => setRange(f, r)}
          />
        ))}
      </Section>

      <Section title="Schedule">
        <Tri
          label="Friday early release"
          value={
            state.fridayEarly === null
              ? "any"
              : state.fridayEarly
                ? "yes"
                : "no"
          }
          onChange={(v) =>
            onChange({ fridayEarly: v === "any" ? null : v === "yes" })
          }
        />
        <FirstDayPicker
          value={state.firstDay}
          onChange={(firstDay) => onChange({ firstDay })}
        />
        <StartTimeSelect
          label="School starts after"
          value={state.startAfter}
          onChange={(startAfter) => onChange({ startAfter })}
        />
        <StartTimeSelect
          label="School starts before"
          value={state.startBefore}
          onChange={(startBefore) => onChange({ startBefore })}
        />
      </Section>

      {staff && (
        <Section
          title="Data quality"
          hint="Staff only. Find profiles that need attention."
        >
          <CheckList
            idPrefix="dq"
            options={withCount(
              [...DQ_FLAGS],
              (v) => DQ_LABELS[v as keyof typeof DQ_LABELS],
              counts.dq,
            )}
            selected={state.dq}
            onChange={(v) => onChange({ dq: v as SearchState["dq"] })}
          />
          <p className="pt-1 text-xs font-medium text-muted-foreground">
            Section not verified in a year
          </p>
          <CheckList
            idPrefix="vs"
            options={withCount(
              [...PROFILE_SECTIONS],
              (v) => v[0].toUpperCase() + v.slice(1),
              counts.staleSection,
            )}
            selected={state.staleSection}
            onChange={(v) => onChange({ staleSection: v as ProfileSection[] })}
          />
        </Section>
      )}
    </div>
  );
}
