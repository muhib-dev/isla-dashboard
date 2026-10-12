const R_MI = 3958.7613
const R_KM = 6371.0088

export type Unit = "mi" | "km"

const rad = (d: number) => (d * Math.PI) / 180

export function distance(aLat: number, aLng: number, bLat: number, bLng: number, unit: Unit): number {
  const dLat = rad(bLat - aLat)
  const dLng = rad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * (unit === "mi" ? R_MI : R_KM) * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const RADIUS_MIN = 5
export const RADIUS_MAX = 250
export const clampRadius = (r: number) => Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, Math.round(r)))

export type Bounds = { south: number; west: number; north: number; east: number }

/** Handles boxes that cross the antimeridian (west > east). */
export function inBounds(lat: number, lng: number, b: Bounds): boolean {
  if (lat < b.south || lat > b.north) return false
  return b.west <= b.east ? lng >= b.west && lng <= b.east : lng >= b.west || lng <= b.east
}
