import { z } from "zod"

export const OfferCategorySchema = z.enum([
  "pd_training",
  "curriculum",
  "college_prep",
  "books",
  "technology",
  "finance",
  "services",
])
export type OfferCategory = z.infer<typeof OfferCategorySchema>

export const OFFER_CATEGORY_LABELS: Record<OfferCategory, string> = {
  pd_training: "Staff training",
  curriculum: "Curriculum",
  college_prep: "College prep",
  books: "Books & bookfairs",
  technology: "Technology",
  finance: "Finance & operations",
  services: "School services",
}

export const OfferValueKindSchema = z.enum(["amount", "percent", "free", "perk"])
export const RedemptionMethodSchema = z.enum(["code", "email", "link"])
export const OfferStatusSchema = z.enum(["draft", "active", "paused"])
export const ClaimStatusSchema = z.enum(["claimed", "redeemed"])
export type OfferStatus = z.infer<typeof OfferStatusSchema>
export type ClaimStatus = z.infer<typeof ClaimStatusSchema>

export const REDEMPTION_LABELS: Record<z.infer<typeof RedemptionMethodSchema>, string> = {
  code: "Promo code",
  email: "Email the partner",
  link: "Partner website",
}

export const RedemptionSchema = z.object({
  method: RedemptionMethodSchema,
  code: z.string().optional(),
  email: z.string().optional(),
  url: z.string().optional(),
  instructions: z.string(),
})
export type Redemption = z.infer<typeof RedemptionSchema>

export const OfferSchema = z.object({
  id: z.string(),
  partner: z.object({ name: z.string(), website: z.string(), initials: z.string() }),
  title: z.string(),
  summary: z.string(),
  details: z.string(),
  /** Partner flyer shown on the public page. */
  image: z.string().optional(),
  category: OfferCategorySchema,
  value: z.object({ kind: OfferValueKindSchema, label: z.string() }),
  redemption: RedemptionSchema,
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
  /** Only schools with an active (or grace-period) ISLA membership can claim. */
  membersOnly: z.boolean(),
  featured: z.boolean(),
  status: OfferStatusSchema,
  createdAt: z.iso.date(),
})
export type Offer = z.infer<typeof OfferSchema>

export const ClaimSchema = z.object({
  id: z.string(),
  offerId: z.string(),
  /** Null when someone claimed from the public page without signing in. */
  schoolId: z.string().nullable(),
  /** As entered (public) or the school's name at claim time. */
  schoolName: z.string(),
  contactName: z.string(),
  contactEmail: z.string(),
  note: z.string().default(""),
  claimedAt: z.iso.datetime(),
  status: ClaimStatusSchema,
  redeemedAt: z.iso.datetime().optional(),
})
export type Claim = z.infer<typeof ClaimSchema>

export const NewClaimSchema = z.object({
  contactName: z.string().trim().min(2, "Add who the partner should contact"),
  contactEmail: z.email("Enter a valid email"),
  note: z.string().trim().max(500, "Keep the note under 500 characters"),
})
export type NewClaim = z.infer<typeof NewClaimSchema>

/** Public "Avail this offer" form. `schoolName` is required unless a school admin is signed in; `hp` is a honeypot. */
export const PublicClaimSchema = NewClaimSchema.extend({
  schoolName: z.string().trim().max(120),
  hp: z.string().optional(),
})
export type PublicClaim = z.infer<typeof PublicClaimSchema>

export type ClaimInput = NewClaim & { schoolId: string | null; schoolName: string }

const optionalUrl = z.union([z.literal(""), z.url("Enter a full URL, e.g. https://example.org")])

/** Flat shape for the staff create/edit form. `offerFromInput` maps it onto an Offer. */
export const OfferInputSchema = z
  .object({
    partnerName: z.string().trim().min(2, "Add the partner's name"),
    partnerWebsite: optionalUrl,
    title: z.string().trim().min(5, "Add an offer title"),
    summary: z.string().trim().min(10, "Add a one-line summary").max(200, "Keep the summary under 200 characters"),
    details: z.string().trim().max(2000),
    image: optionalUrl,
    category: OfferCategorySchema,
    valueKind: OfferValueKindSchema,
    valueLabel: z.string().trim().min(1, "e.g. $100 off").max(24, "Keep it short, e.g. 15% off"),
    method: RedemptionMethodSchema,
    code: z.string().trim().max(40),
    email: z.union([z.literal(""), z.email("Enter a valid email")]),
    url: optionalUrl,
    instructions: z.string().trim().min(5, "Tell schools how to redeem").max(500),
    startsOn: z.iso.date("Pick a start date"),
    endsOn: z.iso.date("Pick an end date"),
    membersOnly: z.boolean(),
    featured: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.endsOn < v.startsOn) ctx.addIssue({ code: "custom", path: ["endsOn"], message: "Ends before it starts" })
    if (v.method === "code" && !v.code) ctx.addIssue({ code: "custom", path: ["code"], message: "Add the promo code" })
    if (v.method === "email" && !v.email) ctx.addIssue({ code: "custom", path: ["email"], message: "Add the partner's email" })
    if (v.method === "link" && !v.url) ctx.addIssue({ code: "custom", path: ["url"], message: "Add the redemption link" })
  })
export type OfferInput = z.infer<typeof OfferInputSchema>

export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase()
}

/** Builds the stored offer from form input. Fields the form doesn't own (id, status, createdAt) come from `base`. */
export function offerFromInput(input: OfferInput, base: Pick<Offer, "id" | "status" | "createdAt">): Offer {
  return {
    ...base,
    partner: { name: input.partnerName, website: input.partnerWebsite, initials: initialsOf(input.partnerName) },
    title: input.title,
    summary: input.summary,
    details: input.details,
    ...(input.image && { image: input.image }),
    category: input.category,
    value: { kind: input.valueKind, label: input.valueLabel },
    redemption: {
      method: input.method,
      // Keep only the field the chosen method uses.
      ...(input.method === "code" && { code: input.code }),
      ...(input.method === "email" && { email: input.email }),
      ...(input.url && { url: input.url }),
      instructions: input.instructions,
    },
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    membersOnly: input.membersOnly,
    featured: input.featured,
  }
}

export function inputFromOffer(offer: Offer): OfferInput {
  return {
    partnerName: offer.partner.name,
    partnerWebsite: offer.partner.website,
    title: offer.title,
    summary: offer.summary,
    details: offer.details,
    image: offer.image ?? "",
    category: offer.category,
    valueKind: offer.value.kind,
    valueLabel: offer.value.label,
    method: offer.redemption.method,
    code: offer.redemption.code ?? "",
    email: offer.redemption.email ?? "",
    url: offer.redemption.url ?? "",
    instructions: offer.redemption.instructions,
    startsOn: offer.startsOn,
    endsOn: offer.endsOn,
    membersOnly: offer.membersOnly,
    featured: offer.featured,
  }
}
