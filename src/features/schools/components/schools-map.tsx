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
import { LocateFixedIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MembershipStatus } from "@/features/schools/schema";
import type { Bounds } from "@/features/schools/search/geo";
import type { MapView, ResultRow } from "@/features/schools/search";

const STATUS_COLOR: Record<MembershipStatus, string> = {
  active: "#16a34a",
  grace: "#d97706",
  lapsed: "#dc2626",
  non_member: "#6b7280",
};
const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: "Active member",
  grace: "Grace period",
  lapsed: "Lapsed",
  non_member: "Not a member",
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

/** White glyph per status (lucide paths, 24-unit grid) so pins read without relying on color. */
const STATUS_GLYPH: Record<MembershipStatus, string> = {
  active: `<path d="M20 6 9 17l-5-5"/>`,
  grace: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
  lapsed: `<path d="M18 6 6 18M6 6l12 12"/>`,
  non_member: `<path d="M6 12h12"/>`,
};

/** Teardrop pin: status color, white rim, drop shadow, glyph. Dashed and faded = approximate location. */
function pinSvg(
  status: MembershipStatus,
  opts: { approximate: boolean; active: boolean; width: number },
) {
  const h = Math.round(opts.width * (36 / 28));
  const rim = opts.active
    ? `stroke="#111" stroke-width="2"`
    : `stroke="#fff" stroke-width="2"${opts.approximate ? ` stroke-dasharray="3 2"` : ""}`;
  return `<svg width="${opts.width}" height="${h}" viewBox="0 0 28 36" aria-hidden="true" style="display:block;overflow:visible;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.45))"><path d="M14 1.5C7.1 1.5 1.5 6.9 1.5 13.6 1.5 22.6 14 34.5 14 34.5S26.5 22.6 26.5 13.6C26.5 6.9 20.9 1.5 14 1.5Z" fill="${STATUS_COLOR[status]}" fill-opacity="${opts.approximate ? 0.75 : 1}" ${rim}/><g transform="translate(6.5 6) scale(0.625)" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${STATUS_GLYPH[status]}</g></svg>`;
}

const iconCache = new Map<string, L.DivIcon>();

function pin(
  status: MembershipStatus,
  opts: { approximate: boolean; active: boolean },
) {
  const key = `${status}:${opts.approximate}:${opts.active}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const w = opts.active ? 34 : 26;
    const h = Math.round(w * (36 / 28));
    icon = L.divIcon({
      className: "",
      iconSize: [w, h],
      iconAnchor: [w / 2, h - 1], // the tip sits on the location
      html: pinSvg(status, { ...opts, width: w }),
    });
    iconCache.set(key, icon);
  }
  return icon;
}

function clusterIcon(cluster: L.MarkerCluster) {
  const n = cluster.getChildCount();
  const size = n < 10 ? 34 : n < 100 ? 40 : 46;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;display:grid;place-items:center;background:#1e3a8a;color:#fff;font:600 13px system-ui;border:3px solid rgba(255,255,255,.9);box-shadow:0 1px 4px rgba(0,0,0,.35)">${n}</div>`,
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
      icon={pin(editing.status, { approximate: false, active: true })}
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
}: SchoolsMapProps) {
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
    <div className="relative isolate z-0 size-full min-h-72 overflow-hidden rounded-xl ring-1 ring-foreground/10">
      <MapContainer
        center={initialView ? [initialView.lat, initialView.lng] : US_CENTER}
        zoom={initialView?.zoom ?? 4}
        minZoom={2}
        scrollWheelZoom
        className="size-full"
        zoomControl
        // Animations keep running after React unmounts the map (switching views, leaving the page)
        // and throw from inside Leaflet. Instant moves are also friendlier to reduced-motion users.
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        inertia={false}
      >
        <StopOnUnmount />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
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
            pathOptions={{ color: "#1e3a8a", weight: 1.5, fillOpacity: 0.06 }}
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
              icon={pin(doc.membership.status, {
                approximate: doc.precision !== "rooftop",
                active: doc.id === selectedId || doc.id === hoverId,
              })}
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

      <div className="pointer-events-none absolute right-2 bottom-6 z-1000 hidden flex-col gap-1 rounded-lg bg-background/90 px-2.5 py-2 text-xs shadow ring-1 ring-foreground/10 sm:flex">
        {(Object.keys(STATUS_COLOR) as MembershipStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="shrink-0"
              dangerouslySetInnerHTML={{
                __html: pinSvg(s, {
                  approximate: false,
                  active: false,
                  width: 14,
                }),
              }}
            />
            {STATUS_LABEL[s]}
          </span>
        ))}
        <span className="mt-0.5 border-t pt-1 text-muted-foreground">
          Faded, dashed pin = approximate location
        </span>
      </div>

      {/* Sits under Leaflet's zoom buttons (top-left, 10px inset) and matches their size. */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute top-20.5 left-2.5 z-1000 size-8.5 rounded-sm bg-background shadow-sm"
        aria-label="Recenter map on results"
        title="Recenter on results"
        onClick={() => setRecenter((n) => n + 1)}
      >
        <LocateFixedIcon />
      </Button>

      {moved && (
        <div className="absolute top-3 left-1/2 z-1000 -translate-x-1/2">
          <Button
            type="button"
            size="sm"
            className="shadow"
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
          className="absolute inset-x-2 top-2 z-1000 rounded-lg bg-warning/15 px-3 py-2 text-sm ring-1 ring-warning/40"
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
