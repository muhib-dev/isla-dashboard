"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

function parse(value: string): Date | undefined {
  const [y, m, d] = value.split("-").map(Number)
  return y && m && d ? new Date(y, m - 1, d) : undefined
}

function format(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

type DatePickerProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function DatePicker({ id, value, onChange, placeholder = "Pick a date" }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const date = parse(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}
        >
          <CalendarIcon />
          {date ? date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          captionLayout="dropdown"
          onSelect={(d) => {
            if (d) onChange(format(d))
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
