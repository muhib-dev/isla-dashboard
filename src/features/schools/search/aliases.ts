/** Spelling variants that should match each other. First entry is the canonical form. */
const GROUPS: string[][] = [
  ["noor", "nur", "nour", "nuur"],
  ["iqra", "iqraa", "iqrah", "iqrae"],
  ["huda", "hoda", "houda", "hudaa"],
  ["furqan", "furqaan", "forqan"],
  ["ihsan", "ehsan", "ihsaan", "ahsan"],
  ["madinah", "medina", "madina", "madeena"],
  ["makkah", "mecca", "makka"],
  ["rahmah", "rahma", "rahmaa"],
  ["sakinah", "sakina", "sakeena"],
  ["hikmah", "hikma", "hikmat"],
  ["tawheed", "tawhid", "tawhead", "tauheed"],
  ["salam", "salaam", "salem"],
  ["ilm", "elm", "ilmu"],
  ["islamic", "islaamic", "islami", "islam"],
  ["quran", "koran", "quraan", "qur'an", "quranic"],
  ["muhammad", "mohammad", "mohammed", "muhammed", "mohamed"],
  ["academy", "acad", "academie"],
  ["school", "sch", "skool"],
  ["prep", "preparatory", "preparatoire"],
  ["saint", "st"],
  // Arabic definite article and its common romanizations.
  ["al", "ul", "el", "al-", "l"],
  ["dar", "darul", "daar", "darus"],
];

const CANON = new Map<string, string>();
for (const [head, ...rest] of GROUPS) for (const t of rest) CANON.set(t, head);

export function canon(token: string): string {
  return CANON.get(token) ?? token;
}

/** Words that appear in most school names; matched but ranked low. */
export const STOPWORDS = new Set([
  "the",
  "of",
  "and",
  "school",
  "academy",
  "islamic",
  "al",
  "prep",
  "for",
  "a",
]);
