import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { repos } from "@/server/repositories";
import { completeness, freshnessOf, oldestVerified } from "./lib";
import {
  markDuplicates,
  toPublicDoc,
  toSearchDoc,
  type SchoolSearchDoc,
} from "./search/doc";
import type { SchoolFilter } from "./schema";

export const schoolTag = (id: string) => `school-${id}`;
export const SCHOOLS_TAG = "schools";
export const REPORTS_TAG = "school-reports";

export async function getSchool(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_TAG, schoolTag(id));
  return repos.schools.get(id);
}

export async function listSchools(filter: SchoolFilter) {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_TAG);
  const now = Date.now();
  const rows = await repos.schools.list(filter);
  return rows.map((row) => ({
    ...row,
    freshness: freshnessOf(row.oldestVerifiedAt, now),
  }));
}

/**
 * One cached copy of every school, normalized for the search engine. Filters run
 * on this list in memory (server for first paint, client afterwards), so there is
 * a single cache entry instead of one per filter combination.
 * `staffFields` adds leader names and email domains to the searchable text.
 */
export async function getSchoolSearchIndex(staffFields: boolean) {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_TAG);
  const now = Date.now();
  const schools = await repos.schools.listAll();
  return markDuplicates(
    schools.map((s) => toSearchDoc(s, now, { staffFields })),
    schools,
    staffFields,
  );
}

/** Open schools only, with every staff-only field removed. Safe to ship to anonymous visitors. */
export async function getPublicSearchIndex() {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_TAG);
  const now = Date.now();
  const schools = await repos.schools.listAll();
  return schools
    .map((s) => toPublicDoc(toSearchDoc(s, now, { staffFields: false })))
    .filter((d): d is SchoolSearchDoc => d !== null);
}

export async function listSchoolReports() {
  "use cache";
  cacheLife("minutes");
  cacheTag(REPORTS_TAG);
  return repos.schools.listReports();
}

/** How many schools can be pinned on the map, and how many of those are at an exact address. */
export async function getMapCoverage() {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_TAG);
  const schools = await repos.schools.listAll();
  const open = schools.filter((s) => s.listing !== "closed");
  const mapped = open.filter(
    (s) => s.address.geo && s.address.geo.precision !== "none",
  );
  return {
    total: open.length,
    mapped: mapped.length,
    exact: mapped.filter((s) => s.address.geo!.precision === "rooftop").length,
  };
}

export async function getSchoolHealth(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(SCHOOLS_TAG, schoolTag(id));
  const school = await repos.schools.get(id);
  if (!school) return null;
  const now = Date.now();
  const { score, tasks } = completeness(school, now);
  return {
    score,
    tasks,
    oldestVerifiedAt: oldestVerified(school),
    freshness: Object.fromEntries(
      Object.entries(school.verifiedAt).map(([section, date]) => [
        section,
        freshnessOf(date, now),
      ]),
    ) as Record<keyof typeof school.verifiedAt, ReturnType<typeof freshnessOf>>,
  };
}
