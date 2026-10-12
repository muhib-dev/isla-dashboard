// Adds type / listing / features / social to src/data/schools.json (deterministic).
// Usage: node scripts/backfill-profile.mjs   (re-run after scripts/generate-mock-data.mjs)
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const file = join(dirname(fileURLToPath(import.meta.url)), "../src/data/schools.json")
const schools = JSON.parse(readFileSync(file, "utf8"))
const FEATURES = ["e_learning", "computer_lab", "library", "uniform", "afterschool_clubs", "dorms", "scholarship", "financial_aid", "sports", "hot_lunch", "science_lab", "sibling_discount", "alumni_association", "staff_discount", "debate_club", "science_olympiad", "robotics_club"]
let seed = 7
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)

// A few non-standard / pending / closed rows so every filter has something to find.
const OVERRIDES = {
  "salam-day-school": { type: "weekend" },
  "ilm-academy": { type: "hifdh" },
  "nur-academy": { type: "preschool" },
  "maple-crescent-school": { listing: "pending" },
  "prairie-light-school": { listing: "closed" },
}

schools.forEach((s) => {
  const o = OVERRIDES[s.id] ?? {}
  s.type = o.type ?? "standard"
  s.listing = o.listing ?? "open"
  s.features = FEATURES.filter(() => rand() < 0.32)
  if (s.programs?.lunch?.offered && !s.features.includes("hot_lunch")) s.features.push("hot_lunch")
  if (s.programs?.athletics?.length && !s.features.includes("sports")) s.features.push("sports")
  s.features = FEATURES.filter((f) => s.features.includes(f))
  const handle = s.id.replace(/-/g, "")
  s.social = rand() < 0.6 ? { facebook: handle, instagram: handle, ...(rand() < 0.3 && { youtube: handle }) } : {}
})
writeFileSync(file, JSON.stringify(schools, null, 2) + "\n")
console.log(`profile fields set on ${schools.length} schools`)
