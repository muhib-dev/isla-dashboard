import { canon } from "./aliases";

/**
 * Search normalization: lowercase, strip Latin diacritics and Arabic marks,
 * drop apostrophes, turn every other symbol (hyphens, dots, emoji) into a space.
 * "Al-Noor" / "al noor" / "AL‑NŪR" all collapse to comparable forms.
 */
export function normalize(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // combining marks
    .replace(/[ً-ٰٟـ]/g, "") // tashkeel, superscript alef, tatweel
    .replace(/[ٱآأإ]/g, "ا") // alef variants → alef
    .replace(/ى/g, "ي") // alef maqsura → yaa
    .replace(/ة/g, "ه") // taa marbuta → haa
    .toLowerCase()
    .replace(/['’ʼ‘`´]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalized tokens with aliases collapsed to one canonical spelling. */
export function tokenize(input: string): string[] {
  const n = normalize(input);
  return n ? n.split(" ").map(canon) : [];
}

/** Optimal-string-alignment distance (Damerau–Levenshtein) with an early exit. */
export function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2: number[] = [];
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2.length = 0;
    prev2.push(...prev);
    prev = cur;
  }
  return prev[b.length];
}

/** Typo budget by token length: short words must match exactly. */
export function maxTypos(token: string): number {
  if (token.length <= 3) return 0;
  if (token.length <= 7) return 1;
  return 2;
}
