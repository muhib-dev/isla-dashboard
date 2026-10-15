"use client";

import { useState, useTransition } from "react";
import { CheckCircle2Icon, FlagIcon, PlusIcon } from "lucide-react";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  contactSchoolAction,
  submitNewSchoolAction,
  submitReportAction,
} from "@/features/schools/submission-actions";
import {
  REPORT_KIND_LABELS,
  REPORT_KINDS,
} from "@/features/schools/submissions";
import { SCHOOL_TYPE_LABELS, SCHOOL_TYPES } from "@/features/schools/schema";
import { gradeLabel } from "@/features/schools/search/grades";
import { STATES } from "@/features/schools/search/states";
import type { ActionResult } from "@/lib/validation";

const GRADES = [-2, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const STATE_OPTIONS = Object.entries(STATES).sort((a, b) =>
  a[1].localeCompare(b[1]),
);

/** Shared submit plumbing: pending flag, field errors, top-level error, success. */
function useSubmit(run: () => Promise<ActionResult>) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    start(async () => {
      setError(null);
      setErrors({});
      try {
        const r = await run();
        if (r.ok) setDone(true);
        else {
          setError(r.error);
          setErrors(r.fieldErrors ?? {});
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }
  const reset = () => {
    setDone(false);
    setError(null);
    setErrors({});
  };
  return { pending, errors, error, done, submit, reset };
}

/** Real users never see or tab to this; bots fill every input. */
export function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      aria-hidden
      className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
    >
      <label>
        Leave this empty
        <input
          tabIndex={-1}
          autoComplete="off"
          name="company_website"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}

function Success({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-lg bg-success/10 p-4 text-sm"
    >
      <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-success" />
      <div>{children}</div>
    </div>
  );
}

export function ContactSchoolForm({
  schoolId,
  schoolName,
}: {
  schoolId: string;
  schoolName: string;
}) {
  const [v, setV] = useState({ name: "", email: "", message: "", hp: "" });
  const set =
    (k: keyof typeof v) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setV((s) => ({ ...s, [k]: e.target.value }));
  const f = useSubmit(() => contactSchoolAction(schoolId, v));

  if (f.done)
    return (
      <Success>
        Message sent to {schoolName}. They’ll reply to {v.email}.
      </Success>
    );
  return (
    <form onSubmit={f.submit} className="relative grid gap-3" noValidate>
      <Honeypot value={v.hp} onChange={(hp) => setV((s) => ({ ...s, hp }))} />
      <Field id={`c-name-${schoolId}`} label="Your name" error={f.errors.name}>
        <Input
          id={`c-name-${schoolId}`}
          value={v.name}
          onChange={set("name")}
          autoComplete="name"
          maxLength={80}
        />
      </Field>
      <Field
        id={`c-email-${schoolId}`}
        label="Your email"
        error={f.errors.email}
      >
        <Input
          id={`c-email-${schoolId}`}
          type="email"
          value={v.email}
          onChange={set("email")}
          autoComplete="email"
          maxLength={120}
        />
      </Field>
      <Field id={`c-msg-${schoolId}`} label="Message" error={f.errors.message}>
        <Textarea
          id={`c-msg-${schoolId}`}
          rows={4}
          value={v.message}
          onChange={set("message")}
          maxLength={2000}
        />
      </Field>
      {f.error && (
        <p role="alert" className="text-sm text-destructive">
          {f.error}
        </p>
      )}
      <Button type="submit" disabled={f.pending}>
        {f.pending ? "Sending…" : "Send message"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Your message goes to the school. ISLA does not endorse, accredit or
        certify listed schools.
      </p>
    </form>
  );
}

function StateSelect({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: string[];
}) {
  return (
    <Field id={id} label="State / province" error={error}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {STATE_OPTIONS.map(([code, name]) => (
            <SelectItem key={code} value={code}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

const BLANK_SCHOOL = {
  name: "",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US" as "US" | "CA",
  phone: "",
  email: "",
  website: "",
  head: "",
  type: "standard" as (typeof SCHOOL_TYPES)[number],
  gradesFrom: "",
  gradesTo: "",
  founded: "",
  submitterEmail: "",
  hp: "",
};

export function AddSchoolDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(BLANK_SCHOOL);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));
  const f = useSubmit(() =>
    submitNewSchoolAction({
      ...v,
      founded: v.founded === "" ? undefined : v.founded,
    }),
  );
  const e = f.errors;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          f.reset();
          if (f.done) setV(BLANK_SCHOOL);
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <PlusIcon /> Add a school
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a school</DialogTitle>
          <DialogDescription>
            New schools appear on the map after ISLA staff review them.
          </DialogDescription>
        </DialogHeader>
        {f.done ? (
          <Success>
            Thanks. We’ll review “{v.name}” and add it to the map.
          </Success>
        ) : (
          <form onSubmit={f.submit} className="relative grid gap-3" noValidate>
            <Honeypot
              value={v.hp}
              onChange={(hp) => setV((s) => ({ ...s, hp }))}
            />
            <Field id="ns-name" label="School name" error={e.name}>
              <Input
                id="ns-name"
                value={v.name}
                onChange={set("name")}
                maxLength={120}
              />
            </Field>
            <Field id="ns-street" label="Street address" error={e.street}>
              <Input
                id="ns-street"
                value={v.street}
                onChange={set("street")}
                autoComplete="street-address"
                maxLength={120}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="ns-city" label="City" error={e.city}>
                <Input
                  id="ns-city"
                  value={v.city}
                  onChange={set("city")}
                  maxLength={80}
                />
              </Field>
              <StateSelect
                id="ns-state"
                value={v.state}
                onChange={(state) =>
                  setV((s) => ({
                    ...s,
                    state,
                    country: [
                      "AB",
                      "BC",
                      "MB",
                      "NB",
                      "NL",
                      "NS",
                      "NT",
                      "NU",
                      "ON",
                      "PE",
                      "QC",
                      "SK",
                      "YT",
                    ].includes(state)
                      ? "CA"
                      : "US",
                  }))
                }
                error={e.state}
              />
              <Field
                id="ns-zip"
                label={v.country === "CA" ? "Postal code" : "ZIP code"}
                error={e.postalCode}
              >
                <Input
                  id="ns-zip"
                  value={v.postalCode}
                  onChange={set("postalCode")}
                  autoComplete="postal-code"
                  maxLength={10}
                />
              </Field>
              <Field id="ns-type" label="School type">
                <Select
                  value={v.type}
                  onValueChange={(type) =>
                    setV((s) => ({ ...s, type: type as typeof s.type }))
                  }
                >
                  <SelectTrigger id="ns-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCHOOL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {SCHOOL_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="ns-from" label="Lowest grade" error={e.gradesFrom}>
                <Select
                  value={v.gradesFrom}
                  onValueChange={(g) => setV((s) => ({ ...s, gradesFrom: g }))}
                >
                  <SelectTrigger id="ns-from" className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={gradeLabel(g)}>
                        {gradeLabel(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="ns-to" label="Highest grade" error={e.gradesTo}>
                <Select
                  value={v.gradesTo}
                  onValueChange={(g) => setV((s) => ({ ...s, gradesTo: g }))}
                >
                  <SelectTrigger id="ns-to" className="w-full">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={gradeLabel(g)}>
                        {gradeLabel(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="ns-phone" label="School phone" error={e.phone}>
                <Input
                  id="ns-phone"
                  type="tel"
                  value={v.phone}
                  onChange={set("phone")}
                  autoComplete="tel"
                  maxLength={30}
                />
              </Field>
              <Field
                id="ns-email"
                label="General inquiry email"
                error={e.email}
              >
                <Input
                  id="ns-email"
                  type="email"
                  value={v.email}
                  onChange={set("email")}
                  maxLength={120}
                />
              </Field>
              <Field id="ns-web" label="Website (optional)" error={e.website}>
                <Input
                  id="ns-web"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  value={v.website}
                  onChange={set("website")}
                  maxLength={200}
                />
              </Field>
              <Field
                id="ns-head"
                label="Head of school (optional)"
                error={e.head}
              >
                <Input
                  id="ns-head"
                  value={v.head}
                  onChange={set("head")}
                  maxLength={80}
                />
              </Field>
              <Field
                id="ns-founded"
                label="Year founded (optional)"
                error={e.founded}
              >
                <Input
                  id="ns-founded"
                  inputMode="numeric"
                  value={v.founded}
                  onChange={set("founded")}
                  maxLength={4}
                />
              </Field>
              <Field
                id="ns-sub"
                label="Your email"
                hint="So we can follow up. Not shown publicly."
                error={e.submitterEmail}
              >
                <Input
                  id="ns-sub"
                  type="email"
                  value={v.submitterEmail}
                  onChange={set("submitterEmail")}
                  maxLength={120}
                />
              </Field>
            </div>
            {f.error && (
              <p role="alert" className="text-sm text-destructive">
                {f.error}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={f.pending}>
                {f.pending ? "Submitting…" : "Submit for review"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ReportSchoolDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const BLANK = {
    kind: "missing" as (typeof REPORT_KINDS)[number],
    schoolName: "",
    city: "",
    state: "",
    note: "",
    submitterEmail: "",
    hp: "",
  };
  const [v, setV] = useState(BLANK);
  const set =
    (k: keyof typeof v) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setV((s) => ({ ...s, [k]: e.target.value }));
  const f = useSubmit(() => submitReportAction(v));
  const e = f.errors;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          f.reset();
          if (f.done) setV(BLANK);
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <FlagIcon /> Report a school
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Report a school</DialogTitle>
          <DialogDescription>
            Closed, opened, merged or missing? Tell us and staff will check it.
            Reports never change the map by themselves.
          </DialogDescription>
        </DialogHeader>
        {f.done ? (
          <Success>
            Thanks, we’ve got your report and will look into it.
          </Success>
        ) : (
          <form onSubmit={f.submit} className="relative grid gap-3" noValidate>
            <Honeypot
              value={v.hp}
              onChange={(hp) => setV((s) => ({ ...s, hp }))}
            />
            <Field id="rp-kind" label="What happened?">
              <Select
                value={v.kind}
                onValueChange={(kind) =>
                  setV((s) => ({ ...s, kind: kind as typeof s.kind }))
                }
              >
                <SelectTrigger id="rp-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {REPORT_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="rp-name" label="School name" error={e.schoolName}>
              <Input
                id="rp-name"
                value={v.schoolName}
                onChange={set("schoolName")}
                maxLength={120}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="rp-city" label="City" error={e.city}>
                <Input
                  id="rp-city"
                  value={v.city}
                  onChange={set("city")}
                  maxLength={80}
                />
              </Field>
              <StateSelect
                id="rp-state"
                value={v.state}
                onChange={(state) => setV((s) => ({ ...s, state }))}
                error={e.state}
              />
            </div>
            <Field id="rp-note" label="Details (optional)" error={e.note}>
              <Textarea
                id="rp-note"
                rows={3}
                value={v.note}
                onChange={set("note")}
                maxLength={1000}
              />
            </Field>
            <Field
              id="rp-email"
              label="Your email (optional)"
              error={e.submitterEmail}
            >
              <Input
                id="rp-email"
                type="email"
                value={v.submitterEmail}
                onChange={set("submitterEmail")}
                maxLength={120}
              />
            </Field>
            {f.error && (
              <p role="alert" className="text-sm text-destructive">
                {f.error}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={f.pending}>
                {f.pending ? "Sending…" : "Send report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
