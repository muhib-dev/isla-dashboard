"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SIZE_BAND_LABELS,
  SIZE_BANDS,
  type PeerFilter,
} from "@/features/analytics/schema";
import { REGION_LABELS, REGIONS } from "@/features/schools/schema";

export function PeerFilterControls({
  value,
  schools,
}: {
  value: PeerFilter & { school?: string };
  /** When given (ISLA staff), adds a school picker. */
  schools?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: string, next: string) {
    const search = new URLSearchParams(params);
    search.set(key, next);
    startTransition(() =>
      router.replace(`${pathname}?${search}`, { scroll: false }),
    );
  }

  return (
    <div
      className="grid grid-cols-2 items-center gap-2 data-pending:opacity-70 sm:flex sm:flex-wrap"
      data-pending={pending || undefined}
    >
      {schools && (
        <Select
          value={value.school ?? ""}
          onValueChange={(v) => update("school", v)}
        >
          <SelectTrigger className="col-span-2 w-full sm:w-auto sm:min-w-48" aria-label="School">
            <SelectValue placeholder="Choose a school" />
          </SelectTrigger>
          <SelectContent>
            {schools.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <span className="col-span-2 text-sm text-muted-foreground">compared with</span>
      <Select value={value.region} onValueChange={(v) => update("region", v)}>
        <SelectTrigger className="w-full sm:w-auto sm:min-w-36" aria-label="Peer region">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All regions</SelectItem>
          {REGIONS.map((r) => (
            <SelectItem key={r} value={r}>
              {REGION_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.size} onValueChange={(v) => update("size", v)}>
        <SelectTrigger className="w-full sm:w-auto sm:min-w-40" aria-label="Peer school size">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SIZE_BANDS.map((band) => (
            <SelectItem key={band} value={band}>
              {SIZE_BAND_LABELS[band]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
