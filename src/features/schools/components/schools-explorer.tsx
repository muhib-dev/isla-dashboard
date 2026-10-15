"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownUpIcon,
  BookmarkIcon,
  DownloadIcon,
  HelpCircleIcon,
  LocateFixedIcon,
  LocateIcon,
  MoreHorizontalIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { lookupPlaceAction } from "@/features/schools/geo-actions";
import {
  computeFacetCounts,
  didYouMean,
  EMPTY_STATE,
  explainEmpty,
  RANGE_FIELDS,
  rangeExtents,
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
} from "@/features/schools/search";
import type { SchoolSearchDoc } from "@/features/schools/search/doc";
import { lookupCode, lookupPlace } from "@/features/schools/search/geo-client";
import type { Bounds } from "@/features/schools/search/geo";
import { downloadCsv, resultsToCsv } from "@/features/schools/csv";
import {
  REGION_LABELS,
  REGIONS,
  SCHOOL_TYPE_LABELS,
  SCHOOL_TYPES,
  type MembershipStatus,
} from "@/features/schools/schema";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { FacetFilter, StatusTabs } from "./explorer-toolbar";
import { FilterPanel } from "./filter-panel";
import { SavedSearchesDialog } from "./saved-searches-menu";
import { SchoolDetailDialog } from "./school-detail-dialog";
import { SchoolResultList } from "./school-result-list";
import { SchoolsMapLoader } from "./schools-map-loader";
import { SchoolsTable } from "./schools-table";
import { SearchBar } from "./search-bar";
import { ZeroResults } from "./zero-results";

const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Best match",
  distance: "Nearest",
  name: "Name A–Z",
  enrollment: "Most students",
  tuition: "Lowest tuition",
  founded: "Oldest",
  verified: "Recently verified",
  stale: "Least recently verified",
};

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
];

const MAX_URL_QS = 1800;

const REGION_OPTIONS = REGIONS.map((v) => ({
  value: v,
  label: REGION_LABELS[v],
}));
const TYPE_OPTIONS = SCHOOL_TYPES.map((v) => ({
  value: v,
  label: SCHOOL_TYPE_LABELS[v],
}));
/** Public docs only distinguish members from everyone else. */
const PUBLIC_STATUSES: MembershipStatus[] = ["active", "non_member"];
const ALL_STATUSES: MembershipStatus[] = [
  "active",
  "grace",
  "lapsed",
  "non_member",
];
const STATUS_CHIP_LABEL: Record<MembershipStatus, string> = {
  active: "Active",
  grace: "Grace",
  lapsed: "Lapsed",
  non_member: "Not a member",
};
const STATUS_CHIP_DOT: Record<MembershipStatus, string> = {
  active: "bg-member-active",
  grace: "bg-member-grace",
  lapsed: "bg-member-lapsed",
  non_member: "border-[1.5px] border-member-none",
};

/**
 * `list` mode (staff dashboard) shows the filterable data table and no map.
 * `map` mode (public map page) is a full-bleed split: result list panel + map, no sort or CSV.
 */
export function SchoolsExplorer({
  docs,
  geoSeed,
  mode = "list",
  audience = "staff",
  title = "Map",
  actions,
}: {
  docs: SchoolSearchDoc[];
  geoSeed: GeoContext;
  mode?: "list" | "map";
  /** "public" hides everything staff-only: CSV and staff-only filters and sorts. */
  audience?: "staff" | "public";
  /** Map mode: heading of the list panel. */
  title?: ReactNode;
  /** Map mode: extra buttons at the foot of the list panel. */
  actions?: ReactNode;
}) {
  const staff = audience === "staff";
  const pathname = usePathname();
  const params = useSearchParams();
  const paramString = params.toString();
  const urlState = useMemo(() => {
    const parsed = parseSearchState(new URLSearchParams(paramString));
    if (staff) return parsed;
    // Public docs only say "member" or "not a member", so that much of the status filter is safe.
    return {
      ...stripStaffFilters(parsed),
      status: parsed.status.filter((s) => PUBLIC_STATUSES.includes(s)),
    };
  }, [paramString, staff]);

  // --- geo lookups: seeded by the server, completed here when the URL names a ZIP/place we haven't resolved
  const [resolved, setResolved] = useState(geoSeed.resolved);
  const inflight = useRef(new Set<string>());
  const ctx = useMemo<GeoContext>(() => ({ resolved }), [resolved]);
  const result = useMemo(
    () => runSearch(docs, urlState, ctx),
    [docs, urlState, ctx],
  );
  const state = result.state;

  useEffect(() => {
    for (const key of result.pending) {
      if (inflight.current.has(key) || key in resolved) continue;
      inflight.current.add(key);

      const text = key.replace(/^(code|place):/, "");
      const find = async (): Promise<GeoHit | null> => {
        if (key.startsWith("code:")) return lookupCode(text).catch(() => null);

        const city = await lookupPlace(text).catch(() => null);
        if (city) return city;

        const r = await lookupPlaceAction(text).catch(() => null);
        return r?.ok ? { lat: r.lat, lng: r.lng, label: r.label } : null;
      };

      find()
        .then((hit) => setResolved((r) => ({ ...r, [key]: hit })))
        .finally(() => inflight.current.delete(key));
    }
  }, [result.pending, resolved]);

  // Search state lives in the URL, but the page already has every school, so we use the native
  // History API (synced with useSearchParams by Next) instead of router.push, which would
  // re-render the server component on every keystroke and filter click.
  const navigate = useCallback(
    (next: SearchState, mode: "push" | "replace" = "push") => {
      const qs = serializeSearchState(next).toString();
      window.history[mode === "push" ? "pushState" : "replaceState"](
        null,
        "",
        qs ? `${pathname}?${qs}` : pathname,
      );
    },
    [pathname],
  );

  // --- query box: debounced, IME-safe, kept in sync with back/forward and chip removal
  const [qInput, setQInput] = useState(urlState.q);
  const composing = useRef(false);
  const sentQ = useRef(urlState.q);
  useEffect(() => {
    if (urlState.q !== sentQ.current) {
      sentQ.current = urlState.q;
      setQInput(urlState.q);
    }
  }, [urlState.q]);
  useEffect(() => {
    if (qInput === sentQ.current) return;
    const id = setTimeout(() => {
      if (composing.current) return;
      sentQ.current = qInput;
      navigate({ ...urlState, q: qInput }, "replace");
    }, 250);
    return () => clearTimeout(id);
  }, [qInput, urlState, navigate]);

  const patch = (p: Partial<SearchState>, mode: "push" | "replace" = "push") =>
    navigate({ ...state, ...p }, mode);
  const clearAll = () => navigate(EMPTY_STATE);
  const onChip = (chip: Chip) => navigate(chip.without);

  // --- map selection / hover
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  // Clicking a pin or list row selects the school and opens its details in a modal over the map.
  const [detailOpen, setDetailOpen] = useState(false);
  const [fitSignal, setFitSignal] = useState(0);
  const openSchool = useCallback((id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  }, []);
  const selectedRow = result.rows.find((r) => r.doc.id === selectedId) ?? null;

  // Map position lives in the URL without adding history entries.
  const onViewChange = useCallback((m: MapView) => {
    const next = {
      ...parseSearchState(new URLSearchParams(window.location.search)),
      map: m,
    };
    const qs = serializeSearchState(next).toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
    );
  }, []);
  const searchArea = (b: Bounds) =>
    navigate({ ...state, bounds: b, center: null, map: null });

  function locate() {
    if (!window.isSecureContext || !navigator.geolocation) {
      toast.error(
        "Location isn’t available here. Type a ZIP code or place instead.",
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        patch({
          center: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            label: "your location",
          },
          bounds: null,
          map: null,
        }),
      (err) =>
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Type a ZIP code or place instead."
            : err.code === err.TIMEOUT
              ? "Finding your location timed out. Try again or type a place."
              : "Couldn’t determine your location. Type a place instead.",
        ),
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }

  const [panelOpen, setPanelOpen] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const extents = useMemo(() => rangeExtents(docs, RANGE_FIELDS), [docs]);
  const counts = useMemo(
    () => (panelOpen ? computeFacetCounts(docs, state, ctx) : null),
    [panelOpen, docs, state, ctx],
  );

  const mapOnly = mode === "map";
  // Phones get the map alone (no result list), so matching schools are offered in the search dropdown.
  const isMobile = useIsMobile();
  const schoolSuggestions = useMemo(
    () =>
      mapOnly && isMobile && qInput.trim()
        ? result.rows.slice(0, 8).map((r) => ({
            id: r.doc.id,
            label: r.doc.name,
            detail: `${r.doc.city}, ${r.doc.state}`,
          }))
        : [],
    [mapOnly, isMobile, qInput, result.rows],
  );
  const atoms = useMemo(() => result.parsed.items.flat(), [result.parsed]);
  const empty = result.rows.length === 0 && result.pending.length === 0;
  const fixes = useMemo(
    () => (empty ? explainEmpty(docs, result, ctx) : []),
    [empty, docs, result, ctx],
  );
  const suggestion = useMemo(
    () => (empty && state.q ? didYouMean(docs, state.q) : null),
    [empty, docs, state.q],
  );
  const unmapped = result.rows.filter((r) => r.doc.lat === null).length;
  const currentQs = serializeSearchState({ ...state, map: null }).toString();
  const unit = result.center?.unit ?? state.unit;
  // Status tab counts: the current search with the status filter cleared.
  const showTabs = staff && !mapOnly;
  const statusCounts = useMemo(() => {
    if (!showTabs) return null;
    const c: Record<MembershipStatus | "all", number> = {
      all: 0,
      active: 0,
      grace: 0,
      lapsed: 0,
      non_member: 0,
    };
    for (const r of runSearch(docs, { ...urlState, status: [] }, ctx).rows) {
      c[r.doc.membership.status]++;
      c.all++;
    }
    return c;
  }, [showTabs, docs, urlState, ctx]);
  // Map mode shows the status filter as its own chips, so it isn't repeated as removable chips.
  const isStatusChip = (c: Chip) => mapOnly && c.id.startsWith("status:");
  const filterChips = result.chips.filter((c) => !isStatusChip(c));
  const filterCount = filterChips.filter(
    (c) => !c.id.startsWith("part:") && c.id !== "center" && c.id !== "bounds",
  ).length;
  // Only offer statuses this audience's docs actually carry (public: member / not a member).
  const statusOptions = useMemo(() => {
    const present = new Set(docs.map((d) => d.membership.status));
    return ALL_STATUSES.filter((s) => present.has(s));
  }, [docs]);

  function exportCsv() {
    downloadCsv(
      `isla-schools-${new Date().toISOString().slice(0, 10)}.csv`,
      resultsToCsv(result.rows, unit),
    );
    toast.success(
      `Exported ${result.rows.length} ${result.rows.length === 1 ? "school" : "schools"}`,
    );
  }

  const searchBar = (
    <SearchBar
      className={mapOnly ? "sm:w-full [&>svg:first-child]:size-4.5" : "sm:w-70"}
      inputClassName={mapOnly ? undefined : "h-9"}
      value={qInput}
      onChange={setQInput}
      onClear={() => {
        setQInput("");
        sentQ.current = "";
        navigate({ ...urlState, q: "" }, "replace");
      }}
      onPlace={(c) => {
        setQInput("");
        sentQ.current = "";
        navigate({ ...state, q: "", center: c, bounds: null, map: null });
      }}
      allowLookup={empty && staff}
      schools={schoolSuggestions}
      onSchool={openSchool}
      inputProps={{
        "aria-label": "Search schools",
        placeholder: mapOnly
          ? "Search a school or city"
          : "Search name, city, ZIP, leader…",
        maxLength: 200,
        enterKeyHint: "search",
        onCompositionStart: () => {
          composing.current = true;
        },
        onCompositionEnd: (e) => {
          composing.current = false;
          setQInput(e.currentTarget.value);
        },
      }}
    />
  );

  const controlSize = "sm";
  const nearControls = (
    <>
      {/* "Near me" is for families finding a school; staff search by place instead. */}
      {!staff && (
        <Button
          variant="outline"
          size={controlSize}
          onClick={locate}
          aria-label="Schools near me"
        >
          <LocateIcon /> <span className="hidden md:inline">Near me</span>
        </Button>
      )}
      {result.center && (
        <>
          {/* within: in the query wins over these controls, so show its value and lock them. */}
          <Select
            value={String(result.center.radius)}
            onValueChange={(v) => patch({ radius: Number(v) })}
            disabled={!!result.parsed.within}
          >
            <SelectTrigger
              size={controlSize}
              className="w-auto min-w-24"
              aria-label="Radius"
              title={
                result.parsed.within
                  ? "Set by within: in the search box"
                  : undefined
              }
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...new Set([5, 10, 25, 50, 100, 250, result.center.radius])]
                .sort((a, b) => a - b)
                .map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r} {result.center!.unit}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={result.center.unit}
            onValueChange={(v) => patch({ unit: v as "mi" | "km" })}
            disabled={!!result.parsed.within}
          >
            <SelectTrigger
              size={controlSize}
              className="w-auto min-w-16"
              aria-label="Distance unit"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mi">mi</SelectItem>
              <SelectItem value="km">km</SelectItem>
            </SelectContent>
          </Select>
        </>
      )}
    </>
  );

  const filtersButton = (
    <Button
      variant="outline"
      size={controlSize}
      className={cn(!mapOnly && "border-dashed")}
      onClick={() => setPanelOpen(true)}
    >
      <SlidersHorizontalIcon /> {mapOnly ? "Filters" : "More filters"}
      {filterCount > 0 && (
        <span className="tabular rounded-sm bg-secondary px-1.5 text-[13px] font-medium text-secondary-foreground">
          {filterCount}
        </span>
      )}
    </Button>
  );

  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="More options"
          title="More options"
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {!mapOnly && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowDownUpIcon /> Sort by
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={result.sort}
                onValueChange={(v) => patch({ sort: v as SortKey })}
              >
                {SORT_KEYS.filter(
                  (k) =>
                    (staff || !STAFF_ONLY_SORTS.includes(k)) &&
                    (k !== "distance" || result.center) &&
                    (k !== "relevance" || atoms.length),
                ).map((k) => (
                  <DropdownMenuRadioItem key={k} value={k}>
                    {SORT_LABELS[k]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuItem onSelect={() => setSavedOpen(true)}>
          <BookmarkIcon /> Saved searches
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setTipsOpen(true)}>
          <HelpCircleIcon /> Search tips
        </DropdownMenuItem>
        {mapOnly && !empty && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setFitSignal((n) => n + 1)}>
              <LocateFixedIcon /> Fit map to results
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const resultCount = `${result.rows.length.toLocaleString("en-US")} ${result.rows.length === 1 ? "school" : "schools"}`;
  // Extra context next to the count; the table footer carries the count itself in list mode.
  const countDetails = [
    mapOnly && unmapped > 0 && `${unmapped} not on map`,
    result.unlocated.length > 0 &&
      `${result.unlocated.length} without a location left out`,
  ].filter(Boolean);

  const messages = (
    <>
      {filterChips.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          aria-label="Active filters"
        >
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onChip(chip)}
              className="inline-flex h-7 items-center gap-1 rounded-sm border bg-secondary px-2 text-[13px] font-medium text-secondary-foreground transition-colors hover:bg-surface-3"
              aria-label={`Remove filter ${chip.label}`}
            >
              {chip.label} <XIcon className="size-3.5 text-muted-foreground" />
            </button>
          ))}
          {mapOnly && (
            <Button
              variant="link"
              size="sm"
              className="h-7 px-1"
              onClick={clearAll}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
      {currentQs.length > MAX_URL_QS && (
        <p role="status" className="text-[13px] text-warning">
          This search is very long and its link may not open everywhere. Use
          “Saved” to keep it.
        </p>
      )}
      {!mapOnly && (
        <p
          aria-live="polite"
          className="tabular text-[13px] text-muted-foreground empty:hidden"
        >
          {result.pending.length > 0
            ? "Finding that place…"
            : countDetails.join(" · ")}
        </p>
      )}
      {mapOnly && result.pending.length === 0 && countDetails.length > 0 && (
        <p className="tabular text-[13px] text-muted-foreground">
          {countDetails.join(" · ")}
        </p>
      )}
      {result.notes.length > 0 && !empty && (
        <p className="text-[13px] text-warning">{result.notes.join(" · ")}</p>
      )}
      {result.ambiguous.length > 0 && (
        <p className="text-[13px] text-muted-foreground">
          “{result.center?.label}” is ambiguous. Also try:{" "}
          {result.ambiguous
            .slice(0, 4)
            .map((p) => `${p.name}, ${p.state}`)
            .join(" · ")}
        </p>
      )}
    </>
  );
  const hasMessages =
    filterChips.length > 0 ||
    currentQs.length > MAX_URL_QS ||
    result.pending.length > 0 ||
    countDetails.length > 0 ||
    (result.notes.length > 0 && !empty) ||
    result.ambiguous.length > 0;

  const zeroResults = (
    <ZeroResults
      fixes={fixes}
      suggestion={suggestion}
      notes={result.notes}
      onApply={onChip}
      onSuggest={(q) => navigate({ ...state, q })}
      onClear={clearAll}
    />
  );

  const overlays = (
    <>
      <SavedSearchesDialog
        open={savedOpen}
        onOpenChange={setSavedOpen}
        currentQs={currentQs}
        onApply={(qs) => navigate(parseSearchState(new URLSearchParams(qs)))}
      />
      <Dialog open={tipsOpen} onOpenChange={setTipsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Search tips</DialogTitle>
            <DialogDescription>Combine words and operators.</DialogDescription>
          </DialogHeader>
          <dl className="divide-y rounded-lg border text-sm">
            {OPERATOR_HELP.map(([op, desc]) => (
              <div key={op} className="flex justify-between gap-3 px-3 py-2">
                <dt className="text-[13px] font-medium">{op}</dt>
                <dd className="text-right text-muted-foreground">{desc}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[13px] text-muted-foreground">
            Spelling doesn’t need to be exact: “al nur”, “alnoor” and “Al-Noor”
            all match.
          </p>
          <p className="text-[13px] text-muted-foreground">
            Place data ©{" "}
            <a
              className="text-link underline-offset-3 hover:underline"
              href="https://www.geonames.org"
              target="_blank"
              rel="noreferrer"
            >
              GeoNames
            </a>{" "}
            (CC BY 4.0). Map © OpenStreetMap contributors.
          </p>
        </DialogContent>
      </Dialog>

      <SchoolDetailDialog
        row={detailOpen ? selectedRow : null}
        unit={unit}
        audience={audience}
        onClose={() => setDetailOpen(false)}
      />

      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              {result.rows.length}{" "}
              {result.rows.length === 1 ? "school matches" : "schools match"}.
              Counts show what each option would give.
            </SheetDescription>
          </SheetHeader>
          {counts && (
            <FilterPanel
              audience={audience}
              state={state}
              counts={counts}
              extents={extents}
              onChange={(p) => patch(p, "replace")}
            />
          )}
          <SheetFooter className="sticky bottom-0 flex-row justify-between border-t bg-popover">
            <Button variant="ghost" onClick={clearAll}>
              Clear all
            </Button>
            <Button onClick={() => setPanelOpen(false)}>
              Show {result.rows.length}{" "}
              {result.rows.length === 1 ? "school" : "schools"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );

  if (mapOnly) {
    const toggleStatus = (s: MembershipStatus) =>
      patch(
        {
          status: state.status.includes(s)
            ? state.status.filter((v) => v !== s)
            : [...state.status, s],
        },
        "replace",
      );
    return (
      // The layout sets --app-header to its top bar height (public header 56px, dashboard 60px).
      // Phones: compact search header over a full-height map; desktop: list panel left, map right.
      <div className="flex h-[calc(100svh-var(--app-header,56px))] flex-col md:flex-row">
        <aside className="relative z-10 flex shrink-0 flex-col border-b bg-card md:z-auto md:min-h-0 md:w-100 md:border-r md:border-b-0">
          <div className="flex flex-col gap-2.5 p-3 md:gap-3 md:border-b md:p-5 md:pb-3">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="text-lg font-semibold tracking-[-0.01em] md:text-h2">
                {title}
              </h1>
              <p
                aria-live="polite"
                className="tabular shrink-0 text-[15px] text-muted-foreground"
              >
                {result.pending.length > 0
                  ? "Finding that place…"
                  : resultCount}
              </p>
            </div>
            {searchBar}
            {statusOptions.length > 1 && (
              <div
                role="group"
                aria-label="Membership status"
                className="flex flex-wrap gap-1.5"
              >
                {statusOptions.map((s) => {
                  const on = state.status.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleStatus(s)}
                      className={cn(
                        "inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-[14px] font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                        on
                          ? "border-primary bg-[color-mix(in_oklch,var(--primary)_8%,var(--card))] text-foreground"
                          : "border-input text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          STATUS_CHIP_DOT[s],
                        )}
                      />
                      {STATUS_CHIP_LABEL[s]}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {nearControls}
              {filtersButton}
              <div className="ml-auto">{moreMenu}</div>
            </div>
            {hasMessages && <div className="space-y-2">{messages}</div>}
          </div>
          {/* Phones only show why nothing matched; the school list is desktop only. */}
          <div
            className={cn(
              "max-h-[40svh] overflow-y-auto border-t md:block md:max-h-none md:min-h-0 md:flex-1 md:border-t-0",
              !empty && "hidden",
            )}
          >
            {empty ? (
              zeroResults
            ) : (
              <SchoolResultList
                rows={result.rows}
                atoms={atoms}
                unit={unit}
                selectedId={selectedId}
                hoverId={hoverId}
                onSelect={openSchool}
                onHover={setHoverId}
              />
            )}
          </div>
          {actions && (
            <div className="hidden flex-wrap gap-2 border-t px-5 py-3 md:flex">
              {actions}
            </div>
          )}
        </aside>

        <div className="relative min-h-0 flex-1 bg-surface-2 md:min-w-0">
          <SchoolsMapLoader
            rows={result.rows}
            center={result.center}
            selectedId={selectedId}
            hoverId={hoverId}
            initialView={state.map}
            onSelect={openSchool}
            onViewChange={onViewChange}
            fitSignal={fitSignal}
            autoFit={!state.bounds}
            boundsActive={!!state.bounds}
            onSearchArea={searchArea}
            editing={null}
            onEditMove={() => {}}
            legendStatuses={statusOptions}
          />
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap gap-2 border-t bg-card px-3 py-2 md:hidden">
            {actions}
          </div>
        )}
        {overlays}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusCounts && (
        <StatusTabs
          value={state.status}
          counts={statusCounts}
          onChange={(status) => patch({ status })}
        />
      )}

      <div className="rounded-lg border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          {searchBar}
          {nearControls}
          <FacetFilter
            label="Region"
            options={REGION_OPTIONS}
            selected={state.region}
            onChange={(region) => patch({ region }, "replace")}
          />
          <FacetFilter
            label="Type"
            options={TYPE_OPTIONS}
            selected={state.type}
            onChange={(type) => patch({ type }, "replace")}
          />
          {filtersButton}
          {result.chips.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Reset <XIcon />
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {staff && result.rows.length > 0 && (
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <DownloadIcon /> Export
              </Button>
            )}
            {moreMenu}
          </div>
        </div>
        {hasMessages && (
          <div className="space-y-2 border-b px-4 py-3">{messages}</div>
        )}

        {empty ? (
          zeroResults
        ) : (
          <SchoolsTable
            rows={result.rows.map((r) => r.doc)}
            total={docs.length}
            pageKey={currentQs}
          />
        )}
      </div>
      {overlays}
    </div>
  );
}
