"use client";

import { useOptimistic, useTransition } from "react";
import { DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { setAutoRenew } from "@/features/billing/actions";

export function AutoRenewSwitch({
  schoolId,
  checked,
}: {
  schoolId: string;
  checked: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [, startTransition] = useTransition();
  return (
    <Switch
      id="autoRenew"
      checked={optimistic}
      onCheckedChange={(next) =>
        startTransition(async () => {
          setOptimistic(next);
          const result = await setAutoRenew(schoolId, next);
          if (result.ok)
            toast.success(
              next ? "Auto-renew turned on" : "Auto-renew turned off",
            );
          else toast.error(result.error);
        })
      }
    />
  );
}

/** Card updates and PDFs come from the payment provider once connected. */
export function PaymentProviderButton({
  label,
  message,
}: {
  label: string;
  message: string;
}) {
  return (
    <Button variant="outline" onClick={() => toast.info(message)}>
      {label}
    </Button>
  );
}

export function InvoiceDownloadButton({ number }: { number: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Download invoice ${number}`}
      onClick={() =>
        toast.info(
          `Invoice ${number} will download as a PDF once billing is connected.`,
        )
      }
    >
      <DownloadIcon />
    </Button>
  );
}
