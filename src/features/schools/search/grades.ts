/**
 * Grade ladder: PK3 = -3, PK/PK4/TK = -2 (both map to "pre-k"), K = 0, 1–12 = 1–12.
 * Unparseable labels return null so bad data is flagged, never silently matched.
 */
export function gradeIndex(label: string): number | null {
  if (/^\s*-/.test(label)) return null;
  const t = label
    .trim()
    .toLowerCase()
    .replace(/[\s.\-_]/g, "");
  if (!t) return null;
  if (t === "pk3" || t === "prek3") return -3;
  if (
    [
      "pk",
      "pk4",
      "prek",
      "prek4",
      "tk",
      "preschool",
      "prekindergarten",
    ].includes(t)
  )
    return -2;
  if (["k", "kg", "kindergarten"].includes(t)) return 0;
  const m = /^(?:grade|gr|g)?(\d{1,2})(?:st|nd|rd|th)?$/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 12 ? n : null;
}

export function gradeLabel(index: number): string {
  if (index === -3) return "PK3";
  if (index === -2) return "PK";
  if (index === 0) return "K";
  return String(index);
}

export type GradeSpan = { from: number; to: number } | null;

/** null when either end is unparseable or from > to. */
export function gradeSpanOf(from: string, to: string): GradeSpan {
  const a = gradeIndex(from);
  const b = gradeIndex(to);
  if (a === null || b === null || a > b) return null;
  return { from: a, to: b };
}

/** "5" → serves grade 5; "k-5" / "3..8" → serves every grade in the range. */
export function parseGradeQuery(
  value: string,
): { from: number; to: number } | null {
  const v = value.trim().toLowerCase();
  const parts = v
    .split(/\.\.|–|—|-|\bto\b/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 1) {
    const g = gradeIndex(parts[0]);
    return g === null ? null : { from: g, to: g };
  }
  if (parts.length === 2) {
    const a = gradeIndex(parts[0]);
    const b = gradeIndex(parts[1]);
    if (a === null || b === null) return null;
    return { from: Math.min(a, b), to: Math.max(a, b) };
  }
  return null;
}

export function servesAll(
  span: GradeSpan,
  want: { from: number; to: number },
): boolean {
  return span !== null && span.from <= want.from && span.to >= want.to;
}
