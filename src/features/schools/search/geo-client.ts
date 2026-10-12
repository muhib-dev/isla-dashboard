import { placesFromRows, buildIndex, resolvePlace, type GeoHit, type PlaceIndex } from "./gazetteer"
import { parseCode } from "./gazetteer"

/** Browser-side loaders for the static files in public/geo. Each file is fetched once. */

type ZipShard = Record<string, [number, number, string]>
const memo = new Map<string, Promise<unknown>>()

function once<T>(url: string): Promise<T> {
  let p = memo.get(url) as Promise<T> | undefined
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url}: ${r.status}`)
      return r.json() as Promise<T>
    })
    // A failed fetch must be retryable, so don't keep a rejected promise.
    p.catch(() => memo.delete(url))
    memo.set(url, p)
  }
  return p
}

export async function lookupCode(text: string): Promise<GeoHit | null> {
  const code = parseCode(text)
  if (!code) return null
  if (code.kind === "zip") {
    const shard = await once<ZipShard>(`/geo/zip/${code.key.slice(0, 2)}.json`)
    const row = shard[code.key]
    return row ? { lat: row[0], lng: row[1], label: `${code.key} · ${row[2]}` } : null
  }
  const fsa = await once<Record<string, [number, number, string, string]>>("/geo/ca-fsa.json")
  const row = fsa[code.key]
  return row ? { lat: row[0], lng: row[1], label: `${code.key} · ${row[2]}, ${row[3]}` } : null
}

let index: Promise<PlaceIndex> | null = null
/** ~3,900 US/CA cities (≥15k people), fetched on first use. */
export function loadPlaceIndex(): Promise<PlaceIndex> {
  index ??= once<Parameters<typeof placesFromRows>[0]>("/geo/places.json").then((rows) => buildIndex(placesFromRows(rows)))
  index.catch(() => { index = null })
  return index
}

export async function lookupPlace(text: string): Promise<GeoHit | null> {
  return resolvePlace(text, await loadPlaceIndex())
}
