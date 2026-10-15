"use client";

import Link from "next/link";
import {
  AlertCircleIcon,
  BellIcon,
  FlagIcon,
  ReceiptIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const KIND = {
  overdue: [AlertCircleIcon, "text-destructive"],
  grace: [TriangleAlertIcon, "text-warning"],
  due: [ReceiptIcon, "text-warning"],
  report: [FlagIcon, "text-info"],
} as const;

export type Notice = {
  id: string;
  kind: keyof typeof KIND;
  title: string;
  sub: string;
  href: string;
};

/** Topbar bell: a dot when anything needs attention, list in a popover. */
export function Notifications({ notices }: { notices: Notice[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            notices.length
              ? `Notifications (${notices.length})`
              : "Notifications"
          }
          className="relative size-9 text-muted-foreground hover:text-foreground"
        >
          <BellIcon className="size-5" />
          {notices.length > 0 && (
            <span
              className="absolute top-[7px] right-2 size-2 rounded-full bg-destructive shadow-[0_0_0_2px_var(--card)]"
              aria-hidden
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <p className="border-b px-4 py-3 text-[15px] font-semibold">
          Notifications
        </p>
        {notices.length === 0 ? (
          <p className="px-4 py-6 text-center text-[15px] text-muted-foreground">
            You&apos;re all caught up.
          </p>
        ) : (
          <ul>
            {notices.map((n) => {
              const [Icon, tone] = KIND[n.kind];
              return (
                <li key={n.id} className="border-b last:border-b-0">
                  <Link
                    href={n.href}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full bg-surface-2",
                        tone,
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium">
                        {n.title}
                      </span>
                      <span className="block text-[13px] text-muted-foreground">
                        {n.sub}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
