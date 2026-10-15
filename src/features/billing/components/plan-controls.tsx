"use client";

import { useOptimistic, useState, useTransition } from "react";
import { DownloadIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { payInvoices, setAutoRenew } from "@/features/billing/actions";
import { fmt } from "@/lib/format";

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
  icon,
}: {
  label: string;
  message: string;
  icon?: React.ReactNode;
}) {
  return (
    <Button variant="outline" onClick={() => toast.info(message)}>
      {icon}
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

type PayableInvoice = { id: string; number: string; amount: number };

/** Pays one or more invoices with the card on file, after a confirm step. */
export function PayInvoicesButton({
  schoolId,
  invoices,
  card,
  children,
  ...buttonProps
}: {
  schoolId: string;
  invoices: PayableInvoice[];
  card: { brand: string; last4: string } | null;
  children: React.ReactNode;
} & Pick<
  React.ComponentProps<typeof Button>,
  "variant" | "size" | "className"
>) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const total = invoices.reduce((n, i) => n + i.amount, 0);
  const many = invoices.length > 1;

  function pay() {
    startTransition(async () => {
      const result = await payInvoices(
        schoolId,
        invoices.map((i) => i.id),
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(
        `Paid ${fmt.currency(result.amount)}${result.count > 1 ? ` for ${result.count} invoices` : ""}. A receipt is on its way.`,
      );
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button {...buttonProps}>{children}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-h3 font-semibold">
            Pay {fmt.currency(total)}?
          </DialogTitle>
          <DialogDescription className="text-[15px]">
            {card
              ? `${card.brand} ending ${card.last4} will be charged ${many ? `for ${invoices.length} invoices` : `for ${invoices[0]?.number}`}.`
              : "There is no card on file. Add one under Payment methods first."}
          </DialogDescription>
        </DialogHeader>
        {many && (
          <ul className="tabular divide-y rounded-lg border text-[15px]">
            {invoices.map((i) => (
              <li key={i.id} className="flex justify-between gap-4 px-4 py-2.5">
                <span className="font-medium">{i.number}</span>
                <span>{fmt.currency(i.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={pay} disabled={pending || !card}>
            {pending && <Loader2Icon className="animate-spin" />}
            {pending ? "Paying…" : `Pay ${fmt.currency(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
