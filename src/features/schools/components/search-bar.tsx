"use client"

import { useEffect, useId, useRef, useState } from "react"
import { MapPinIcon, SearchIcon, XIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { lookupPlaceAction } from "@/features/schools/geo-actions"
import { lookupCode, loadPlaceIndex } from "@/features/schools/search/geo-client"
import { parseCode, suggestPlaces, placeLabel, type PlaceIndex } from "@/features/schools/search/gazetteer"
import type { Center } from "@/features/schools/search"

type Suggestion = { id: string; label: string; resolve: () => Promise<Center | null> }

/**
 * Search box with "schools near …" suggestions from the offline ZIP/city lists.
 * Plain typing still searches names; picking a suggestion sets a radius center instead.
 * Nominatim is only asked on an explicit click (their policy forbids autocomplete).
 */
export function SearchBar({
  value,
  onChange,
  onClear,
  onPlace,
  allowLookup,
  inputProps,
}: {
  value: string
  onChange: (v: string) => void
  onClear: () => void
  onPlace: (c: Center) => void
  /** Offer the "look up on the map" fallback only when the text matched no school. */
  allowLookup: boolean
  inputProps?: React.ComponentProps<typeof Input>
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [items, setItems] = useState<Suggestion[]>([])
  const [index, setIndex] = useState<PlaceIndex | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  useEffect(() => {
    const text = value.trim()
    const run = ++seq.current
    const id = setTimeout(async () => {
      let next: Suggestion[] = []
      if (text.length < 2 || text.includes(":") || text.includes('"')) {
        // Operators and one-letter input aren't place searches.
      } else if (parseCode(text)) {
        const hit = await lookupCode(text).catch(() => null)
        if (hit) next = [{ id: `code:${text}`, label: `Schools near ${hit.label}`, resolve: async () => ({ lat: hit.lat, lng: hit.lng, label: hit.label }) }]
      } else if (index) {
        next = suggestPlaces(text, index).map((p) => ({ id: `place:${placeLabel(p)}`, label: `Schools near ${placeLabel(p)}`, resolve: async () => ({ lat: p.lat, lng: p.lng, label: placeLabel(p) }) }))
        if (!next.length && allowLookup && text.length >= 3) {
          next = [{
            id: "lookup",
            label: `Look up “${text}” on the map`,
            resolve: async () => {
              const r = await lookupPlaceAction(text)
              if (r.ok) return { lat: r.lat, lng: r.lng, label: r.label }
              setError(r.reason === "unavailable" ? "Place lookup isn’t set up on this server." : r.reason === "not_found" ? `Couldn’t find “${text}”.` : "Place lookup failed. Try again in a moment.")
              return null
            },
          }]
        }
      }
      if (run === seq.current) { setItems(next); setActive(-1) }
    }, 160)
    return () => clearTimeout(id)
  }, [value, index, allowLookup])

  async function pick(s: Suggestion) {
    setBusy(true)
    setError(null)
    try {
      const c = await s.resolve()
      if (c) { onPlace(c); setOpen(false); setItems([]) }
    } finally {
      setBusy(false)
    }
  }

  const showList = open && (items.length > 0 || !!error)
  return (
    <div className="relative w-full sm:w-80">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        {...inputProps}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setError(null) }}
        onFocus={() => { setOpen(true); if (!index) loadPlaceIndex().then(setIndex).catch(() => {}) }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && items.length) { e.preventDefault(); setOpen(true); setActive((a) => (a + 1) % items.length) }
          else if (e.key === "ArrowUp" && items.length) { e.preventDefault(); setActive((a) => (a <= 0 ? items.length - 1 : a - 1)) }
          else if (e.key === "Enter" && active >= 0 && items[active]) { e.preventDefault(); void pick(items[active]) }
          else if (e.key === "Escape") setOpen(false)
        }}
        className="pr-8 pl-8"
      />
      {value && (
        <button type="button" className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search" onClick={onClear}>
          <XIcon className="size-4" />
        </button>
      )}
      {showList && (
        <ul id={listId} role="listbox" className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-lg bg-popover py-1 text-sm shadow-md ring-1 ring-foreground/10">
          {items.map((s, i) => (
            <li key={s.id} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
              <button
                type="button"
                tabIndex={-1}
                disabled={busy}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void pick(s)}
                className={cn("flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted", i === active && "bg-muted")}
              >
                <MapPinIcon className="size-4 shrink-0 text-muted-foreground" /> {busy && i === active ? "Looking up…" : s.label}
              </button>
            </li>
          ))}
          {error && <li role="status" className="px-3 py-2 text-muted-foreground">{error}</li>}
        </ul>
      )}
    </div>
  )
}
