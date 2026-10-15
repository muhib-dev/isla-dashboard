"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
        <SchoolCombobox
          schools={schools}
          value={value.school}
          onChange={(v) => update("school", v)}
        />
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
          className="col-span-2 h-10 w-full justify-between font-normal sm:w-auto sm:min-w-48"
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
