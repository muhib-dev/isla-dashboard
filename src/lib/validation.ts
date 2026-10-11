import type { z } from "zod"

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

/** Flattens Zod issues to `{ "leaders.0.email": ["…"] }` so forms can match nested fields. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const issue of error.issues) {
    ;(out[issue.path.join(".")] ??= []).push(issue.message)
  }
  return out
}

export function invalid(error: z.ZodError): ActionResult {
  return { ok: false, error: "Check the highlighted fields.", fieldErrors: fieldErrors(error) }
}
