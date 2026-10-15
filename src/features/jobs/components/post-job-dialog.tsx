"use client";

import { useState, useTransition } from "react";
import { CircleAlertIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/shared/date-picker";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { postJob } from "@/features/jobs/actions";
import {
  JOB_CATEGORY_LABELS,
  JOB_DESCRIPTION_MAX,
  JOB_TYPE_LABELS,
  JobCurrencySchema,
  type NewJob,
} from "@/features/jobs/schema";
import { fmt } from "@/lib/format";
import { cn } from "@/lib/utils";

type FormValue = Omit<
  NewJob,
  "salaryMin" | "salaryMax" | "startDate" | "publish"
> & { salaryMin: string; salaryMax: string; startDate: string };

const EMPTY: FormValue = {
  title: "",
  category: "teaching",
  type: "full_time",
  startDate: "",
  currency: "USD",
  salaryMin: "",
  salaryMax: "",
  email: "",
  description: "",
  featured: false,
};

/** "New job" form in a right sheet. Save draft keeps it private; Publish puts it on the careers board. */
export function PostJobDialog({
  schoolId,
  schoolName,
  featuredCreditsLeft,
}: {
  schoolId: string;
  schoolName: string;
  /** Remaining featured credits this year, when known. */
  featuredCreditsLeft?: number;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState<FormValue>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();
  const [action, setAction] = useState<"draft" | "publish">("publish");
  const set = (patch: Partial<FormValue>) => setValue({ ...value, ...patch });
  const noCredits = featuredCreditsLeft === 0;

  function submit(publish: boolean) {
    setAction(publish ? "publish" : "draft");
    startTransition(async () => {
      const result = await postJob(schoolId, {
        ...value,
        featured: value.featured && !noCredits,
        publish,
      });
      if (result.ok) {
        toast.success(
          publish
            ? `“${value.title.trim()}” is live on the ISLA careers board`
            : "Draft saved",
        );
        setOpen(false);
        setValue(EMPTY);
        setErrors({});
      } else {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  const invalid = (key: string) => (errors[key]?.length ? true : undefined);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusIcon /> New job
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-150"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(true);
          }}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <SheetHeader className="gap-1 border-b px-6 py-5 pr-14">
            <SheetTitle className="text-h3 font-semibold">New job</SheetTitle>
            <SheetDescription className="text-[15px]">
              Saved as a draft until you publish it.
            </SheetDescription>
          </SheetHeader>
          <div className="grid flex-1 content-start gap-5 overflow-y-auto p-6">
            <Field id="title" label="Job title" required error={errors.title}>
              <Input
                id="title"
                autoFocus
                aria-required
                aria-invalid={invalid("title")}
                placeholder="e.g. Grade 4 Teacher"
                value={value.title}
                onChange={(e) => set({ title: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="category" label="Department">
                <Select
                  value={value.category}
                  onValueChange={(v) =>
                    set({ category: v as FormValue["category"] })
                  }
                >
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(JOB_CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="startDate" label="Start date" error={errors.startDate}>
                <DatePicker
                  id="startDate"
                  value={value.startDate}
                  onChange={(startDate) => set({ startDate })}
                  placeholder="Pick a date"
                />
              </Field>
            </div>
            <fieldset className="grid gap-1.5">
              <legend className="mb-1.5 text-[15px] font-medium">
                Employment type
              </legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(JOB_TYPE_LABELS).map(([key, label]) => (
                  <label
                    key={key}
                    className={cn(
                      "flex h-10 flex-auto cursor-pointer items-center gap-2.5 rounded-md border bg-card px-3 text-[15px] whitespace-nowrap transition-colors hover:bg-surface-2",
                      "has-checked:border-primary has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                    )}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={key}
                      checked={value.type === key}
                      onChange={() => set({ type: key as FormValue["type"] })}
                      className="size-4 accent-primary"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-1.5">
              <Label htmlFor="salaryMin" className="text-[15px] font-medium">
                Salary range
              </Label>
              <div className="grid grid-cols-[96px_1fr_1fr] gap-2">
                <Select
                  value={value.currency}
                  onValueChange={(v) =>
                    set({ currency: v as FormValue["currency"] })
                  }
                >
                  <SelectTrigger aria-label="Currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JobCurrencySchema.options.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="salaryMin"
                  inputMode="numeric"
                  placeholder="Minimum"
                  aria-label="Minimum salary"
                  aria-invalid={invalid("salaryMin")}
                  value={value.salaryMin}
                  onChange={(e) => set({ salaryMin: e.target.value })}
                />
                <Input
                  inputMode="numeric"
                  placeholder="Maximum"
                  aria-label="Maximum salary"
                  aria-invalid={invalid("salaryMax")}
                  value={value.salaryMax}
                  onChange={(e) => set({ salaryMax: e.target.value })}
                />
              </div>
              <FieldNote
                error={errors.salaryMin?.[0] ?? errors.salaryMax?.[0]}
                hint="Posts with a salary range get about twice as many applicants."
              />
            </div>
            <Field
              id="email"
              label="Application email"
              required
              error={errors.email}
            >
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-required
                aria-invalid={invalid("email")}
                placeholder="recruitment@school.org"
                value={value.email}
                onChange={(e) => set({ email: e.target.value })}
              />
            </Field>
            <div className="grid gap-1.5">
              <Label htmlFor="description" className="text-[15px] font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                rows={6}
                maxLength={JOB_DESCRIPTION_MAX}
                aria-invalid={invalid("description")}
                placeholder={`What the role involves, who you're looking for and why ${schoolName} is a good place to work.`}
                value={value.description}
                onChange={(e) => set({ description: e.target.value })}
              />
              <div className="flex justify-between gap-4 text-caption text-muted-foreground">
                <span>Markdown supported</span>
                <span className="tabular">
                  {fmt.number(value.description.length)} /{" "}
                  {fmt.number(JOB_DESCRIPTION_MAX)}
                </span>
              </div>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border bg-highlight-subtle px-4 py-3.5">
              <div className="grid gap-0.5">
                <Label htmlFor="featured" className="text-[15px] font-semibold">
                  Feature this post
                </Label>
                <p className="text-[13px] text-muted-foreground">
                  Pinned to the top of search for 14 days.{" "}
                  {featuredCreditsLeft === undefined
                    ? "Uses 1 featured credit."
                    : noCredits
                      ? "You've used all your featured credits this year."
                      : `Uses 1 of your ${featuredCreditsLeft} remaining ${featuredCreditsLeft === 1 ? "credit" : "credits"}.`}
                </p>
              </div>
              <Switch
                id="featured"
                className="mt-0.5"
                disabled={noCredits}
                checked={value.featured && !noCredits}
                onCheckedChange={(featured) => set({ featured })}
              />
            </div>
          </div>
          <SheetFooter className="flex-row items-center gap-2 border-t px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              className="mr-auto"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => submit(false)}
            >
              {pending && action === "draft" ? "Saving…" : "Save draft"}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && action === "publish" ? "Publishing…" : "Publish job"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function FieldNote({ error, hint }: { error?: string; hint: string }) {
  return error ? (
    <p className="flex items-center gap-1.5 text-caption font-medium text-destructive">
      <CircleAlertIcon className="size-3.5 shrink-0" aria-hidden />
      {error}
    </p>
  ) : (
    <p className="text-caption text-muted-foreground">{hint}</p>
  );
}
