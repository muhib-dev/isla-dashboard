"use client";

import { useState, useTransition } from "react";
import { CircleCheckIcon, TicketPercentIcon } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { availOffer } from "@/features/offers/actions";
import type { PublicOffer } from "@/features/offers/queries";
import type { PublicClaim, Redemption } from "@/features/offers/schema";
import { Honeypot } from "@/features/schools/components/submission-forms";
import { cn } from "@/lib/utils";
import { FeaturedBadge, OfferPhaseDot, redeemWindow } from "./offer-bits";
import { OfferEmpty } from "./offer-empty";
import { OfferImage } from "./offer-image";
import { RedemptionSteps } from "./redemption-steps";

/** A signed-in school admin: the form is prefilled and claims are tied to their school. */
export type OfferViewer = {
  schoolName: string;
  contactName: string;
  contactEmail: string;
  /** Redemption steps for offers this school already claimed, by offer id. */
  claimed: Record<string, Redemption>;
};

export function PublicOfferList({
  offers,
  viewer,
}: {
  offers: PublicOffer[];
  viewer: OfferViewer | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  if (offers.length === 0) {
    return (
      <OfferEmpty
        icon={TicketPercentIcon}
        title="No offers right now"
        hint="Check back soon."
      />
    );
  }

  return (
    <>
      <div className="grid gap-6">
        {offers.map((offer, i) => {
          const claimed = viewer?.claimed[offer.id];
          return (
            <article
              key={offer.id}
              className={cn(
                "grid min-w-0 gap-6 rounded-lg border bg-card p-4 sm:p-6",
                offer.image && "md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]",
                offer.featured && "bg-highlight-subtle",
              )}
            >
              {offer.image && (
                <OfferImage
                  src={offer.image}
                  alt={`${offer.partner.name} offer flyer`}
                  sizes="(min-width: 768px) 300px, 100vw"
                  priority={i === 0}
                  className="mx-auto aspect-4/5 w-full max-w-sm"
                />
              )}
              <div className="flex min-w-0 flex-col">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-[15px] font-medium text-muted-foreground">
                    {offer.partner.name}
                  </p>
                  {offer.featured && <FeaturedBadge />}
                </div>
                <h2 className="mt-1 text-h3 font-semibold text-balance">
                  {offer.title}
                </h2>
                <p className="mt-3 text-pretty text-muted-foreground">
                  {offer.details || offer.summary}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p>
                    <span className="font-medium">Redeem by:</span>{" "}
                    <span className="tabular">{redeemWindow(offer)}</span>
                  </p>
                  <OfferPhaseDot
                    phase={offer.phase}
                    daysLeft={offer.daysLeft}
                    startsOn={offer.startsOn}
                  />
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-auto md:pt-6">
                  {claimed ? (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        setSelectedId(offer.id);
                        setOpen(true);
                      }}
                    >
                      <CircleCheckIcon /> Claimed · view steps
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      disabled={Boolean(offer.blocker)}
                      onClick={() => {
                        setSelectedId(offer.id);
                        setOpen(true);
                      }}
                    >
                      Avail this offer
                    </Button>
                  )}
                  {offer.blocker && !claimed && offer.phase !== "upcoming" && (
                    <span className="text-[15px] text-muted-foreground">
                      {offer.blocker}
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <AvailOfferDialog
        offer={offers.find((o) => o.id === selectedId) ?? null}
        viewer={viewer}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

function blankForm(viewer: OfferViewer | null): PublicClaim {
  return {
    schoolName: viewer?.schoolName ?? "",
    contactName: viewer?.contactName ?? "",
    contactEmail: viewer?.contactEmail ?? "",
    note: "",
    hp: "",
  };
}

/** Collects who the partner should contact, records the claim, then shows how to redeem. */
function AvailOfferDialog({
  offer,
  viewer,
  open,
  onOpenChange,
}: {
  offer: PublicOffer | null;
  viewer: OfferViewer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState<PublicClaim>(() => blankForm(viewer));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [redemption, setRedemption] = useState<Redemption | null>(null);
  const [pending, startTransition] = useTransition();

  // Reset whenever a different offer is opened.
  const [openedId, setOpenedId] = useState<string | null>(null);
  if (offer && offer.id !== openedId) {
    setOpenedId(offer.id);
    setValue(blankForm(viewer));
    setErrors({});
    setRedemption(null);
  }

  if (!offer) return null;
  const steps = redemption ?? viewer?.claimed[offer.id] ?? null;
  const set = (key: keyof PublicClaim) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValue((v) => ({ ...v, [key]: e.target.value }));

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!offer) return;
    startTransition(async () => {
      const result = await availOffer(offer.id, value);
      if (result.ok) {
        setRedemption(result.redemption);
        toast.success(`Offer claimed. ${offer.partner.name} will be in touch.`);
      } else {
        setErrors(result.fieldErrors ?? {});
        if (!result.fieldErrors) toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-balance">{offer.title}</DialogTitle>
          <DialogDescription>
            {offer.partner.name} · Redeem by {redeemWindow(offer)}
          </DialogDescription>
        </DialogHeader>

        {steps ? (
          <div className="grid gap-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <CircleCheckIcon className="size-4 text-success" />
              Claimed. Here’s how to redeem it.
            </p>
            <RedemptionSteps redemption={steps} offerTitle={offer.title} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="relative grid gap-4" noValidate>
            <Honeypot
              value={value.hp ?? ""}
              onChange={(hp) => setValue((v) => ({ ...v, hp }))}
            />
            {viewer ? (
              <p className="text-sm">
                Claiming for <span className="font-medium">{viewer.schoolName}</span>.
                It will show in your ISLA dashboard.
              </p>
            ) : (
              <Field
                id="avail-school"
                label="School or organization"
                error={errors.schoolName}
              >
                <Input
                  id="avail-school"
                  autoComplete="organization"
                  maxLength={120}
                  value={value.schoolName}
                  onChange={set("schoolName")}
                />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="avail-name" label="Your name" error={errors.contactName}>
                <Input
                  id="avail-name"
                  autoComplete="name"
                  maxLength={80}
                  value={value.contactName}
                  onChange={set("contactName")}
                />
              </Field>
              <Field id="avail-email" label="Email" error={errors.contactEmail}>
                <Input
                  id="avail-email"
                  type="email"
                  autoComplete="email"
                  value={value.contactEmail}
                  onChange={set("contactEmail")}
                />
              </Field>
            </div>
            <Field id="avail-note" label="Note to the partner (optional)" error={errors.note}>
              <Textarea
                id="avail-note"
                rows={3}
                maxLength={500}
                value={value.note}
                onChange={set("note")}
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              ISLA shares these details with {offer.partner.name} so they can
              follow up.
            </p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Claiming…" : "Avail this offer"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
