"use client";

import { ClockIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const pad = (n: number) => String(n).padStart(2, "0");

function parse(value: string) {
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || h === undefined || m === undefined)
    return null;
  return { hour: h % 12 === 0 ? 12 : h % 12, minute: m, pm: h >= 12 };
}

function build(hour: number, minute: number, pm: boolean) {
  return `${pad((hour % 12) + (pm ? 12 : 0))}:${pad(minute)}`;
}

type TimePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function TimePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a time",
}: TimePickerProps) {
  const t = parse(value);
  const current = t ?? { hour: 8, minute: 0, pm: false };
  const emit = (patch: Partial<typeof current>) => {
    const n = { ...current, ...patch };
    onChange(build(n.hour, n.minute, n.pm));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start font-normal",
            !t && "text-muted-foreground",
          )}
        >
          <ClockIcon />
          {t ? `${t.hour}:${pad(t.minute)} ${t.pm ? "PM" : "AM"}` : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto gap-2 p-3" align="start">
        <Select
          value={String(current.hour)}
          onValueChange={(v) => emit({ hour: Number(v) })}
        >
          <SelectTrigger aria-label="Hour" className="w-18">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h} value={String(h)}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(current.minute)}
          onValueChange={(v) => emit({ minute: Number(v) })}
        >
          <SelectTrigger aria-label="Minute" className="w-18">
            <SelectValue>{pad(current.minute)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {pad(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={current.pm ? "pm" : "am"}
          onValueChange={(v) => emit({ pm: v === "pm" })}
        >
          <SelectTrigger aria-label="AM or PM" className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="am">AM</SelectItem>
            <SelectItem value="pm">PM</SelectItem>
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  );
}
