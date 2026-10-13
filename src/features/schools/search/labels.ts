import type { DataQualityFlag } from "./doc";
import type { RangeField } from "./state";

export const PROGRAM_TAGS = [
  "lunch",
  "halal",
  "freereduced",
  "transportation",
  "quran",
  "arabic",
  "aftercare",
  "athletics",
] as const;
export type ProgramTag = (typeof PROGRAM_TAGS)[number];
export const PROGRAM_LABELS: Record<ProgramTag, string> = {
  lunch: "Lunch offered",
  halal: "All-halal lunch",
  freereduced: "Free/reduced lunch",
  transportation: "Transportation",
  quran: "Qur’an program",
  arabic: "Arabic",
  aftercare: "After-care",
  athletics: "Athletics",
};

export const DQ_LABELS: Record<DataQualityFlag, string> = {
  "no-coords": "No map location",
  "approx-coords": "Approximate location only",
  "no-email": "Missing email",
  "no-phone": "Missing phone",
  "no-website": "Missing website",
  stale: "Profile out of date",
  incomplete: "Profile under 80% complete",
  duplicate: "Possible duplicate",
};

export const RANGE_LABELS: Record<
  RangeField,
  { label: string; unit: "$" | "%" | "" }
> = {
  tuition: { label: "Tuition", unit: "$" },
  founded: { label: "Founded", unit: "" },
  teachers: { label: "Teachers", unit: "" },
  retention: { label: "Retention", unit: "%" },
  salary: { label: "Avg teacher salary", unit: "$" },
};

/** Slider step for each numeric filter; slider ends are rounded out to it. */
export const RANGE_STEP: Record<RangeField, number> = {
  tuition: 250,
  founded: 1,
  teachers: 1,
  retention: 1,
  salary: 1000,
};

export const REGION_NAMES = {
  northeast: "Northeast",
  southeast: "Southeast",
  midwest: "Midwest",
  southwest: "Southwest",
  west: "West",
  canada: "Canada",
} as const;
export const MEMBERSHIP_LABELS = {
  active: "Active",
  grace: "Grace period",
  lapsed: "Lapsed",
  non_member: "Not a member",
} as const;
export const FRESHNESS_LABELS = {
  fresh: "Up to date",
  aging: "Review soon",
  stale: "Out of date",
} as const;
