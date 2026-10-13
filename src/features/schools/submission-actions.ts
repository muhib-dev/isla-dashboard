"use server";

import { updateTag } from "next/cache";
import { geocodeAddress } from "@/server/geocode";
import { allow, clientKey } from "@/server/rate-limit";
import { repos } from "@/server/repositories";
import { getSession } from "@/server/session";
import { invalid, type ActionResult } from "@/lib/validation";
import { z } from "zod";
import { matchSchool } from "./lib";
import { REPORTS_TAG, SCHOOLS_TAG, schoolTag } from "./queries";
import {
  ContactMessageSchema,
  NewReportSchema,
  NewSchoolSchema,
} from "./submissions";

const TOO_MANY: ActionResult = {
  ok: false,
  error:
    "You’ve sent a few of these already. Please try again in a little while.",
};
const WINDOW = 10 * 60_000;

/**
 * Public forms. Each is rate-limited per client and has a honeypot field: bots that fill it
 * get a normal-looking success and nothing is stored.
 */
export async function contactSchoolAction(
  schoolId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = ContactMessageSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.hp) return { ok: true };
  if (!allow(`contact:${await clientKey()}`, 3, WINDOW)) return TOO_MANY;
  const school = await repos.schools.get(z.string().max(80).parse(schoolId));
  // Same answer for "no such school" and "not public", so the form can't probe for pending listings.
  if (!school || school.listing !== "open")
    return { ok: false, error: "This school can’t be contacted right now." };
  const { hp, ...message } = parsed.data;
  void hp;
  await repos.schools.sendContactMessage(school.id, message);
  return { ok: true };
}

export async function submitNewSchoolAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = NewSchoolSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.hp) return { ok: true };
  if (!allow(`new-school:${await clientKey()}`, 3, WINDOW)) return TOO_MANY;

  const { hp, submitterEmail, ...school } = parsed.data;
  void hp;
  const created = await repos.schools.createPending(school);
  // Pin it best-effort; a geocoding failure must never lose the submission.
  try {
    const geo = await geocodeAddress(created.address);
    if (geo.precision !== "none") await repos.schools.setGeo(created.id, geo);
  } catch {}
  await repos.schools.submitReport({
    kind: "new",
    schoolId: created.id,
    schoolName: created.name,
    city: created.address.city,
    state: created.address.state,
    note: "",
    submitterEmail,
  });
  updateTag(SCHOOLS_TAG);
  updateTag(REPORTS_TAG);
  return { ok: true };
}

export async function submitReportAction(
  input: unknown,
): Promise<ActionResult> {
  const parsed = NewReportSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (parsed.data.hp) return { ok: true };
  if (!allow(`report:${await clientKey()}`, 5, WINDOW)) return TOO_MANY;
  const { hp, ...report } = parsed.data;
  void hp;
  // Link the report to the school it names, when that is unambiguous, so approving it can act on that school.
  // It still only changes the listing after staff approve it.
  const schoolId =
    report.schoolId ??
    matchSchool(
      await repos.schools.listAll(),
      report.schoolName,
      report.city,
      report.state,
    ) ??
    undefined;
  await repos.schools.submitReport({ ...report, schoolId });
  updateTag(REPORTS_TAG);
  return { ok: true };
}

/** Staff actions below. */
export async function resolveReportAction(
  id: string,
  decision: "approved" | "dismissed",
): Promise<ActionResult> {
  const session = await getSession();
  if (session.role !== "isla")
    return { ok: false, error: "Only ISLA staff can review reports." };
  const parsedDecision = z.enum(["approved", "dismissed"]).parse(decision);
  const report = await repos.schools.resolveReport(
    z.string().max(80).parse(id),
    parsedDecision,
  );
  updateTag(REPORTS_TAG);
  updateTag(SCHOOLS_TAG);
  if (report.schoolId) updateTag(schoolTag(report.schoolId));
  return { ok: true };
}

/** Staff drag a pin to the right spot. Marked "manual" so address edits don't overwrite it. */
export async function setSchoolLocationAction(
  id: string,
  lat: number,
  lng: number,
): Promise<ActionResult> {
  const session = await getSession();
  if (session.role !== "isla")
    return { ok: false, error: "Only ISLA staff can move a school’s pin." };
  const parsed = z
    .object({
      id: z.string().max(80),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .safeParse({ id, lat, lng });
  if (!parsed.success) return invalid(parsed.error);
  await repos.schools.setGeo(parsed.data.id, {
    lat: Math.round(parsed.data.lat * 1e6) / 1e6,
    lng: Math.round(parsed.data.lng * 1e6) / 1e6,
    precision: "rooftop",
    source: "manual",
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  updateTag(SCHOOLS_TAG);
  updateTag(schoolTag(parsed.data.id));
  return { ok: true };
}
