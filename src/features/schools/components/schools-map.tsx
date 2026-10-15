"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import "leaflet.markercluster";
import MarkerClusterGroup from "react-leaflet-cluster";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { useTheme } from "next-themes";
import { LocateFixedIcon, MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MembershipStatus } from "@/features/schools/schema";
import type { Bounds } from "@/features/schools/search/geo";
import type { MapView, ResultRow } from "@/features/schools/search";

/** Design-token colors, resolved by the browser (pins are inline SVG in the page). */
const STATUS_COLOR: Record<MembershipStatus, string> = {
  active: "var(--member-active)",
  grace: "var(--member-grace)",
  lapsed: "var(--member-lapsed)",
  non_member: "var(--member-none)",
};
const ALL_STATUSES = Object.keys(STATUS_COLOR) as MembershipStatus[];
const STATUS_BG: Record<MembershipStatus, string> = {
  active: "bg-member-active",
  grace: "bg-member-grace",
  lapsed: "bg-member-lapsed",
  non_member: "",
};
const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: "Active",
  grace: "Grace",
  lapsed: "Lapsed",
  non_member: "Not a member",
};

/** Esri's quiet gray canvas basemaps, one per theme, so pins and clusters carry the color. */
const TILE_URL = {
  light:
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  dark: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
};

const US_CENTER: [number, number] = [39.5, -96];
/**
 * Leaflet keeps a `_leaflet_id` on the container div and refuses to start a second map on it
 * ("Map container is being reused by another instance"). If tearing a map down ever fails
 * part-way (Fast Refresh, Strict Mode's double mount, a plugin throwing in cleanup) that marker
 * is left behind and every later mount on the same node fails too. So: never let teardown
 * throw, and clear a stale marker before a new map starts.
 */
type MapInternals = L.Map & {
  _container?: HTMLElement & { _leaflet_id?: number };
};
const mapProto = L.Map.prototype as unknown as {
  remove: (this: MapInternals) => unknown;
  _initContainer: (this: MapInternals, id: string | HTMLElement) => unknown;
  __patched?: boolean;
};
if (!mapProto.__patched) {
  const originalRemove = mapProto.remove;
  mapProto.remove = function (this: MapInternals) {
    try {
      return originalRemove.call(this);
    } catch (error) {
      console.warn("Leaflet map teardown error (ignored):", error);
      if (this._container) delete this._container._leaflet_id;
      return this;
    }
  };
  const originalInit = mapProto._initContainer;
  mapProto._initContainer = function (
    this: MapInternals,
    id: string | HTMLElement,
  ) {
    const container = (
      typeof id === "string" ? document.getElementById(id) : id
    ) as (HTMLElement & { _leaflet_id?: number }) | null;
    if (container?._leaflet_id) delete container._leaflet_id;
    return originalInit.call(this, id);
  };
  mapProto.__patched = true;
}

/**
 * Round dot in the member color with a card-colored rim; the selected pin is larger with a focus
 * ring. Non-members are hollow: card fill with a member-none ring drawn as an inset shadow.
 */
function pinHtml(status: MembershipStatus, size: number, selected: boolean) {
  const rim = selected ? 4 : 3;
  const shadow = selected
    ? "0 0 0 3px var(--ring),0 1px 4px rgba(0,0,0,.35)"
    : "0 1px 4px rgba(0,0,0,.35)";
  const fill =
    status === "non_member"
      ? `background:var(--card);box-shadow:inset 0 0 0 3px var(--member-none),${shadow}`
      : `background:${STATUS_COLOR[status]};box-shadow:${shadow}`;
  return `<span aria-hidden="true" style="display:block;box-sizing:border-box;width:${size}px;height:${size}px;border-radius:9999px;border:${rim}px solid var(--card);${fill}"></span>`;
}

const iconCache = new Map<string, L.DivIcon>();

function pin(status: MembershipStatus, mode: "rest" | "hover" | "selected") {
  const key = `${status}:${mode}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const size = mode === "selected" ? 28 : mode === "hover" ? 24 : 20;
    icon = L.divIcon({
      className: "",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      html: pinHtml(status, size, mode === "selected"),
    });
    iconCache.set(key, icon);
  }
  return icon;
}

/** Navy circle with a soft 5px halo and the count in 600. */
const CLUSTER_STYLE =
  "border-radius:9999px;display:grid;place-items:center;background:var(--primary);color:var(--primary-foreground);font-weight:600;font-size:14px;line-height:1;box-shadow:0 0 0 5px color-mix(in oklch, var(--primary) 22%, transparent),0 2px 6px rgba(0,0,0,.2)";

function clusterIcon(cluster: L.MarkerCluster) {
  const n = cluster.getChildCount();
  const size = n > 100 ? 52 : n > 50 ? 44 : 38;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    html: `<div style="width:${size}px;height:${size}px;${CLUSTER_STYLE}">${n}</div>`,
  });
}

/**
 * leaflet.markercluster's onRemove reads `map._mapPane.className`. When React tears down the whole
 * map, Leaflet deletes `_mapPane` before removing layers, so that line threw
 * "Cannot read properties of undefined (reading 'className')" and the error boundary showed
 * "The map couldn't load". Give it a throwaway pane for the duration of the cleanup.
 */
const clusterProto = L.MarkerClusterGroup.prototype as unknown as {
  onRemove: (map: L.Map) => void;
  __patched?: boolean;
};
if (!clusterProto.__patched) {
  const original = clusterProto.onRemove;
  clusterProto.onRemove = function (
    this: unknown,
    map: L.Map & { _mapPane?: HTMLElement },
  ) {
    if (map._mapPane) return original.call(this, map);
    map._mapPane = document.createElement("div");
    try {
      return original.call(this, map);
    } finally {
      delete map._mapPane;
    }
  };
  clusterProto.__patched = true;
}

/** True while we move the map ourselves, so that moveend isn't mistaken for the user panning. */
const programmatic = { current: false };

/** Marks the next moveend as ours (fit/fly), so it isn't mistaken for the user panning. */
function markProgrammatic() {
  programmatic.current = true;
  setTimeout(() => {
    programmatic.current = false;
  }, 1200);
}

/** Refits when the *set* of results changes, not on every re-render or hover. */
function FitToResults({
  points,
  skipFirst,
  fitSignal,
  autoFit,
}: {
  points: [number, number][];
  skipFirst: boolean;
  fitSignal: number;
  autoFit: boolean;
}) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  const first = useRef(true);
  const lastSignal = useRef(fitSignal);
  useEffect(() => {
    const isFirst = first.current;
    first.current = false;
    const forced = fitSignal !== lastSignal.current;
    lastSignal.current = fitSignal;
    if (isFirst && skipFirst) return;
    // While "Search this area" is active the user chose the view; only the Fit button moves it.
    if (!autoFit && !forced) return;
    if (!points.length) {
      // Nothing to fit: a recenter request goes back to the whole-continent view.
      if (forced) {
        markProgrammatic();
        map.setView(US_CENTER, 4, { animate: false });
      }
      return;
    }
    markProgrammatic();
    if (points.length === 1) map.setView(points[0], 10, { animate: false });
    else
      map.fitBounds(L.latLngBounds(points), {
        padding: [40, 40],
        maxZoom: 10,
        animate: false,
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key stands in for points
  }, [key, fitSignal, map]);
  return null;
}

function StopOnUnmount() {
  const map = useMap();
  useEffect(
    () => () => {
      try {
        map.stop();
      } catch {}
    },
    [map],
  );
  return null;
}

function ViewReporter({
  onChange,
  onUserMove,
}: {
  onChange: (v: MapView) => void;
  onUserMove: (b: Bounds) => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef({ onChange, onUserMove });
  useLayoutEffect(() => {
    latest.current = { onChange, onUserMove };
  });
  // Must be one stable object: useMapEvents re-subscribes whenever it changes, and a sibling's
  // effect (fit / recenter / fly) can fire moveend during that gap, so the view never reached the URL.
  const handlers = useMemo<L.LeafletEventHandlerFnMap>(
    () => ({
      moveend(e) {
        clearTimeout(timer.current);
        const m = e.target as L.Map;
        if (programmatic.current) programmatic.current = false;
        else {
          const b = m.getBounds();
          latest.current.onUserMove({
            south: b.getSouth(),
            west: b.getWest(),
            north: b.getNorth(),
            east: b.getEast(),
          });
        }
        timer.current = setTimeout(() => {
          const c = m.getCenter();
          latest.current.onChange({
            lat: c.lat,
            lng: c.lng,
            zoom: m.getZoom(),
          });
        }, 400);
      },
    }),
    [],
  );
  useMapEvents(handlers);
  useEffect(() => () => clearTimeout(timer.current), []);
  return null;
}

function FlyToSelected({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    markProgrammatic();
    const z = Math.max(map.getZoom(), 9);
    map.setView(target, z, { animate: false });
  }, [target, map]);
  return null;
}

function EditPin({
  editing,
  onMove,
}: {
  editing: { lat: number; lng: number; status: MembershipStatus };
  onMove: (lat: number, lng: number) => void;
}) {
  useMapEvents({ click: (e) => onMove(e.latlng.lat, e.latlng.lng) });
  return (
    <Marker
      position={[editing.lat, editing.lng]}
      icon={pin(editing.status, "selected")}
      draggable
      zIndexOffset={1000}
      title="Drag to the exact location"
      eventHandlers={{
        dragend: (e) => {
          const p = (e.target as L.Marker).getLatLng();
          onMove(p.lat, p.lng);
        },
      }}
    />
  );
}

export type SchoolsMapProps = {
  rows: ResultRow[];
  center: {
    lat: number;
    lng: number;
    radius: number;
    unit: "mi" | "km";
  } | null;
  selectedId: string | null;
  hoverId: string | null;
  initialView: MapView | null;
  onSelect: (id: string) => void;
  onViewChange: (v: MapView) => void;
  /** Bump to re-center on the current results. */
  fitSignal: number;
  /** False while a map-area filter is active, so results don't yank the view away. */
  autoFit: boolean;
  boundsActive: boolean;
  onSearchArea: (b: Bounds) => void;
  /** Staff pin-adjust mode: this school's pin is draggable and the map click moves it. */
  editing: {
    id: string;
    lat: number;
    lng: number;
    status: MembershipStatus;
  } | null;
  onEditMove: (lat: number, lng: number) => void;
  /** Statuses to explain in the legend (the public map only has members and non-members). */
  legendStatuses?: MembershipStatus[];
};

export default function SchoolsMap({
  rows,
  center,
  selectedId,
  hoverId,
  initialView,
  onSelect,
  onViewChange,
  fitSignal,
  autoFit,
  boundsActive,
  onSearchArea,
  editing,
  onEditMove,
  legendStatuses = ALL_STATUSES,
}: SchoolsMapProps) {
  const { resolvedTheme } = useTheme();
  const [map, setMap] = useState<L.Map | null>(null);
  const [moved, setMoved] = useState<Bounds | null>(null);
  // On-map "Recenter" adds to the parent's fit signal (the ⋯ menu's "Fit map to results").
  const [recenter, setRecenter] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const mapped = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.doc.lat !== null && r.doc.lng !== null && r.doc.id !== editing?.id,
      ),
    [rows, editing?.id],
  );
  const points = useMemo(
    () => mapped.map((r) => [r.doc.lat!, r.doc.lng!] as [number, number]),
    [mapped],
  );

  // Fly when selection comes from the list, not from clicking the marker itself.
  const lastClicked = useRef<string | null>(null);
  const select = useCallback(
    (id: string) => {
      lastClicked.current = id;
      onSelect(id);
    },
    [onSelect],
  );
  useEffect(() => {
    if (!selectedId || lastClicked.current === selectedId) {
      lastClicked.current = null;
      return;
    }
    const r = mapped.find((m) => m.doc.id === selectedId);
    setFlyTarget(r ? [r.doc.lat!, r.doc.lng!] : null);
  }, [selectedId, mapped]);

  const radiusMeters = center
    ? center.radius * (center.unit === "mi" ? 1609.344 : 1000)
    : 0;

  return (
    <div className="relative isolate z-0 size-full min-h-72 overflow-hidden">
      <MapContainer
        ref={setMap}
        center={initialView ? [initialView.lat, initialView.lng] : US_CENTER}
        zoom={initialView?.zoom ?? 4}
        minZoom={2}
        maxZoom={16}
        scrollWheelZoom
        className="size-full"
        zoomControl={false}
        // Animations keep running after React unmounts the map (switching views, leaving the page)
        // and throw from inside Leaflet. Instant moves are also friendlier to reduced-motion users.
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        inertia={false}
      >
        <StopOnUnmount />
        <TileLayer
          attribution="Tiles &copy; Esri"
          url={TILE_URL[resolvedTheme === "dark" ? "dark" : "light"]}
          maxZoom={16}
          eventHandlers={{
            tileerror: () => setTilesFailed(true),
            tileload: () => setTilesFailed(false),
          }}
        />
        <FitToResults
          points={points}
          skipFirst={!!initialView}
          fitSignal={fitSignal + recenter}
          autoFit={autoFit}
        />
        <FlyToSelected target={flyTarget} />
        <ViewReporter onChange={onViewChange} onUserMove={setMoved} />
        {editing && <EditPin editing={editing} onMove={onEditMove} />}
        {center && (
          <Circle
            center={[center.lat, center.lng]}
            radius={radiusMeters}
            // Token colors via CSS classes; they override Leaflet's stroke/fill attributes.
            pathOptions={{
              className: "stroke-primary fill-primary",
              weight: 1.5,
              fillOpacity: 0.06,
            }}
          />
        )}
        <MarkerClusterGroup
          animate={false}
          animateAddingMarkers={false}
          chunkedLoading
          iconCreateFunction={clusterIcon}
          maxClusterRadius={45}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
        >
          {mapped.map(({ doc }) => (
            <Marker
              key={doc.id}
              position={[doc.lat!, doc.lng!]}
              icon={pin(
                doc.membership.status,
                doc.id === selectedId
                  ? "selected"
                  : doc.id === hoverId
                    ? "hover"
                    : "rest",
              )}
              zIndexOffset={doc.id === selectedId ? 1000 : 0}
              title={`${doc.name}, ${doc.city}, ${doc.state}`}
              alt={`${doc.name}, ${doc.city}`}
              eventHandlers={{
                click: () => select(doc.id),
                keypress: (e) => {
                  if ((e.originalEvent as KeyboardEvent).key === "Enter")
                    select(doc.id);
                },
              }}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <div
        className={cn(
          "pointer-events-none absolute bottom-6 left-4 z-1000 hidden flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border bg-card px-3 py-2 text-[13px] font-medium shadow-sm sm:flex",
        )}
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid size-4.5 shrink-0 place-items-center rounded-full bg-primary text-[10px] leading-none font-semibold text-primary-foreground"
          >
            12
          </span>
          Cluster
        </span>
        {legendStatuses.map((s) => (
          <span key={s} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "size-2.5 shrink-0 rounded-full",
                s === "non_member"
                  ? "border-[1.5px] border-member-none"
                  : STATUS_BG[s],
              )}
            />
            {STATUS_LABEL[s]}
          </span>
        ))}
      </div>

      <div className="absolute top-4 right-4 z-1000 flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-md border bg-card shadow-sm">
          <button
            type="button"
            className="grid size-10 place-items-center text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            aria-label="Zoom in"
            title="Zoom in"
            disabled={!map}
            onClick={() => map?.zoomIn()}
          >
            <PlusIcon className="size-4.5" />
          </button>
          <span aria-hidden className="h-px bg-border" />
          <button
            type="button"
            className="grid size-10 place-items-center text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            aria-label="Zoom out"
            title="Zoom out"
            disabled={!map}
            onClick={() => map?.zoomOut()}
          >
            <MinusIcon className="size-4.5" />
          </button>
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-md border bg-card text-foreground shadow-sm transition-colors hover:bg-accent"
          aria-label="Recenter map on results"
          title="Recenter on results"
          onClick={() => setRecenter((n) => n + 1)}
        >
          <LocateFixedIcon className="size-4.5" />
        </button>
      </div>

      {moved && (
        <div className="absolute top-3 left-1/2 z-1000 -translate-x-1/2">
          <Button
            type="button"
            size="sm"
            className="shadow-md"
            onClick={() => {
              onSearchArea(moved);
              setMoved(null);
            }}
          >
            {boundsActive ? "Update to this area" : "Search this area"}
          </Button>
        </div>
      )}

      {tilesFailed && (
        <div
          role="status"
          className="absolute top-4 right-18 left-4 z-1000 rounded-lg border border-[color-mix(in_oklch,var(--warning)_25%,var(--border))] bg-warning-subtle px-3 py-2 text-sm"
        >
          Map tiles couldn’t load. Check your connection — the list still works.
        </div>
      )}
      {!mapped.length && (
        <div className="pointer-events-none absolute inset-0 z-500 grid place-items-center bg-background/60 text-sm text-muted-foreground">
          No schools with a map location in these results.
        </div>
      )}
    </div>
  );
}
