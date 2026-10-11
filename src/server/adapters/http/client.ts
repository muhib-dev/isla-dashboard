import "server-only"
import type { z } from "zod"

export type HttpClientOptions = { baseUrl: string; token?: string }

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    message: string,
  ) {
    super(`ISLA API ${status} on ${path}: ${message}`)
  }
}

type Query = Record<string, string | number | boolean | undefined | null>

/**
 * Thin fetch wrapper. Every response is parsed with the feature's Zod schema,
 * so contract drift fails loudly at the boundary instead of deep in the UI.
 * Caching is handled one layer up ('use cache' in features/*\/queries.ts).
 */
export function createHttpClient({ baseUrl, token }: HttpClientOptions) {
  async function request<T>(method: string, path: string, schema: z.ZodType<T>, init?: { query?: Query; body?: unknown }) {
    const url = new URL(path.replace(/^\//, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`)
    for (const [key, value] of Object.entries(init?.query ?? {})) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value))
    }

    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        ...(init?.body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    })

    if (!res.ok) throw new ApiError(res.status, path, await res.text().catch(() => res.statusText))
    if (res.status === 204) return schema.parse(null)
    return schema.parse(await res.json())
  }

  return {
    get: <T>(path: string, schema: z.ZodType<T>, query?: Query) => request("GET", path, schema, { query }),
    post: <T>(path: string, schema: z.ZodType<T>, body: unknown) => request("POST", path, schema, { body }),
    patch: <T>(path: string, schema: z.ZodType<T>, body: unknown) => request("PATCH", path, schema, { body }),
    /** GET that maps 404 to null. */
    find: async <T>(path: string, schema: z.ZodType<T>) => {
      try {
        return await request("GET", path, schema)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
  }
}

export type HttpClient = ReturnType<typeof createHttpClient>
