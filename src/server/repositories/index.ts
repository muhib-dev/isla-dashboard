import "server-only"
import { env } from "@/config/env"
import { createHttpRepositories } from "@/server/adapters/http"
import { createMockRepositories } from "@/server/adapters/mock"
import type { Repositories } from "./types"

/**
 * The single place that decides where data comes from.
 * Flip DATA_SOURCE=http (plus ISLA_API_URL / ISLA_API_TOKEN) to use the real API.
 */
export const repos: Repositories =
  env.DATA_SOURCE === "http"
    ? createHttpRepositories({ baseUrl: env.ISLA_API_URL!, token: env.ISLA_API_TOKEN })
    : createMockRepositories({ latencyMs: env.MOCK_LATENCY_MS })

export type { Repositories } from "./types"
