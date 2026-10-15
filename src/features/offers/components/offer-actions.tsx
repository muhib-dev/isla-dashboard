"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  EyeIcon,
  MoreHorizontalIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  SendIcon,
  StarIcon,
  StarOffIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { patchOffer, setClaimStatus } from "@/features/offers/actions";
import type { ClaimStatus, Offer } from "@/features/offers/schema";
import { OfferFormSheet } from "./offer-form-sheet";

/** Row menu for the staff offers table: view, edit, publish/pause, feature. */
export function OfferRowActions({
  offer,
  showView = true,
}: {
  offer: Offer;
  showView?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function patch(change: Parameters<typeof patchOffer>[1], message: string) {
    startTransition(async () => {
      const result = await patchOffer(offer.id, change);
      if (result.ok) toast.success(message);
      else toast.error(result.error);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${offer.title}`}
            disabled={pending}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {showView && (
            <DropdownMenuItem asChild>
              <Link href={`/offers/${offer.id}`}>
                <EyeIcon /> View claims
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setEditing(true)}>
            <PencilIcon /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {offer.status === "draft" && (
            <DropdownMenuItem
              onSelect={() => patch({ status: "active" }, "Offer published")}
            >
              <SendIcon /> Publish
            </DropdownMenuItem>
          )}
          {offer.status === "active" && (
            <DropdownMenuItem
              onSelect={() =>
                patch({ status: "paused" }, "Offer paused. Schools no longer see it.")
              }
            >
              <PauseIcon /> Pause
            </DropdownMenuItem>
          )}
          {offer.status === "paused" && (
            <DropdownMenuItem
              onSelect={() => patch({ status: "active" }, "Offer resumed")}
            >
              <PlayIcon /> Resume
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onSelect={() =>
              patch(
                { featured: !offer.featured },
                offer.featured ? "Removed from featured" : "Offer featured",
              )
            }
          >
            {offer.featured ? <StarOffIcon /> : <StarIcon />}
            {offer.featured ? "Unfeature" : "Feature"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <OfferFormSheet offer={offer} open={editing} onOpenChange={setEditing} />
    </>
  );
}

export function EditOfferButton({ offer }: { offer: Offer }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <PencilIcon /> Edit offer
      </Button>
      <OfferFormSheet offer={offer} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ClaimStatusButton({
  claimId,
  status,
}: {
  claimId: string;
  status: ClaimStatus;
}) {
  const [pending, startTransition] = useTransition();
  const next: ClaimStatus = status === "claimed" ? "redeemed" : "claimed";
  return (
    <Button
      variant={status === "claimed" ? "outline" : "ghost"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setClaimStatus(claimId, next);
          if (result.ok)
            toast.success(
              next === "redeemed" ? "Marked as redeemed" : "Marked as not redeemed",
            );
          else toast.error(result.error);
        })
      }
    >
      {status === "claimed" ? "Mark redeemed" : "Undo"}
    </Button>
  );
}
