"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { ArrowDownUpIcon, BookmarkIcon, ColumnsIcon, DownloadIcon, HelpCircleIcon, ListIcon, LocateFixedIcon, LocateIcon, MapIcon, MoreHorizontalIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { lookupPlaceAction } from "@/features/schools/geo-actions"
import { setSchoolLocationAction } from "@/features/schools/submission-actions"
import {
  computeFacetCounts,
  didYouMean,
  EMPTY_STATE,
  explainEmpty,
  parseSearchState,
  runSearch,
  serializeSearchState,
  SORT_KEYS,
  STAFF_ONLY_SORTS,
  stripStaffFilters,
  type Chip,
  type GeoContext,
  type GeoHit,
  type MapView,
  type SearchState,
  type SortKey,
  type View,
} from "@/features/schools/search"
import type { SchoolSearchDoc } from "@/features/schools/search/doc"
import type { ResultRow } from "@/features/schools/search"
import { lookupCode, lookupPlace } from "@/features/schools/search/geo-client"
import type { Bounds } from "@/features/schools/search/geo"
import { downloadCsv, resultsToCsv } from "@/features/schools/csv"
import { FilterPanel } from "./filter-panel"
import { SavedSearchesDialog } from "./saved-searches-menu"
import { SchoolDetailSheet } from "./school-detail-sheet"
import { SchoolResultList } from "./school-result-list"
import { preloadMap, SchoolsMapLoader } from "./schools-map-loader"
import { SchoolsTable } from "./schools-table"
import { SearchBar } from "./search-bar"
import { ZeroResults } from "./zero-results"

const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Best match",
  distance: "Nearest",
  name: "Name A–Z",
  enrollment: "Most students",
  tuition: "Lowest tuition",
  founded: "Oldest",
  verified: "Recently verified",
  stale: "Least recently verified",
}

const OPERATOR_HELP: [string, string][] = [
  ['"dar ul"', "exact phrase"],
  ["noor | iqra", "either word"],
  ["-weekend", "exclude a word"],
  ["state:TX", "state (code or name)"],
  ['city:"San Antonio"', "exact city"],
  ["zip:78704", "ZIP or postal prefix"],
  ["grade:5   grade:k-8", "serves grade / all of a range"],
  ["tuition:<8000   enrolled:>200", "numbers: < > .. k"],
  ["founded:..2000", "open-ended range"],
  ["accredited:yes   has:quran", "accreditation, programs"],
  ['near:"Dallas, TX" within:25mi', "radius around a place"],
  ["78704   T5A 1B2", "just a ZIP / postal code"],
]

const MAX_URL_QS = 1800

/** `map` mode is the dedicated map page: map only, no list or table, no sort/view controls. */
export function SchoolsExplorer({
  docs,
  geoSeed,
  mode = "directory",
  audience = "staff",
}: {
  docs: SchoolSearchDoc[]
  geoSeed: GeoContext
  mode?: "directory" | "map"
  /** "public" hides everything staff-only: the table with its actions, CSV, pin editing, staff filters. */
  audience?: "staff" | "public"
}) {
  const staff = audience === "staff"
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const paramString = params.toString()
  const urlState = useMemo(() => {
    const parsed = parseSearchState(new URLSearchParams(paramString))
    return staff ? parsed : stripStaffFilters(parsed)
  }, [paramString, staff])

  // --- geo lookups: seeded by the server, completed here when the URL names a ZIP/place we haven't resolved
  const [resolved, setResolved] = useState(geoSeed.resolved)
  const inflight = useRef(new Set<string>())
  const ctx = useMemo<GeoContext>(() => ({ resolved }), [resolved])
  const result = useMemo(() => runSearch(docs, urlState, ctx), [docs, urlState, ctx])
  const state = result.state

  useEffect(() => {
    for (const key of result.pending) {
      if (inflight.current.has(key) || key in resolved) continue
      inflight.current.add(key)
      const text = key.replace(/^(code|place):/, "")
      const find = async (): Promise<GeoHit | null> => {
        if (key.startsWith("code:")) return lookupCode(text).catch(() => null)
        const city = await lookupPlace(text).catch(() => null)
        if (city) return city
        const r = await lookupPlaceAction(text).catch(() => null)
        return r?.ok ? { lat: r.lat, lng: r.lng, label: r.label } : null
      }
      find().then((hit) => setResolved((r) => ({ ...r, [key]: hit })))
        .finally(() => inflight.current.delete(key))
    }
  }, [result.pending, resolved])

  // Search state lives in the URL, but the page already has every school, so we use the native
  // History API (synced with useSearchParams by Next) instead of router.push, which would
  // re-render the server component on every keystroke and filter click.
  const navigate = useCallback(
    (next: SearchState, mode: "push" | "replace" = "push") => {
      const qs = serializeSearchState(next).toString()
      window.history[mode === "push" ? "pushState" : "replaceState"](null, "", qs ? `${pathname}?${qs}` : pathname)
    },
    [pathname],
  )

  // --- query box: debounced, IME-safe, kept in sync with back/forward and chip removal
  const [qInput, setQInput] = useState(urlState.q)
  const composing = useRef(false)
  const sentQ = useRef(urlState.q)
  useEffect(() => {
    if (urlState.q !== sentQ.current) {
      sentQ.current = urlState.q
      setQInput(urlState.q)
    }
  }, [urlState.q])
  useEffect(() => {
    if (qInput === sentQ.current) return
    const id = setTimeout(() => {
      if (composing.current) return
      sentQ.current = qInput
      navigate({ ...urlState, q: qInput }, "replace")
    }, 250)
    return () => clearTimeout(id)
  }, [qInput, urlState, navigate])

  const patch = (p: Partial<SearchState>, mode: "push" | "replace" = "push") => navigate({ ...state, ...p }, mode)
  const clearAll = () => navigate({ ...EMPTY_STATE, view: state.view })
  const onChip = (chip: Chip) => navigate(chip.without)

  // --- selection / hover shared by list and map
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [fitSignal, setFitSignal] = useState(0)
  const selectedRow = result.rows.find((r) => r.doc.id === selectedId) ?? null

  // Map position lives in the URL without adding history entries.
  const onViewChange = useCallback((m: MapView) => {
    const next = { ...parseSearchState(new URLSearchParams(window.location.search)), map: m }
    const qs = serializeSearchState(next).toString()
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
  }, [])
  const searchArea = (b: Bounds) => navigate({ ...state, bounds: b, center: null, map: null })

  function locate() {
    if (!window.isSecureContext || !navigator.geolocation) {
      toast.error("Location isn’t available here. Type a ZIP code or place instead.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => patch({ center: { lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location" }, bounds: null, map: null }),
      (err) =>
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Type a ZIP code or place instead."
            : err.code === err.TIMEOUT
              ? "Finding your location timed out. Try again or type a place."
              : "Couldn’t determine your location. Type a place instead.",
        ),
      { timeout: 10_000, maximumAge: 60_000 },
    )
  }

  // --- staff: drag a pin to the exact spot
  const [editingPin, setEditingPin] = useState<{ id: string; name: string; lat: number; lng: number; status: SchoolSearchDoc["membership"]["status"] } | null>(null)
  const [savingPin, startSavingPin] = useTransition()
  function startPinEdit(row: ResultRow) {
    const m = state.map
    setEditingPin({ id: row.doc.id, name: row.doc.name, lat: row.doc.lat ?? m?.lat ?? 39.5, lng: row.doc.lng ?? m?.lng ?? -96, status: row.doc.membership.status })
    setSelectedId(null)
    setFitSignal((n) => n + 1)
  }
  function savePin() {
    if (!editingPin) return
    startSavingPin(async () => {
      const r = await setSchoolLocationAction(editingPin.id, editingPin.lat, editingPin.lng)
      if (r.ok) {
        toast.success(`Saved the location of ${editingPin.name}`)
        setEditingPin(null)
        router.refresh() // pull the new coordinates into the cached index
      } else toast.error(r.error)
    })
  }

  const [panelOpen, setPanelOpen] = useState(false)
  // Warm the map chunk while the user is still on the list.
  useEffect(() => { preloadMap() }, [])
  const [savedOpen, setSavedOpen] = useState(false)
  const [tipsOpen, setTipsOpen] = useState(false)
  const counts = useMemo(() => (panelOpen ? computeFacetCounts(docs, state, ctx) : null), [panelOpen, docs, state, ctx])

  const mapOnly = mode === "map"
  const view: View = mapOnly ? "map" : (state.view ?? "split")
  const atoms = useMemo(() => result.parsed.items.flat(), [result.parsed])
  const empty = result.rows.length === 0 && result.pending.length === 0
  const fixes = useMemo(() => (empty ? explainEmpty(docs, result, ctx) : []), [empty, docs, result, ctx])
  const suggestion = useMemo(() => (empty && state.q ? didYouMean(docs, state.q) : null), [empty, docs, state.q])
  const unmapped = result.rows.filter((r) => r.doc.lat === null).length
  const approx = result.rows.filter((r) => r.doc.lat !== null && r.doc.precision !== "rooftop").length
  const currentQs = serializeSearchState({ ...state, map: null }).toString()
  const unit = result.center?.unit ?? state.unit
  const filterCount = result.chips.filter((c) => !c.id.startsWith("part:") && c.id !== "center" && c.id !== "bounds").length

  function exportCsv() {
    downloadCsv(`isla-schools-${new Date().toISOString().slice(0, 10)}.csv`, resultsToCsv(result.rows, unit))
    toast.success(`Exported ${result.rows.length} ${result.rows.length === 1 ? "school" : "schools"}`)
  }

  return (
    <div className="space-y-4">
      {/* One compact row; everything secondary lives in the ⋯ menu. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-56 flex-1 sm:max-w-md">
          <SearchBar
            value={qInput}
            onChange={setQInput}
            onClear={() => { setQInput(""); sentQ.current = ""; navigate({ ...urlState, q: "" }, "replace") }}
            onPlace={(c) => { setQInput(""); sentQ.current = ""; navigate({ ...state, q: "", center: c, bounds: null, map: null }) }}
            allowLookup={empty && staff}
            inputProps={{
              "aria-label": "Search schools",
              placeholder: "Search name, city, ZIP, leader…",
              maxLength: 200,
              enterKeyHint: "search",
              onCompositionStart: () => { composing.current = true },
              onCompositionEnd: (e) => { composing.current = false; setQInput(e.currentTarget.value) },
            }}
          />
        </div>
        <Button variant="outline" onClick={locate} aria-label="Schools near me"><LocateIcon /> <span className="hidden md:inline">Near me</span></Button>
        {result.center && (
          <>
            {/* within: in the query wins over these controls, so show its value and lock them. */}
            <Select value={String(result.center.radius)} onValueChange={(v) => patch({ radius: Number(v) })} disabled={!!result.parsed.within}>
              <SelectTrigger className="w-auto min-w-24" aria-label="Radius" title={result.parsed.within ? "Set by within: in the search box" : undefined}><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...new Set([5, 10, 25, 50, 100, 250, result.center.radius])].sort((a, b) => a - b).map((r) => <SelectItem key={r} value={String(r)}>{r} {result.center!.unit}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={result.center.unit} onValueChange={(v) => patch({ unit: v as "mi" | "km" })} disabled={!!result.parsed.within}>
              <SelectTrigger className="w-auto min-w-16" aria-label="Distance unit"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="mi">mi</SelectItem><SelectItem value="km">km</SelectItem></SelectContent>
            </Select>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={() => setPanelOpen(true)}>
            <SlidersHorizontalIcon /> Filters{filterCount > 0 && <span className="tabular ml-1 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{filterCount}</span>}
          </Button>
          {!mapOnly && <div role="group" aria-label="View" className="inline-flex rounded-lg ring-1 ring-foreground/10">
            {([["list", ListIcon, "List"], ["split", ColumnsIcon, "Split"], ["map", MapIcon, "Map"]] as const).map(([v, Icon, label]) => (
              <Button key={v} variant={view === v ? "secondary" : "ghost"} size="sm" aria-pressed={view === v} aria-label={label} onClick={() => patch({ view: v })} className="rounded-lg">
                <Icon /> <span className="hidden lg:inline">{label}</span>
              </Button>
            ))}
          </div>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More options"><MoreHorizontalIcon /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {!mapOnly && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger><ArrowDownUpIcon /> Sort by</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={result.sort} onValueChange={(v) => patch({ sort: v as SortKey })}>
                      {SORT_KEYS.filter((k) => (staff || !STAFF_ONLY_SORTS.includes(k)) && (k !== "distance" || result.center) && (k !== "relevance" || atoms.length)).map((k) => (
                        <DropdownMenuRadioItem key={k} value={k}>{SORT_LABELS[k]}</DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}
              <DropdownMenuItem onSelect={() => setSavedOpen(true)}><BookmarkIcon /> Saved searches</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTipsOpen(true)}><HelpCircleIcon /> Search tips</DropdownMenuItem>
              {view !== "list" && !empty && <DropdownMenuItem onSelect={() => setFitSignal((n) => n + 1)}><LocateFixedIcon /> Fit map to results</DropdownMenuItem>}
              {staff && !mapOnly && result.rows.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={exportCsv}><DownloadIcon /> Export CSV</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <SavedSearchesDialog open={savedOpen} onOpenChange={setSavedOpen} currentQs={currentQs} onApply={(qs) => navigate(parseSearchState(new URLSearchParams(qs)))} />
      <Dialog open={tipsOpen} onOpenChange={setTipsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Search tips</DialogTitle>
            <DialogDescription>Combine words and operators.</DialogDescription>
          </DialogHeader>
          <dl className="space-y-1.5 text-sm">
            {OPERATOR_HELP.map(([op, desc]) => (
              <div key={op} className="flex justify-between gap-3"><dt className="font-mono text-xs">{op}</dt><dd className="text-right text-muted-foreground">{desc}</dd></div>
            ))}
          </dl>
          <p className="text-xs text-muted-foreground">Spelling doesn’t need to be exact: “al nur”, “alnoor” and “Al-Noor” all match.</p>
          <p className="text-xs text-muted-foreground">Place data © <a className="underline" href="https://www.geonames.org" target="_blank" rel="noreferrer">GeoNames</a> (CC BY 4.0). Map © OpenStreetMap contributors.</p>
        </DialogContent>
      </Dialog>

      {result.chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {result.chips.map((chip) => (
            <button key={chip.id} type="button" onClick={() => onChip(chip)} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs hover:bg-secondary/70" aria-label={`Remove filter ${chip.label}`}>
              {chip.label} <XIcon className="size-3" />
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={clearAll}>Clear all</Button>
        </div>
      )}
      {currentQs.length > MAX_URL_QS && (
        <p role="status" className="text-xs text-warning-foreground">This search is very long and its link may not open everywhere. Use “Saved” to keep it.</p>
      )}

      {editingPin && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary/10 px-4 py-3 text-sm ring-1 ring-primary/30">
          <span>Drag the pin for <strong>{editingPin.name}</strong>, or click the map, to set its exact location.</span>
          <span className="flex gap-2">
            <Button size="sm" onClick={savePin} disabled={savingPin}>{savingPin ? "Saving…" : "Save location"}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditingPin(null)} disabled={savingPin}>Cancel</Button>
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p aria-live="polite" className="tabular">
          {result.pending.length > 0 ? "Finding that place…" : (
            <>
              {result.rows.length} {result.rows.length === 1 ? "school" : "schools"}
              {unmapped > 0 && ` · ${unmapped} not on map`}
              {approx > 0 && ` · ${approx} approximate`}
              {result.unlocated.length > 0 && ` · ${result.unlocated.length} without a location left out`}
            </>
          )}
        </p>
      </div>
      {result.notes.length > 0 && !empty && <p className="text-sm text-warning-foreground">{result.notes.join(" · ")}</p>}
      {result.ambiguous.length > 0 && (
        <p className="text-sm text-muted-foreground">
          “{result.center?.label}” is ambiguous. Also try: {result.ambiguous.slice(0, 4).map((p) => `${p.name}, ${p.state}`).join(" · ")}
        </p>
      )}

      {empty ? (
        <ZeroResults fixes={fixes} suggestion={suggestion} notes={result.notes} onApply={onChip} onSuggest={(q) => navigate({ ...state, q })} onClear={clearAll} />
      ) : view === "list" ? (
        staff ? (
          <SchoolsTable rows={result.rows.map((r) => r.doc)} />
        ) : (
          <SchoolResultList rows={result.rows} atoms={atoms} unit={unit} selectedId={selectedId} hoverId={hoverId} onSelect={setSelectedId} onHover={setHoverId} />
        )
      ) : (
        <div className={view === "split" ? "grid gap-4 md:grid-cols-[minmax(300px,2fr)_3fr]" : ""}>
          {view === "split" && (
            <div className="order-2 max-h-[70vh] overflow-y-auto md:order-1">
              <SchoolResultList rows={result.rows} atoms={atoms} unit={unit} selectedId={selectedId} hoverId={hoverId} onSelect={setSelectedId} onHover={setHoverId} />
            </div>
          )}
          <div className={mapOnly ? "h-[calc(100svh-19rem)] min-h-[28rem]" : "order-1 h-[60vh] md:sticky md:top-4 md:order-2 md:h-[70vh]"}>
            <SchoolsMapLoader
              rows={result.rows}
              center={result.center}
              selectedId={selectedId}
              hoverId={hoverId}
              initialView={state.map}
              onSelect={setSelectedId}
              onViewChange={onViewChange}
              fitSignal={fitSignal}
              autoFit={!state.bounds}
              boundsActive={!!state.bounds}
              onSearchArea={searchArea}
              editing={editingPin}
              onEditMove={(lat, lng) => setEditingPin((p) => (p ? { ...p, lat, lng } : p))}
            />
          </div>
        </div>
      )}

      <SchoolDetailSheet
        row={selectedRow}
        unit={unit}
        audience={audience}
        onClose={() => setSelectedId(null)}
        onAdjustPin={staff ? startPinEdit : undefined}
      />

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>{result.rows.length} {result.rows.length === 1 ? "school matches" : "schools match"}. Counts show what each option would give.</SheetDescription>
          </SheetHeader>
          {counts && <FilterPanel audience={audience} state={state} counts={counts} onChange={(p) => patch(p, "replace")} />}
          <SheetFooter className="sticky bottom-0 flex-row justify-between border-t bg-background">
            <Button variant="ghost" onClick={clearAll}>Clear all</Button>
            <Button onClick={() => setPanelOpen(false)}>Show {result.rows.length} {result.rows.length === 1 ? "school" : "schools"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
