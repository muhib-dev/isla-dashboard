import "server-only"
import { z } from "zod"

const EnvSchema = z
  .object({
    DATA_SOURCE: z.enum(["mock", "http"]).default("mock"),
    ISLA_API_URL: z.url().optional(),
    ISLA_API_TOKEN: z.string().optional(),
    /** Simulated network latency for the mock adapter, in ms. */
    MOCK_LATENCY_MS: z.coerce.number().int().min(0).default(250),
  })
  .refine((env) => env.DATA_SOURCE !== "http" || env.ISLA_API_URL, {
    message: "ISLA_API_URL is required when DATA_SOURCE=http",
    path: ["ISLA_API_URL"],
  })

export const env = EnvSchema.parse(process.env)
