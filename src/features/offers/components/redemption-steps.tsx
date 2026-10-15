"use client";

import { ArrowUpRightIcon, CopyIcon, MailIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Redemption } from "@/features/offers/schema";

/** How to redeem a claimed offer: the code, the partner email, or the partner link. */
export function RedemptionSteps({
  redemption,
  offerTitle,
}: {
  redemption: Redemption;
  offerTitle: string;
}) {
  const { method, code, email, url, instructions } = redemption;

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Couldn't copy. Select the code instead.");
    }
  }

  return (
    <div className="grid gap-4">
      {method === "code" && code && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-surface-2 px-4 py-3">
          <div>
            <p className="text-[13px] font-medium text-muted-foreground">Promo code</p>
            <p className="text-h4 font-semibold tracking-wider select-all">
              {code}
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            <CopyIcon /> Copy
          </Button>
        </div>
      )}
      {method === "email" && email && (
        <div className="rounded-lg border bg-surface-2 px-4 py-3">
          <p className="text-[13px] font-medium text-muted-foreground">Email the partner</p>
          <p className="font-medium break-all">{email}</p>
        </div>
      )}
      <p className="text-[15px] text-pretty">{instructions}</p>
      <div className="flex flex-wrap gap-2">
        {method === "email" && email && (
          <Button asChild>
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(`ISLA member offer: ${offerTitle}`)}`}
            >
              <MailIcon /> Write email
            </a>
          </Button>
        )}
        {url && (
          <Button asChild variant={method === "link" ? "default" : "outline"}>
            <a href={url} target="_blank" rel="noreferrer">
              Open partner site <ArrowUpRightIcon />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
