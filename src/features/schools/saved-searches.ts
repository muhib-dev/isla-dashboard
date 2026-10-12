export type SavedSearch = { id: string; name: string; qs: string; savedAt: number }

const KEY = "isla.savedSearches.v1"
const MAX = 20

/** localStorage can be missing, blocked or full, so every access is guarded. */
export function readSaved(): SavedSearch[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    if (!Array.isArray(raw)) return []
    return raw
      .filter((s): s is SavedSearch => !!s && typeof s.id === "string" && typeof s.name === "string" && typeof s.qs === "string")
      .slice(0, MAX)
  } catch {
    return []
  }
}

export function writeSaved(list: SavedSearch[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
    return true
  } catch {
    return false
  }
}

export function addSaved(name: string, qs: string): { list: SavedSearch[]; ok: boolean } {
  const trimmed = name.trim().slice(0, 60) || "Untitled search"
  const next: SavedSearch = { id: crypto.randomUUID?.() ?? String(Date.now()), name: trimmed, qs, savedAt: Date.now() }
  // Same name replaces the old entry instead of piling up duplicates.
  const list = [next, ...readSaved().filter((s) => s.name !== trimmed)].slice(0, MAX)
  return { list, ok: writeSaved(list) }
}
