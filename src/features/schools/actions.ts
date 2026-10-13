"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { ANALYTICS_TAG } from "@/features/analytics/queries";
import { invalid, type ActionResult } from "@/lib/validation";
import { geocodeAddress } from "@/server/geocode";
import { repos } from "@/server/repositories";
import { canManageSchool, getSession } from "@/server/session";
import { SCHOOLS_TAG, schoolTag } from "./queries";
import {
  ProfileSectionSchema,
  SectionPatchSchemas,
  type ProfileSection,
} from "./schema";

export async function updateSchoolSection(
  schoolId: string,
  section: ProfileSection,
  input: unknown,
): Promise<ActionResult> {
  const session = await getSession();
  if (!canManageSchool(session, schoolId))
    return { ok: false, error: "You can't edit this school." };

  const parsedSection = ProfileSectionSchema.parse(section);
  const parsed = SectionPatchSchemas[parsedSection].safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const before =
    parsedSection === "contacts" ? await repos.schools.get(schoolId) : null;
  const updated = await repos.schools.updateSection(
    schoolId,
    parsedSection,
    parsed.data,
  );
  if (
    before &&
    addressChanged(before.address, updated.address) &&
    before.address.geo?.source !== "manual"
  ) {
    // A geocoding hiccup must never fail the save; the old pin is cleared so it can't point at the wrong place.
    try {
      const geo = await geocodeAddress(updated.address);
      await repos.schools.setGeo(
        schoolId,
        geo.precision === "none" ? null : geo,
      );
    } catch {
      await repos.schools.setGeo(schoolId, null).catch(() => {});
    }
  }
  updateTag(schoolTag(schoolId));
  updateTag(SCHOOLS_TAG);
  updateTag(ANALYTICS_TAG);
  return { ok: true };
}

export async function requestProfileUpdates(ids: string[]) {
  const session = await getSession();
  if (session.role !== "isla")
    return { ok: false as const, error: "Only ISLA staff can send requests." };
  const { sent } = await repos.schools.requestUpdate(
    z.array(z.string()).parse(ids),
  );
  return { ok: true as const, sent };
}

function addressChanged(
  a: { street: string; city: string; state: string; postalCode: string },
  b: typeof a,
) {
  return (
    a.street !== b.street ||
    a.city !== b.city ||
    a.state !== b.state ||
    a.postalCode !== b.postalCode
  );
}
