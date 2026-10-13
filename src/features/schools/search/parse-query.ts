import { parseGradeQuery } from "./grades";
import { tokenize } from "./normalize";
import { stateCode } from "./states";

export const MAX_QUERY_LENGTH = 200;

export type Range = {
  min?: number;
  max?: number;
  minExclusive?: boolean;
  maxExclusive?: boolean;
};
export type RangeKey = "tuition" | "enrolled" | "founded";

export type TextAtom = {
  /** Canonical tokens. One for a plain word, several for quoted phrases and hyphenated words. */
  tokens: string[];
  phrase: boolean;
  /** True when the user typed the word in capitals, e.g. "TX". Gates 2-letter state-code matching. */
  upper: boolean;
  raw: string;
};

export type FieldFilter = { negate: boolean; raw: string } & (
  | { key: "state"; codes: string[] }
  | { key: "city"; tokens: string[][] }
  | { key: "zip"; prefix: string }
  | { key: "grade"; from: number; to: number }
  | { key: "range"; field: RangeKey; range: Range }
  | { key: "accredited"; mode: "yes" | "no" | "agency"; agency?: string[] }
  | { key: "has"; tags: string[] }
);

export type QueryPart = {
  raw: string;
  kind: "text" | "or" | "exclude" | "field";
};

export type ParsedQuery = {
  /** AND of OR-groups: `a | b c` → [[a, b], [c]]. */
  items: TextAtom[][];
  exclude: TextAtom[];
  fields: FieldFilter[];
  near?: string;
  within?: { value: number; unit: "mi" | "km" };
  /** Operators that were recognised but had unusable values; shown to the user. */
  notes: string[];
  /** Source fragments in order, so a chip can be removed by rebuilding the query. */
  parts: QueryPart[];
};

const FIELD_KEYS = new Set([
  "state",
  "city",
  "zip",
  "grade",
  "tuition",
  "enrolled",
  "founded",
  "accredited",
  "has",
  "near",
  "within",
]);

/** Program/feature flags `has:` understands. Values are doc.tags entries. */
export const HAS_ALIASES: Record<string, string> = {
  quran: "quran",
  quranic: "quran",
  hifdh: "quran",
  arabic: "arabic",
  transportation: "transportation",
  transport: "transportation",
  bus: "transportation",
  aftercare: "aftercare",
  "after-care": "aftercare",
  afterschool: "aftercare",
  lunch: "lunch",
  hotlunch: "lunch",
  halal: "halal",
  halallunch: "halal",
  freelunch: "freereduced",
  financialaid: "freereduced",
  athletics: "athletics",
  sports: "athletics",
};

type Atom = {
  raw: string;
  negate: boolean;
  key?: string;
  value: string;
  quoted: boolean;
  or?: boolean;
};

/** Hand-rolled scanner: handles quotes, -negation, | and key:value without throwing on bad input. */
function scan(input: string): Atom[] {
  const atoms: Atom[] = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    if (/\s/.test(input[i])) {
      i++;
      continue;
    }
    if (input[i] === "|") {
      atoms.push({
        raw: "|",
        negate: false,
        value: "",
        quoted: false,
        or: true,
      });
      i++;
      continue;
    }
    const start = i;
    let negate = false;
    if (input[i] === "-" && i + 1 < n && !/[\s|]/.test(input[i + 1])) {
      negate = true;
      i++;
    }
    let key: string | undefined;
    let value = "";
    let quoted = false;
    const readQuoted = () => {
      i++; // opening quote
      const s = i;
      while (i < n && input[i] !== '"') i++;
      value = input.slice(s, i);
      if (i < n) i++; // closing quote
      quoted = true;
    };
    if (input[i] === '"') {
      readQuoted();
    } else {
      const s = i;
      while (i < n && !/[\s|]/.test(input[i]) && input[i] !== '"') {
        if (
          input[i] === ":" &&
          i > s &&
          !key &&
          /^[a-z]+$/i.test(input.slice(s, i))
        ) {
          key = input.slice(s, i).toLowerCase();
          i++;
          if (input[i] === '"') {
            readQuoted();
            break;
          }
          const vs = i;
          while (i < n && !/[\s|]/.test(input[i])) i++;
          value = input.slice(vs, i);
          break;
        }
        i++;
      }
      if (!key) value = input.slice(s, i);
    }
    atoms.push({ raw: input.slice(start, i), negate, key, value, quoted });
  }
  return atoms;
}

function parseNumber(s: string): number | null {
  const m = /^\$?\s*([\d,]*\.?\d+)\s*(k|m)?$/i.exec(s.trim());
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const mult =
    m[2]?.toLowerCase() === "k"
      ? 1_000
      : m[2]?.toLowerCase() === "m"
        ? 1_000_000
        : 1;
  return n * mult;
}

export function parseRange(value: string): Range | null {
  const v = value.trim();
  const between = /^(.*?)\.\.(.*)$/.exec(v);
  if (between) {
    const lo = between[1].trim();
    const hi = between[2].trim();
    if (!lo && !hi) return null;
    const a = lo ? parseNumber(lo) : undefined;
    const b = hi ? parseNumber(hi) : undefined;
    if (a === null || b === null) return null;
    // "5000..9000" in either order; "..2000" and "5000.." are open-ended.
    if (a !== undefined && b !== undefined)
      return { min: Math.min(a, b), max: Math.max(a, b) };
    return a !== undefined ? { min: a } : { max: b };
  }
  const m = /^(<=|>=|<|>|=)?\s*(.+)$/.exec(v);
  if (!m) return null;
  const num = parseNumber(m[2]);
  if (num === null) return null;
  switch (m[1]) {
    case "<":
      return { max: num, maxExclusive: true };
    case "<=":
      return { max: num };
    case ">":
      return { min: num, minExclusive: true };
    case ">=":
      return { min: num };
    default:
      return { min: num, max: num };
  }
}

export function inRange(value: number, r: Range): boolean {
  if (r.min !== undefined && (r.minExclusive ? value <= r.min : value < r.min))
    return false;
  if (r.max !== undefined && (r.maxExclusive ? value >= r.max : value > r.max))
    return false;
  return true;
}

function textAtom(a: Atom): TextAtom | null {
  const raw = a.value;
  const tokens = tokenize(raw);
  if (!tokens.length) return null;
  const letters = raw.replace(/[^\p{L}]/gu, "");
  return {
    tokens,
    phrase: a.quoted,
    upper: letters.length > 0 && letters === letters.toUpperCase(),
    raw,
  };
}

export function parseQuery(input: string): ParsedQuery {
  const q = input.slice(0, MAX_QUERY_LENGTH);
  const out: ParsedQuery = {
    items: [],
    exclude: [],
    fields: [],
    notes: [],
    parts: [],
  };
  const atoms = scan(q);
  let group: TextAtom[] = [];
  let pendingOr = false;
  const flush = () => {
    if (group.length) out.items.push(group);
    group = [];
  };

  for (const a of atoms) {
    if (a.or) {
      out.parts.push({ raw: "|", kind: "or" });
      pendingOr = group.length > 0;
      continue;
    }

    // Key:value operators; anything unusable falls through to plain text.
    if (a.key && FIELD_KEYS.has(a.key) && a.value.trim()) {
      const field = parseField(a, out);
      if (field === true) {
        out.parts.push({ raw: a.raw, kind: "field" });
        pendingOr = false;
        continue;
      }
    }
    const text = textAtom(a.key ? { ...a, value: `${a.key} ${a.value}` } : a);
    if (!text) continue;
    if (a.negate) {
      out.exclude.push(text);
      out.parts.push({ raw: a.raw, kind: "exclude" });
      continue;
    }
    out.parts.push({ raw: a.raw, kind: "text" });
    if (pendingOr) group.push(text);
    else {
      flush();
      group = [text];
    }
    pendingOr = false;
  }
  flush();
  return out;
}

/** Returns true when the atom was consumed as an operator. */
function parseField(a: Atom, out: ParsedQuery): boolean {
  const key = a.key!;
  const value = a.value.trim();
  const base = { negate: a.negate, raw: a.raw };
  const bad = () => {
    out.notes.push(`Couldn't read "${a.raw}"`);
    return false;
  };

  switch (key) {
    case "state": {
      const codes = value
        .split(",")
        .map((v) => stateCode(v))
        .filter((c): c is string => c !== null);
      if (!codes.length) return bad();
      out.fields.push({ ...base, key: "state", codes });
      return true;
    }
    case "city": {
      const tokens = value
        .split(",")
        .map((v) => tokenize(v))
        .filter((t) => t.length);
      if (!tokens.length) return bad();
      out.fields.push({ ...base, key: "city", tokens });
      return true;
    }
    case "zip": {
      const prefix = value.toLowerCase().replace(/[\s-]/g, "");
      if (!/^[a-z0-9]{2,7}$/.test(prefix)) return bad();
      out.fields.push({ ...base, key: "zip", prefix });
      return true;
    }
    case "grade": {
      const g = parseGradeQuery(value);
      if (!g) return bad();
      out.fields.push({ ...base, key: "grade", ...g });
      return true;
    }
    case "tuition":
    case "enrolled":
    case "founded": {
      const range = parseRange(value);
      if (!range) return bad();
      out.fields.push({ ...base, key: "range", field: key, range });
      return true;
    }
    case "accredited": {
      const v = value.toLowerCase();
      if (["yes", "y", "true", "any"].includes(v))
        out.fields.push({ ...base, key: "accredited", mode: "yes" });
      else if (["no", "n", "false", "none"].includes(v))
        out.fields.push({ ...base, key: "accredited", mode: "no" });
      else
        out.fields.push({
          ...base,
          key: "accredited",
          mode: "agency",
          agency: tokenize(value),
        });
      return true;
    }
    case "has": {
      const tags = value
        .split(",")
        .map((v) => HAS_ALIASES[v.toLowerCase().replace(/[\s_]/g, "")])
        .filter(Boolean);
      if (!tags.length) return bad();
      out.fields.push({ ...base, key: "has", tags });
      return true;
    }
    case "near": {
      out.near = value;
      return true;
    }
    case "within": {
      const m = /^(\d+(?:\.\d+)?)\s*(mi|mile|miles|km)?$/i.exec(value);
      if (!m) return bad();
      out.within = {
        value: Number(m[1]),
        unit: m[2]?.toLowerCase() === "km" ? "km" : "mi",
      };
      return true;
    }
  }
  return false;
}

/** Rebuilds the query text without the part at `index` (used by removable chips). */
export function removePart(parsed: ParsedQuery, index: number): string {
  return parsed.parts
    .filter((_, i) => i !== index)
    .map((p) => p.raw)
    .join(" ");
}
