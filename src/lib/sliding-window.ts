/** True while `key` is under `limit` hits per `windowMs`; records the hit. Pure, so it's testable. */
export function slidingWindow(store: Map<string, number[]>, key: string, limit: number, windowMs: number, now: number): boolean {
  const recent = (store.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    store.set(key, recent)
    return false
  }
  recent.push(now)
  store.set(key, recent)
  if (store.size > 5000) for (const [k, v] of store) if (!v.some((t) => now - t < windowMs)) store.delete(k)
  return true
}
