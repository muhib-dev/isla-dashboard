"use server";

import { z } from "zod";
import { geocode } from "@/server/geocode";
import { getSession } from "@/server/session";

export type PlaceLookup =
  | { ok: true; lat: number; lng: number; label: string }
  | { ok: false; reason: "forbidden" | "unavailable" | "not_found" | "error" };

/** Last-resort place lookup for the search box, after the offline city/ZIP lists miss. */
export async function lookupPlaceAction(text: string): Promise<PlaceLookup> {
  const session = await getSession();
  if (session.role !== "isla") return { ok: false, reason: "forbidden" };
  const parsed = z.string().trim().min(2).max(120).safeParse(text);
  if (!parsed.success) return { ok: false, reason: "not_found" };
  const r = await geocode(parsed.data);
  if (!r.ok) return r;
  return {
    ok: true,
    lat: r.lat,
    lng: r.lng,
    label: r.label.split(",").slice(0, 2).join(",").trim(),
  };
}
