import "server-only";
import { z } from "zod";

const EnvSchema = z
  .object({
    DATA_SOURCE: z.enum(["mock", "http"]).default("mock"),
    ISLA_API_URL: z.url().optional(),
    ISLA_API_TOKEN: z.string().optional(),
    /**
     * Contact email/URL sent in the User-Agent of Nominatim geocoding requests (their usage
     * policy requires it). Without it, geocoding by address/place name is switched off and
     * pins fall back to ZIP and city centroids.
     */
    GEOCODER_CONTACT: z.string().optional(),
    GEOCODER_URL: z.url().default("https://nominatim.openstreetmap.org"),
    /** Simulated network latency for the mock adapter, in ms. */
    MOCK_LATENCY_MS: z.coerce.number().int().min(0).default(250),
  })
  .refine((env) => env.DATA_SOURCE !== "http" || env.ISLA_API_URL, {
    message: "ISLA_API_URL is required when DATA_SOURCE=http",
    path: ["ISLA_API_URL"],
  });

export const env = EnvSchema.parse(process.env);
