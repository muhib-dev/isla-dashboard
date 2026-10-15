"use server";

import { z } from "zod";
import { getSession } from "@/server/session";
import { getSchool } from "./queries";
import type { School } from "./schema";

/**
 * Everything the map's detail modal shows beyond the search row. Staff get leaders and
 * emails; everyone else gets the public directory fields only (same rule as toPublicDoc).
 */
export type SchoolDetails = {
  address: Pick<School["address"], "street" | "city" | "state" | "postalCode">;
  phone: string;
  website: string;
  email: string | null;
  social: School["social"];
  leaders: { name: string; role: string; email: string }[] | null;
  programs: School["programs"];
  schedule: School["schedule"];
  memberSince: number | null;
};

export async function getSchoolDetailsAction(
  id: string,
): Promise<SchoolDetails | null> {
  const parsed = z.string().min(1).max(120).safeParse(id);
  if (!parsed.success) return null;
  const [session, school] = await Promise.all([
    getSession(),
    getSchool(parsed.data),
  ]);
  if (!school) return null;
  const staff = session.role === "isla";
  if (!staff && school.listing !== "open") return null;
  const { street, city, state, postalCode } = school.address;
  return {
    address: { street, city, state, postalCode },
    phone: school.phone,
    website: school.website,
    email: staff ? school.email : null,
    social: school.social,
    leaders: staff
      ? school.leadership
          .filter((l) => l.name)
          .map(({ name, role, email }) => ({ name, role, email }))
      : null,
    programs: school.programs,
    schedule: school.schedule,
    memberSince:
      staff && school.membership.status !== "non_member"
        ? school.membership.memberSince
        : null,
  };
}
