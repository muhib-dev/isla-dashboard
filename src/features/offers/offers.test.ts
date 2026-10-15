import { describe, expect, it } from "vitest";
import { z } from "zod";
import claimsJson from "../../data/claims.json";
import offersJson from "../../data/offers.json";
import {
  claimBlocker,
  claimsInLastDays,
  daysUntil,
  offerPhase,
  redactRedemption,
} from "./lib";
import {
  ClaimSchema,
  inputFromOffer,
  initialsOf,
  NewClaimSchema,
  offerFromInput,
  OfferInputSchema,
  OfferSchema,
  type OfferInput,
} from "./schema";

const window = { status: "active" as const, startsOn: "2026-10-01", endsOn: "2026-10-31" };

describe("offerPhase", () => {
  it("is upcoming before the start date and live on it", () => {
    expect(offerPhase(window, "2026-09-30")).toBe("upcoming");
    expect(offerPhase({ ...window, endsOn: "2026-12-31" }, "2026-10-01")).toBe("live");
  });

  it("flags the last 14 days as ending soon, including the end date", () => {
    expect(offerPhase(window, "2026-10-16")).toBe("live");
    expect(offerPhase(window, "2026-10-17")).toBe("ending_soon");
    expect(offerPhase(window, "2026-10-31")).toBe("ending_soon");
  });

  it("expires the day after the end date", () => {
    expect(offerPhase(window, "2026-11-01")).toBe("expired");
  });

  it("lets draft and paused override the dates", () => {
    expect(offerPhase({ ...window, status: "draft" }, "2026-10-10")).toBe("draft");
    expect(offerPhase({ ...window, status: "paused" }, "2026-10-10")).toBe("paused");
  });

  it("counts whole days", () => {
    expect(daysUntil("2026-10-31", "2026-10-15")).toBe(16);
    expect(daysUntil("2026-10-14", "2026-10-15")).toBe(-1);
  });
});

describe("claimBlocker", () => {
  const offer = { membersOnly: true, startsOn: "2027-08-01" };

  it("allows members to claim live offers", () => {
    expect(claimBlocker(offer, "live", "active", false)).toBeNull();
    expect(claimBlocker(offer, "ending_soon", "grace", false)).toBeNull();
  });

  it("blocks duplicates, unavailable offers and non-members", () => {
    expect(claimBlocker(offer, "live", "active", true)).toMatch(/already claimed/);
    expect(claimBlocker(offer, "upcoming", "active", false)).toMatch(/Opens Aug 1, 2027/);
    expect(claimBlocker(offer, "expired", "active", false)).toMatch(/no longer available/);
    expect(claimBlocker(offer, "paused", "active", false)).toMatch(/no longer available/);
    expect(claimBlocker(offer, "live", "lapsed", false)).toMatch(/Members only/);
    expect(claimBlocker({ ...offer, membersOnly: false }, "live", "non_member", false)).toBeNull();
  });
});

describe("redactRedemption", () => {
  it("removes the promo code and keeps the instructions", () => {
    const offer = { redemption: { method: "code" as const, code: "ISLA20", instructions: "Use at checkout" } };
    expect(redactRedemption(offer).redemption).toEqual({ method: "code", code: undefined, instructions: "Use at checkout" });
    expect(offer.redemption.code).toBe("ISLA20");
  });
});

describe("claimsInLastDays", () => {
  it("counts claims inside the window", () => {
    const now = Date.parse("2026-10-15T12:00:00Z");
    const claims = [{ claimedAt: "2026-10-14T00:00:00Z" }, { claimedAt: "2026-09-01T00:00:00Z" }];
    expect(claimsInLastDays(claims, 30, now)).toBe(1);
  });
});

const input: OfferInput = {
  partnerName: "Sample Partner",
  partnerWebsite: "",
  title: "20% off things",
  summary: "A summary that is long enough.",
  details: "",
  image: "",
  category: "curriculum",
  valueKind: "percent",
  valueLabel: "20% off",
  method: "code",
  code: "ISLA20",
  email: "",
  url: "",
  instructions: "Use at checkout.",
  startsOn: "2026-10-01",
  endsOn: "2026-10-31",
  membersOnly: false,
  featured: false,
};

describe("OfferInputSchema", () => {
  const issues = (value: unknown) =>
    OfferInputSchema.safeParse(value).error?.issues.map((i) => i.path.join(".")) ?? [];

  it("accepts a complete offer", () => {
    expect(issues(input)).toEqual([]);
  });

  it("rejects an end date before the start date", () => {
    expect(issues({ ...input, endsOn: "2026-09-01" })).toEqual(["endsOn"]);
  });

  it("requires the field that matches the redemption method", () => {
    expect(issues({ ...input, code: "" })).toEqual(["code"]);
    expect(issues({ ...input, method: "email" })).toEqual(["email"]);
    expect(issues({ ...input, method: "link" })).toEqual(["url"]);
    expect(issues({ ...input, method: "link", url: "https://example.org" })).toEqual([]);
  });
});

describe("offerFromInput", () => {
  it("round-trips through the form shape and drops fields the method doesn't use", () => {
    const offer = offerFromInput(
      { ...input, email: "ignored@example.org" },
      { id: "o1", status: "draft", createdAt: "2026-10-15" },
    );
    expect(offer.partner.initials).toBe("SP");
    expect(offer.redemption).toEqual({ method: "code", code: "ISLA20", instructions: "Use at checkout." });
    expect(inputFromOffer(offer)).toEqual(input);
  });

  it("makes initials from one or two words", () => {
    expect(initialsOf("WISER USA")).toBe("WU");
    expect(initialsOf("iqraa")).toBe("IQ");
  });
});

describe("NewClaimSchema", () => {
  it("needs a contact name and a valid email", () => {
    expect(NewClaimSchema.safeParse({ contactName: "Amina", contactEmail: "a@b.org", note: "" }).success).toBe(true);
    expect(NewClaimSchema.safeParse({ contactName: "A", contactEmail: "nope", note: "" }).success).toBe(false);
  });
});

describe("sample data", () => {
  it("parses and every claim points at a real offer, one per school", () => {
    const offers = z.array(OfferSchema).parse(offersJson);
    const claims = z.array(ClaimSchema).parse(claimsJson);
    const ids = new Set(offers.map((o) => o.id));
    expect(claims.every((c) => ids.has(c.offerId))).toBe(true);
    const keys = claims.map((c) => `${c.schoolId}:${c.offerId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
