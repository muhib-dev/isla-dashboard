import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  buildIndex,
  geoKey,
  parseCode,
  placesFromRows,
  resolvePlace,
  type GeoContext,
  type GeoHit,
  type PlaceIndex,
} from "./gazetteer";
import { parseQuery } from "./parse-query";

/** Server-side twins of geo-client, reading public/geo from disk so first paint already has the center. */
const GEO_DIR = join(process.cwd(), "public/geo");
const files = new Map<string, Promise<unknown>>();

function read<T>(name: string): Promise<T> {
  let p = files.get(name) as Promise<T> | undefined;
  if (!p) {
    p = readFile(join(GEO_DIR, name), "utf8").then((t) => JSON.parse(t) as T);
    files.set(name, p);
    p.catch(() => files.delete(name));
  }
  return p;
}

let index: Promise<PlaceIndex> | null = null;
function placeIndex() {
  index ??= read<Parameters<typeof placesFromRows>[0]>("places.json").then(
    (r) => buildIndex(placesFromRows(r)),
  );
  return index;
}

export async function lookupText(text: string): Promise<GeoHit | null> {
  const code = parseCode(text);
  if (code?.kind === "zip") {
    const row = (
      await read<Record<string, [number, number, string]>>(
        `zip/${code.key.slice(0, 2)}.json`,
      )
    )[code.key];
    return row
      ? { lat: row[0], lng: row[1], label: `${code.key} · ${row[2]}` }
      : null;
  }
  if (code) {
    const row = (
      await read<Record<string, [number, number, string, string]>>(
        "ca-fsa.json",
      )
    )[code.key];
    return row
      ? {
          lat: row[0],
          lng: row[1],
          label: `${code.key} · ${row[2]}, ${row[3]}`,
        }
      : null;
  }
  return resolvePlace(text, await placeIndex());
}

/**
 * Pre-resolves the ZIP / postal code / place named in the URL's `q`, so the server render
 * and the client's first render agree. Misses are left out and resolved (or nulled) client-side.
 */
export async function seedGeoContext(
  q: string | undefined,
): Promise<GeoContext> {
  const resolved: GeoContext["resolved"] = {};
  if (!q) return { resolved };
  const trimmed = q.trim().slice(0, 200);
  const text = parseCode(trimmed) ? trimmed : parseQuery(trimmed).near;
  if (!text) return { resolved };
  try {
    const hit = await lookupText(text);
    if (hit) resolved[geoKey(text)] = hit;
  } catch {
    // Missing/corrupt geo files just mean the client resolves it.
  }
  return { resolved };
}
