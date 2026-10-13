import { canon } from "./aliases";
import { enrollmentSpan, type SchoolSearchDoc } from "./doc";
import {
  allPlaces,
  geoKey,
  parseCode,
  resolvePlace,
  type GeoContext,
  type GeoHit,
  type Place,
} from "./gazetteer";
import { distance, clampRadius, inBounds, type Unit } from "./geo";
import { editDistance, maxTypos } from "./normalize";
import { facetCounts, passesFacets, type FacetCounts } from "./facets";
import { matchQuery } from "./match";
import { parseQuery, removePart, type ParsedQuery } from "./parse-query";
import { stateCode, STATES } from "./states";
import {
  ENROLLMENT_BAND_LABELS,
  FEATURE_LABELS,
  SCHOOL_TYPE_LABELS,
} from "../schema";
import {
  DQ_LABELS,
  FRESHNESS_LABELS,
  MEMBERSHIP_LABELS,
  PROGRAM_LABELS,
  RANGE_LABELS,
  REGION_NAMES,
} from "./labels";
import {
  EMPTY_STATE,
  type DateRange,
  type RangeField,
  type RangeFilter,
  type SearchState,
  type SortKey,
} from "./state";

export type ResultRow = {
  doc: SchoolSearchDoc;
  score: number;
  distance: number | null;
};

export type Chip = {
  id: string;
  label: string;
  /** The state that results from removing this chip. */
  without: SearchState;
};

export type SearchResult = {
  rows: ResultRow[];
  parsed: ParsedQuery;
  state: SearchState;
  /** The center actually applied (from `near:` or the URL), with its distance unit. */
  center: {
    lat: number;
    lng: number;
    label?: string;
    radius: number;
    unit: Unit;
  } | null;
  /** Schools that pass every filter but have no usable coordinates while a radius is active. */
  unlocated: SchoolSearchDoc[];
  notes: string[];
  chips: Chip[];
  sort: SortKey;
  /** "Springfield" resolved to the largest match; other candidates listed here. */
  ambiguous: Place[];
  /** Geo lookups (`geoKey`) still waiting on async data; the UI loads them and reruns. */
  pending: string[];
};

/** A bare state name or capitalised code in the query becomes a state filter. */
export function applyQueryIntent(state: SearchState): SearchState {
  const q = state.q.trim();
  if (!q) return state;
  const isCode = /^[A-Z]{2}$/.test(q) && q in STATES;
  const code = isCode ? q : q.length > 3 ? stateCode(q) : null;
  if (!code || state.state.includes(code)) return state;
  return { ...state, q: "", state: [...state.state, code] };
}

const sizeKey = (doc: SchoolSearchDoc) => {
  const s = enrollmentSpan(doc);
  return s ? (s.max ?? s.min) : null;
};

function compare(sort: SortKey, a: ResultRow, b: ResultRow): number {
  const nullsLast = (x: number | null, y: number | null, dir: 1 | -1) =>
    x === null && y === null
      ? 0
      : x === null
        ? 1
        : y === null
          ? -1
          : (x - y) * dir;
  let c = 0;
  switch (sort) {
    case "relevance":
      c = b.score - a.score;
      break;
    case "distance":
      c = nullsLast(a.distance, b.distance, 1);
      break;
    case "name":
      c = a.doc.name.localeCompare(b.doc.name);
      break;
    // Exact count, else the band's upper end (open-ended "500+" sorts as its floor).
    case "enrollment":
      c = nullsLast(sizeKey(a.doc), sizeKey(b.doc), -1);
      break;
    case "tuition":
      c = nullsLast(a.doc.tuition, b.doc.tuition, 1);
      break;
    case "founded":
      c = nullsLast(a.doc.founded, b.doc.founded, 1);
      break;
    case "verified":
      c = b.doc.oldestVerifiedAt.localeCompare(a.doc.oldestVerifiedAt);
      break;
    case "stale":
      c = a.doc.oldestVerifiedAt.localeCompare(b.doc.oldestVerifiedAt);
      break;
  }
  return (
    c ||
    a.doc.name.localeCompare(b.doc.name) ||
    a.doc.id.localeCompare(b.doc.id)
  );
}

/** Resolves a place name, ZIP or postal code from the context or the bundled city list. */
function locate(
  text: string,
  ctx?: GeoContext,
): { hit: GeoHit } | { pending: string } | { missing: true } {
  const key = geoKey(text);
  if (ctx && key in ctx.resolved) {
    const hit = ctx.resolved[key];
    return hit ? { hit } : { missing: true };
  }
  if (!parseCode(text)) {
    const hit = resolvePlace(text);
    if (hit) return { hit };
  }
  return { pending: key };
}

export function runSearch(
  docs: SchoolSearchDoc[],
  input: SearchState,
  ctx?: GeoContext,
): SearchResult {
  const state = applyQueryIntent(input);
  // A bare ZIP / postal code means "schools near here", not a text search.
  const codeIntent = parseCode(state.q.trim()) ? state.q.trim() : null;
  const parsed = parseQuery(codeIntent ? "" : state.q);
  const notes = [...parsed.notes];
  const pending: string[] = [];
  let ambiguous: Place[] = [];

  // Radius center: near:/ZIP beats the URL's geolocation/place center.
  let center: SearchResult["center"] = null;
  let centerFrom: "operator" | "intent" | "state" = "state";
  const radiusFrom = parsed.within ?? { value: state.radius, unit: state.unit };
  const nearText = parsed.near ?? codeIntent;
  if (nearText) {
    const found = locate(nearText, ctx);
    if ("hit" in found) {
      center = {
        lat: found.hit.lat,
        lng: found.hit.lng,
        label: found.hit.label,
        radius: 0,
        unit: radiusFrom.unit,
      };
      ambiguous = found.hit.alternatives ?? [];
      centerFrom = codeIntent ? "intent" : "operator";
    } else if ("pending" in found) pending.push(found.pending);
    else notes.push(`Couldn't find a place called "${nearText}"`);
  } else if (state.center) {
    center = { ...state.center, radius: 0, unit: state.unit };
  }
  if (center)
    center.radius = parsed.within
      ? Math.min(Math.max(parsed.within.value, 1), 500)
      : clampRadius(radiusFrom.value);

  const rows: ResultRow[] = [];
  const unlocated: SchoolSearchDoc[] = [];
  for (const doc of docs) {
    if (!passesFacets(doc, state)) continue;
    const score = matchQuery(doc, parsed);
    if (!score) continue;
    let d: number | null = null;
    if (state.bounds) {
      if (doc.lat === null || doc.lng === null) {
        unlocated.push(doc);
        continue;
      }
      if (!inBounds(doc.lat, doc.lng, state.bounds)) continue;
    }
    if (center) {
      if (doc.lat === null || doc.lng === null) {
        if (!unlocated.includes(doc)) unlocated.push(doc);
        continue;
      }
      d = distance(center.lat, center.lng, doc.lat, doc.lng, center.unit);
      if (d > center.radius) continue;
    }
    rows.push({ doc, score, distance: d });
  }

  const sort: SortKey =
    state.sort &&
    (state.sort !== "distance" || center) &&
    (state.sort !== "relevance" || parsed.items.length)
      ? state.sort
      : center
        ? "distance"
        : parsed.items.length
          ? "relevance"
          : "name";
  rows.sort((a, b) => compare(sort, a, b));
  return {
    rows,
    parsed,
    state,
    center,
    unlocated,
    notes,
    chips: buildChips(state, parsed, center, centerFrom),
    sort,
    ambiguous,
    pending,
  };
}

function minutesLabel(m: number) {
  const h = Math.floor(m / 60);
  return `${h % 12 || 12}:${String(m % 60).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

function rangeLabel(field: RangeField, r: RangeFilter): string {
  const { label, unit } = RANGE_LABELS[field];
  const f = (n: number) =>
    unit === "$"
      ? `$${n.toLocaleString("en-US")}`
      : unit === "%"
        ? `${n}%`
        : String(n);
  const body =
    r.min !== undefined && r.max !== undefined
      ? `${f(r.min)}–${f(r.max)}`
      : r.min !== undefined
        ? `${f(r.min)}+`
        : `up to ${f(r.max!)}`;
  return `${label}: ${body}${r.unknown ? " (+ unknown)" : ""}`;
}

const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export function dateRangeLabel(r: DateRange): string {
  if (r.from && r.to)
    return r.from === r.to
      ? dayLabel(r.from)
      : `${dayLabel(r.from)} – ${dayLabel(r.to)}`;
  return r.from
    ? `on or after ${dayLabel(r.from)}`
    : `on or before ${dayLabel(r.to!)}`;
}

const gl = (g: number) => (g === 0 ? "K" : g < 0 ? "PK" : String(g));

function buildChips(
  state: SearchState,
  parsed: ParsedQuery,
  center: SearchResult["center"],
  centerFrom: "operator" | "intent" | "state",
): Chip[] {
  const chips: Chip[] = [];
  const drop = (patch: Partial<SearchState>): SearchState => ({
    ...state,
    ...patch,
  });
  const add = (id: string, label: string, patch: Partial<SearchState>) =>
    chips.push({ id, label, without: drop(patch) });
  const without = <T>(list: T[], v: T) => list.filter((x) => x !== v);
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

  for (const r of state.region)
    add(`region:${r}`, `Region: ${REGION_NAMES[r]}`, {
      region: without(state.region, r),
    });
  for (const s of state.state)
    add(`state:${s}`, `State: ${STATES[s] ?? s}`, {
      state: without(state.state, s),
    });
  for (const c of state.country)
    add(`country:${c}`, c === "US" ? "United States" : "Canada", {
      country: without(state.country, c),
    });
  for (const s of state.status)
    add(`status:${s}`, `Membership: ${MEMBERSHIP_LABELS[s]}`, {
      status: without(state.status, s),
    });
  for (const f of state.freshness)
    add(`fresh:${f}`, `Profile: ${FRESHNESS_LABELS[f]}`, {
      freshness: without(state.freshness, f),
    });
  for (const t of state.type)
    add(`type:${t}`, `Type: ${SCHOOL_TYPE_LABELS[t]}`, {
      type: without(state.type, t),
    });
  for (const l of state.listing)
    add(`list:${l}`, `Listing: ${cap(l)}`, {
      listing: without(state.listing, l),
    });
  if (state.grade !== null) {
    const label =
      state.gradeTo === null
        ? `Serves grade ${gl(state.grade)}`
        : `${state.gradeMode === "overlaps" ? "Overlaps" : "Covers"} grades ${gl(state.grade)}–${gl(state.gradeTo)}`;
    add("grade", label, { grade: null, gradeTo: null });
  }
  if (state.accredited)
    add(
      "accredited",
      state.accredited === "yes" ? "Accredited" : "Not accredited",
      { accredited: null },
    );
  for (const a of state.agency)
    add(`agency:${a}`, `Accreditor: ${a}`, {
      agency: without(state.agency, a),
    });
  for (const t of state.yes)
    add(`yes:${t}`, PROGRAM_LABELS[t], { yes: without(state.yes, t) });
  for (const t of state.no)
    add(`no:${t}`, `No ${PROGRAM_LABELS[t].toLowerCase()}`, {
      no: without(state.no, t),
    });
  for (const f of state.features)
    add(`feature:${f}`, FEATURE_LABELS[f], {
      features: without(state.features, f),
    });
  for (const b of state.enrollBand)
    add(`eb:${b}`, `Students: ${ENROLLMENT_BAND_LABELS[b]}`, {
      enrollBand: without(state.enrollBand, b),
    });
  for (const [field, r] of Object.entries(state.ranges) as [
    RangeField,
    RangeFilter,
  ][]) {
    if (r.min === undefined && r.max === undefined) continue;
    const rest = { ...state.ranges };
    delete rest[field];
    add(`range:${field}`, rangeLabel(field, r), { ranges: rest });
  }
  if (state.fridayEarly !== null)
    add(
      "fe",
      state.fridayEarly ? "Friday early release" : "No Friday early release",
      { fridayEarly: null },
    );
  if (state.startAfter !== null)
    add("sa", `Starts after ${minutesLabel(state.startAfter)}`, {
      startAfter: null,
    });
  if (state.startBefore !== null)
    add("sb", `Starts before ${minutesLabel(state.startBefore)}`, {
      startBefore: null,
    });
  if (state.firstDay && (state.firstDay.from || state.firstDay.to))
    add("fd", `First day: ${dateRangeLabel(state.firstDay)}`, {
      firstDay: null,
    });
  for (const f of state.dq)
    add(`dq:${f}`, DQ_LABELS[f], { dq: without(state.dq, f) });
  for (const s of state.staleSection)
    add(`vs:${s}`, `${cap(s)} out of date`, {
      staleSection: without(state.staleSection, s),
    });
  if (state.bounds) add("bounds", "Within map area", { bounds: null });
  if (center) {
    chips.push({
      id: "center",
      label: `Within ${center.radius} ${center.unit} of ${center.label ?? "map point"}`,
      without:
        centerFrom === "intent"
          ? drop({ q: "" })
          : centerFrom === "operator"
            ? drop({
                q: removePart(
                  parsed,
                  parsed.parts.findIndex((p) => /^near:/i.test(p.raw)),
                ),
              })
            : drop({ center: null }),
    });
  }
  parsed.parts.forEach((p, i) => {
    if (p.kind === "field" || p.kind === "exclude") {
      if (/^(near|within):/i.test(p.raw)) return;
      add(`part:${i}`, p.raw, { q: removePart(parsed, i) });
    }
  });
  return chips;
}

/** For a zero-result search: which single removal would bring results back, with counts. */
export function explainEmpty(
  docs: SchoolSearchDoc[],
  result: SearchResult,
  ctx?: GeoContext,
): { chip: Chip; count: number }[] {
  return result.chips
    .map((chip) => ({
      chip,
      count: runSearch(docs, chip.without, ctx).rows.length,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Closest known name/city word for the first query word that matches nothing. */
export function didYouMean(docs: SchoolSearchDoc[], q: string): string | null {
  const parsed = parseQuery(q);
  const vocab = new Set<string>();
  for (const d of docs) {
    d.nameTokens.forEach((t) => vocab.add(t));
    d.cityTokens.forEach((t) => vocab.add(t));
  }
  for (const p of allPlaces) vocab.add(canon(p.name.toLowerCase()));
  for (const group of parsed.items) {
    for (const atom of group) {
      if (atom.tokens.length !== 1) continue;
      const t = atom.tokens[0];
      if (
        t.length < 4 ||
        vocab.has(t) ||
        docs.some((d) => d.nameTokens.some((x) => x.startsWith(t)))
      )
        continue;
      let best: string | null = null;
      let bestD = maxTypos(t) + 1;
      for (const v of vocab) {
        const d = editDistance(t, v, maxTypos(t) + 1);
        if (d < bestD && d > 0) {
          best = v;
          bestD = d;
        }
      }
      if (best)
        return q.replace(
          new RegExp(atom.raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
          best,
        );
    }
  }
  return null;
}

/** Per-option counts for the filter panel (each facet counted with itself cleared). */
export function computeFacetCounts(
  docs: SchoolSearchDoc[],
  state: SearchState,
  ctx?: GeoContext,
): FacetCounts {
  return facetCounts(docs, state, (s) =>
    runSearch(docs, s, ctx).rows.map((r) => r.doc),
  );
}

export { EMPTY_STATE };
export * from "./labels";
export {
  FACET_GROUPS,
  rangeExtents,
  type FacetCounts,
  type FacetGroupKey,
} from "./facets";
export * from "./state";
export { parseQuery } from "./parse-query";
export { highlight } from "./match";
export {
  resolvePlace,
  placeLabel,
  geoKey,
  parseCode,
  type GeoContext,
  type GeoHit,
} from "./gazetteer";
