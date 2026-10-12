import { STOPWORDS } from "./aliases"
import { enrollmentSpan, type SchoolSearchDoc } from "./doc"
import { inRange, type FieldFilter, type ParsedQuery, type Range, type TextAtom } from "./parse-query"
import { editDistance, maxTypos } from "./normalize"
import { servesAll } from "./grades"

const startsWith = (tokens: string[], t: string) => t.length >= 2 && tokens.some((x) => x.startsWith(t))

function scoreToken(doc: SchoolSearchDoc, t: string, atom: TextAtom, fuzzy: boolean): number {
  const w = STOPWORDS.has(t) ? 0.4 : 1
  let best = 0
  const set = (v: number) => { if (v > best) best = v }

  if (doc.nameTokens.includes(t)) set(60)
  else if (startsWith(doc.nameTokens, t)) set(50)
  else if (t.length >= 3 && doc.nameJoined.includes(t)) set(45)

  if (doc.cityTokens.includes(t)) set(30)
  else if (startsWith(doc.cityTokens, t)) set(26)
  if (t.length === 2 && atom.upper && doc.state.toLowerCase() === t) set(28)
  if (doc.stateNameTokens.includes(t)) set(25)
  if (/\d/.test(t) && doc.postalNorm.startsWith(t)) set(25)

  if (doc.leaderTokens.includes(t) || startsWith(doc.leaderTokens, t)) set(20)
  if (doc.accredTokens.includes(t) || doc.extraTokens.includes(t)) set(15)
  if (doc.contactTokens.includes(t)) set(10)

  if (!best && fuzzy && t.length >= 4) {
    const budget = maxTypos(t)
    let d = budget + 1
    for (const x of doc.nameTokens) d = Math.min(d, editDistance(t, x, budget))
    if (d <= budget) set(32 - d * 6)
    else {
      let c = budget + 1
      for (const x of doc.cityTokens) c = Math.min(c, editDistance(t, x, budget))
      if (c <= budget) set(20 - c * 4)
    }
  }
  return best * w
}

/** Highest relevance wins; 0 means no match. */
export function scoreAtom(doc: SchoolSearchDoc, atom: TextAtom, fuzzy = true): number {
  const { tokens } = atom
  if (tokens.length === 1) return scoreToken(doc, tokens[0], atom, fuzzy)

  // Multi-token: phrase against the name first ("al noor" ↔ "alnoor"), then the other text.
  const phrase = tokens.join(" ")
  const joined = tokens.join("")
  if (doc.nameNorm === phrase) return 100
  if (doc.nameNorm.startsWith(phrase)) return 90
  if (` ${doc.nameNorm} `.includes(` ${phrase} `)) return 80
  if (joined.length >= 3 && doc.nameJoined.includes(joined)) return 70
  const rest = ` ${[...doc.cityTokens, ...doc.stateNameTokens, ...doc.accredTokens, ...doc.leaderTokens].join(" ")} `
  if (rest.includes(` ${phrase} `)) return 24
  if (atom.phrase) return 0

  // Hyphenated/apostrophe word that isn't a phrase hit: every part must match somewhere.
  let total = 0
  for (const t of tokens) {
    const s = scoreToken(doc, t, atom, fuzzy)
    if (!s) return 0
    total += s
  }
  return total / tokens.length
}

/** True when some value in [lo, hi] satisfies `r`. */
function overlaps(lo: number, hi: number, r: Range): boolean {
  if (r.min !== undefined && (r.minExclusive ? hi <= r.min : hi < r.min)) return false
  if (r.max !== undefined && (r.maxExclusive ? lo >= r.max : lo > r.max)) return false
  return true
}

function matchField(doc: SchoolSearchDoc, f: FieldFilter): boolean {
  switch (f.key) {
    case "state": return f.codes.includes(doc.state.toUpperCase())
    case "city": return f.tokens.some((t) => t.join(" ") === doc.cityTokens.join(" "))
    case "zip": return doc.postalNorm.startsWith(f.prefix)
    case "grade": return doc.gradeFrom !== null && doc.gradeTo !== null && servesAll({ from: doc.gradeFrom, to: doc.gradeTo }, f)
    case "range": {
      // Published tuition ranges and enrollment bands match when any part of them is in range.
      if (f.field === "tuition") return doc.tuition !== null && overlaps(doc.tuition, doc.tuitionMax ?? doc.tuition, f.range)
      if (f.field === "enrolled") {
        const span = enrollmentSpan(doc)
        return span !== null && overlaps(span.min, span.max ?? Infinity, f.range)
      }
      return inRange(doc.founded, f.range)
    }
    case "accredited":
      if (f.mode === "yes") return doc.accreditation.length > 0
      if (f.mode === "no") return doc.accreditation.length === 0
      return !!f.agency?.length && f.agency.every((t) => doc.accredTokens.includes(t))
    case "has": return f.tags.every((t) => doc.tags.includes(t))
  }
}

export const matchesFieldFilter = (doc: SchoolSearchDoc, f: FieldFilter) => matchField(doc, f) !== f.negate

/**
 * Returns the relevance score (>0) or 0 when the doc is rejected.
 * With no text terms every doc that passes the operators scores 1.
 */
export function matchQuery(doc: SchoolSearchDoc, q: ParsedQuery): number {
  for (const f of q.fields) if (!matchesFieldFilter(doc, f)) return 0
  for (const x of q.exclude) if (scoreAtom(doc, x, false) > 0) return 0
  let total = 0
  for (const group of q.items) {
    let best = 0
    for (const atom of group) best = Math.max(best, scoreAtom(doc, atom))
    // Generic words ("islamic", "school") nearly every name shares must never reject a school.
    const soft = group.every((a) => a.tokens.every((t) => STOPWORDS.has(t)))
    if (!best && !soft) return 0
    total += best
  }
  return q.items.length ? Math.max(total / q.items.length, 1) : 1
}

export type Highlight = { text: string; hit: boolean }

/** Splits a display string into runs, flagging words that matched the query terms. */
export function highlight(text: string, atoms: TextAtom[], canonFn: (w: string) => string): Highlight[] {
  const wanted = new Set(atoms.flatMap((a) => a.tokens))
  if (!wanted.size) return [{ text, hit: false }]
  const out: Highlight[] = []
  const re = /[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu
  for (const m of text.matchAll(re)) {
    const word = m[0]
    const isWord = /[\p{L}\p{N}]/u.test(word)
    const c = isWord ? canonFn(word.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")) : ""
    const hit = isWord && [...wanted].some((t) => c === t || (t.length >= 2 && c.startsWith(t)))
    const last = out[out.length - 1]
    if (last && last.hit === hit) last.text += word
    else out.push({ text: word, hit })
  }
  return out
}
