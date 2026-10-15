"use client";

import { useState, useTransition } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { DatePicker } from "@/components/shared/date-picker";
import { Field, ToggleRow } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { saveOffer } from "@/features/offers/actions";
import {
  OFFER_CATEGORY_LABELS,
  REDEMPTION_LABELS,
  inputFromOffer,
  type Offer,
  type OfferInput,
} from "@/features/offers/schema";

const VALUE_KIND_LABELS: Record<OfferInput["valueKind"], string> = {
  amount: "Dollar amount off",
  percent: "Percent off",
  free: "Free",
  perk: "Perk or member rate",
};

const EMPTY: OfferInput = {
  partnerName: "",
  partnerWebsite: "",
  title: "",
  summary: "",
  details: "",
  image: "",
  category: "pd_training",
  valueKind: "amount",
  valueLabel: "",
  method: "link",
  code: "",
  email: "",
  url: "",
  instructions: "",
  startsOn: "",
  endsOn: "",
  membersOnly: false,
  featured: false,
};

/** Create (no `offer`) or edit an offer. Controlled so table row menus can open it. */
export function OfferFormSheet({
  offer,
  open,
  onOpenChange,
}: {
  offer?: Offer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState<OfferInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  // Load the offer each time the sheet opens.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(offer ? inputFromOffer(offer) : EMPTY);
      setErrors({});
    }
  }

  const set = <K extends keyof OfferInput>(key: K, v: OfferInput[K]) =>
    setValue((prev) => ({ ...prev, [key]: v }));

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveOffer(offer?.id ?? null, value);
      if (result.ok) {
        toast.success(
          offer ? "Offer saved" : "Offer saved as a draft. Publish it when it's ready.",
        );
        onOpenChange(false);
      } else {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[600px]">
        <form onSubmit={onSubmit} className="flex h-full flex-col">
          <SheetHeader className="border-b px-6 py-4 pr-12">
            <SheetTitle className="text-h4 font-semibold">{offer ? "Edit offer" : "New partner offer"}</SheetTitle>
            <SheetDescription>
              {offer
                ? "Changes show to schools right away."
                : "Saved as a draft. Schools see it once you publish."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <section className="grid gap-4 sm:grid-cols-2">
              <Field id="partnerName" label="Partner" error={errors.partnerName}>
                <Input
                  id="partnerName"
                  placeholder="e.g. WISER USA"
                  value={value.partnerName}
                  onChange={(e) => set("partnerName", e.target.value)}
                />
              </Field>
              <Field
                id="partnerWebsite"
                label="Partner website"
                error={errors.partnerWebsite}
              >
                <Input
                  id="partnerWebsite"
                  type="url"
                  placeholder="https://"
                  value={value.partnerWebsite}
                  onChange={(e) => set("partnerWebsite", e.target.value)}
                />
              </Field>
            </section>

            <Separator />

            <section className="grid gap-4">
              <Field id="title" label="Offer title" error={errors.title}>
                <Input
                  id="title"
                  placeholder="e.g. $100 off weekend school training"
                  value={value.title}
                  onChange={(e) => set("title", e.target.value)}
                />
              </Field>
              <Field
                id="summary"
                label="Summary"
                hint="One or two sentences shown on the offer card."
                error={errors.summary}
              >
                <Textarea
                  id="summary"
                  rows={2}
                  value={value.summary}
                  onChange={(e) => set("summary", e.target.value)}
                />
              </Field>
              <Field
                id="details"
                label="Full description"
                hint="Shown on the public Promotions page."
                error={errors.details}
              >
                <Textarea
                  id="details"
                  rows={5}
                  value={value.details}
                  onChange={(e) => set("details", e.target.value)}
                />
              </Field>
              <Field
                id="image"
                label="Flyer image URL (optional)"
                hint="Upload to the theisla.org media library and paste the link."
                error={errors.image}
              >
                <Input
                  id="image"
                  type="url"
                  placeholder="https://theisla.org/wp-content/uploads/…"
                  value={value.image}
                  onChange={(e) => set("image", e.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="category" label="Category">
                  <Select
                    value={value.category}
                    onValueChange={(v) =>
                      set("category", v as OfferInput["category"])
                    }
                  >
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OFFER_CATEGORY_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field id="valueKind" label="Offer type">
                  <Select
                    value={value.valueKind}
                    onValueChange={(v) =>
                      set("valueKind", v as OfferInput["valueKind"])
                    }
                  >
                    <SelectTrigger id="valueKind" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VALUE_KIND_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  id="valueLabel"
                  label="Value label"
                  error={errors.valueLabel}
                >
                  <Input
                    id="valueLabel"
                    placeholder="$100 off"
                    value={value.valueLabel}
                    onChange={(e) => set("valueLabel", e.target.value)}
                  />
                </Field>
              </div>
            </section>

            <Separator />

            <section className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="method" label="How schools redeem">
                  <Select
                    value={value.method}
                    onValueChange={(v) => set("method", v as OfferInput["method"])}
                  >
                    <SelectTrigger id="method" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(REDEMPTION_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                {value.method === "code" && (
                  <Field
                    id="code"
                    label="Promo code"
                    hint="Shown only after a school claims."
                    error={errors.code}
                  >
                    <Input
                      id="code"
                      className="tracking-wider uppercase"
                      value={value.code}
                      onChange={(e) => set("code", e.target.value.toUpperCase())}
                    />
                  </Field>
                )}
                {value.method === "email" && (
                  <Field id="email" label="Partner email" error={errors.email}>
                    <Input
                      id="email"
                      type="email"
                      value={value.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </Field>
                )}
              </div>
              <Field
                id="url"
                label={
                  value.method === "link"
                    ? "Redemption link"
                    : "Redemption link (optional)"
                }
                error={errors.url}
              >
                <Input
                  id="url"
                  type="url"
                  placeholder="https://"
                  value={value.url}
                  onChange={(e) => set("url", e.target.value)}
                />
              </Field>
              <Field
                id="instructions"
                label="Redemption steps"
                hint="What the school should do after claiming."
                error={errors.instructions}
              >
                <Textarea
                  id="instructions"
                  rows={3}
                  value={value.instructions}
                  onChange={(e) => set("instructions", e.target.value)}
                />
              </Field>
            </section>

            <Separator />

            <section className="grid gap-4 sm:grid-cols-2">
              <Field id="startsOn" label="Redeem from" error={errors.startsOn}>
                <DatePicker
                  id="startsOn"
                  value={value.startsOn}
                  onChange={(v) => set("startsOn", v)}
                />
              </Field>
              <Field id="endsOn" label="Redeem until" error={errors.endsOn}>
                <DatePicker
                  id="endsOn"
                  value={value.endsOn}
                  onChange={(v) => set("endsOn", v)}
                />
              </Field>
            </section>

            <div className="divide-y">
              <ToggleRow
                id="membersOnly"
                label="Members only"
                description="Only schools with an active ISLA membership can claim."
              >
                <Switch
                  id="membersOnly"
                  checked={value.membersOnly}
                  onCheckedChange={(v) => set("membersOnly", v)}
                />
              </ToggleRow>
              <ToggleRow
                id="featured"
                label="Featured"
                description="Pinned first in the catalog and on school home pages."
              >
                <Switch
                  id="featured"
                  checked={value.featured}
                  onCheckedChange={(v) => set("featured", v)}
                />
              </ToggleRow>
            </div>
          </div>

          <SheetFooter className="flex-row justify-between border-t px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : offer ? "Save" : "Save draft"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function NewOfferButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon /> New offer
      </Button>
      <OfferFormSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
