"use client";

import { useId, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronsUpDownIcon, UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const id = useId();

  function update(key: string, next: string) {
    const search = new URLSearchParams(params);
    search.set(key, next);
    startTransition(() =>
      router.replace(`${pathname}?${search}`, { scroll: false }),
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 data-pending:opacity-70"
      data-pending={pending || undefined}
    >
      {schools && (
        <SchoolCombobox
          schools={schools}
          value={value.school}
          onChange={(v) => update("school", v)}
        />
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">
            <UsersIcon className="size-4.5" aria-hidden />
            Edit peer group
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-4 p-4">
          <div className="space-y-0.5">
            <p className="font-semibold">Peer group</p>
            <p className="text-caption text-muted-foreground">
              The schools these numbers are compared with.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-region`}>Region</Label>
            <Select value={value.region} onValueChange={(v) => update("region", v)}>
              <SelectTrigger id={`${id}-region`} className="w-full" aria-label="Peer region">
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-size`}>School size</Label>
            <Select value={value.size} onValueChange={(v) => update("size", v)}>
              <SelectTrigger id={`${id}-size`} className="w-full" aria-label="Peer school size">
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
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SchoolCombobox({
  schools,
  value,
  onChange,
}: {
  schools: { id: string; name: string }[];
  value?: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = schools.find((s) => s.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="School"
          className="w-40 justify-between font-normal sm:w-60"
        >
          <span className={selected ? "truncate" : "truncate text-muted-foreground"}>
            {selected?.name ?? "Choose a school"}
          </span>
          <ChevronsUpDownIcon className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0" align="start">
        <Command
          filter={(_, search, keywords) =>
            keywords?.join(" ").toLowerCase().includes(search.toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Search schools…" />
          <CommandList>
            <CommandEmpty>No school found.</CommandEmpty>
            {schools.map((s) => (
              <CommandItem
                key={s.id}
                value={s.id}
                keywords={[s.name]}
                data-checked={s.id === value}
                onSelect={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
              >
                <span className="truncate">{s.name}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
