import "server-only"
import { headers } from "next/headers"
import { slidingWindow } from "@/lib/sliding-window"

/**
 * In-memory limiter, enough to blunt form spam on a single instance.
 * Behind several instances or serverless, back it with a shared store (Redis, the API).
 */
const g = globalThis as typeof globalThis & { __islaRate?: Map<string, number[]> }
const hits: Map<string, number[]> = (g.__islaRate ??= new Map())

export async function clientKey(): Promise<string> {
  const h = await headers()
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown"
}

export function allow(key: string, limit: number, windowMs: number): boolean {
  return slidingWindow(hits, key, limit, windowMs, Date.now())
}
