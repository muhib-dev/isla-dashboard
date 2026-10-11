"use client"

import { useEffect, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { REGION_LABELS, REGIONS } from "@/features/schools/schema"

const ALL = "all"

const FILTERS = [
  {
    key: "region",
    label: "All regions",
    options: REGIONS.map((r) => [r, REGION_LABELS[r]] as const),
  },
  {
    key: "status",
    label: "Any membership",
    options: [
      ["active", "Active"],
      ["grace", "Grace period"],
      ["lapsed", "Lapsed"],
      ["non_member", "Not a member"],
    ] as const,
  },
  {
    key: "freshness",
    label: "Any profile status",
    options: [
      ["fresh", "Up to date"],
      ["aging", "Review soon"],
      ["stale", "Out of date"],
    ] as const,
  },
] as const

export function SchoolFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [q, setQ] = useState(params.get("q") ?? "")

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value && value !== ALL) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }))
  }

  useEffect(() => {
    if (q === (params.get("q") ?? "")) return
    const id = setTimeout(() => update("q", q), 250)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on q only
  }, [q])

  return (
    <div className="flex flex-wrap items-center gap-2" data-pending={pending || undefined}>
      <div className="relative w-full sm:w-64">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or city"
          className="pl-8"
          aria-label="Search schools"
        />
      </div>
      {FILTERS.map((filter) => (
        <Select key={filter.key} value={params.get(filter.key) ?? ALL} onValueChange={(v) => update(filter.key, v)}>
          <SelectTrigger className="w-auto min-w-36" aria-label={filter.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{filter.label}</SelectItem>
            {filter.options.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}
