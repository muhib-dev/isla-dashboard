// Builds the static lookup files behind ZIP / postal-code / place search.
// Source: GeoNames (CC BY 4.0, https://www.geonames.org). Download, unzip, then:
//   curl -O https://download.geonames.org/export/zip/US.zip
//   curl -O https://download.geonames.org/export/zip/CA.zip
//   curl -O https://download.geonames.org/export/dump/cities15000.zip
//   node scripts/build-geo-data.mjs <dir containing US.txt CA.txt cities15000.txt>
// Output (public/geo): zip/<first 2 digits>.json, ca-fsa.json, places.json
import { mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const src = process.argv[2]
if (!src) { console.error("usage: node scripts/build-geo-data.mjs <dir>"); process.exit(1) }
const OUT = join(dirname(fileURLToPath(import.meta.url)), "../public/geo")
rmSync(OUT, { recursive: true, force: true })
mkdirSync(join(OUT, "zip"), { recursive: true })
const rows = (f) => readFileSync(join(src, f), "utf8").split("\n").filter(Boolean).map((l) => l.split("\t"))
const r4 = (n) => Math.round(Number(n) * 1e4) / 1e4

// US ZIP → [lat, lng, "City, ST"], sharded by the first two digits.
const shards = {}
for (const c of rows("US.txt")) {
  const [, zip, city, , st, , , , , lat, lng] = c
  if (!/^\d{5}$/.test(zip) || !lat || !lng) continue
  ;(shards[zip.slice(0, 2)] ??= {})[zip] = [r4(lat), r4(lng), `${city}, ${st}`]
}
for (const [k, v] of Object.entries(shards)) writeFileSync(join(OUT, `zip/${k}.json`), JSON.stringify(v))

// Canadian FSA (first three characters of the postal code).
const fsa = {}
for (const c of rows("CA.txt")) {
  const [, code, name, , prov, , , , , lat, lng] = c
  if (code && lat && lng) fsa[code.toUpperCase()] = [r4(lat), r4(lng), name, prov]
}
writeFileSync(join(OUT, "ca-fsa.json"), JSON.stringify(fsa))

// Cities ≥15k people: [name, state/province, country 0=US 1=CA, lat, lng, population].
const CA_PROV = { "01": "AB", "02": "BC", "03": "MB", "04": "NB", "05": "NL", "07": "NS", "08": "ON", "09": "PE", "10": "QC", "11": "SK", "12": "YT", "13": "NT", "14": "NU" }
const places = []
for (const c of rows("cities15000.txt")) {
  const [, name, , , lat, lng, , , cc, , admin1, , , , pop] = c
  if (cc !== "US" && cc !== "CA") continue
  const st = cc === "CA" ? CA_PROV[admin1] : admin1
  if (!st) continue
  places.push([name, st, cc === "CA" ? 1 : 0, r4(lat), r4(lng), Number(pop)])
}
places.sort((a, b) => b[5] - a[5])
writeFileSync(join(OUT, "places.json"), JSON.stringify(places))
console.log(`zip shards: ${Object.keys(shards).length}, fsa: ${Object.keys(fsa).length}, places: ${places.length}`)
