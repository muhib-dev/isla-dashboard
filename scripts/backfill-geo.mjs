// Adds address.geo to src/data/schools.json from the offline gazetteer.
// Usage: node scripts/backfill-geo.mjs   (re-run after scripts/generate-mock-data.mjs)
// Seed street addresses are fictional, so pins are city-precision.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { PLACES } from "./places-data.mjs"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../src/data")
mkdirSync(join(ROOT, "geo"), { recursive: true })

const places = PLACES.map(([name, state, country, lat, lng, pop]) => ({ name, state, country, lat, lng, pop }))
writeFileSync(join(ROOT, "geo/places.json"), JSON.stringify(places) + "\n")

const file = join(ROOT, "schools.json")
const schools = JSON.parse(readFileSync(file, "utf8"))
const today = new Date().toISOString().slice(0, 10)
let missing = 0
for (const s of schools) {
  const a = s.address
  const hit = places.find((p) => p.name === a.city && p.state === a.state && p.country === a.country)
  if (!hit) { missing++; console.warn(`no place for ${s.id}: ${a.city}, ${a.state}`); continue }
  a.geo = { lat: hit.lat, lng: hit.lng, precision: "city", source: "gazetteer", updatedAt: today }
}
writeFileSync(file, JSON.stringify(schools, null, 2) + "\n")
console.log(`geo set on ${schools.length - missing}/${schools.length} schools, ${places.length} places written`)
