# Moving from sample data to the real ISLA API

The prototype runs on in-memory sample data. Every screen reads and writes through
repository interfaces. To switch to a real backend, you change environment
variables. You don't edit any UI code.

## How data flows

```
app/(dashboard)/*/page.tsx         routes: read the session, compose feature components
  └─ features/*/queries.ts          'use cache' + cacheLife + cacheTag (cached reads)
  └─ features/*/actions.ts          Server Actions: validate (Zod) → repo → updateTag
       └─ server/repositories        interfaces (types.ts) + adapter switch (index.ts)
            ├─ server/adapters/mock  in-memory tables seeded from src/data/*.json
            └─ server/adapters/http  fetch client, Zod-parses every response
```

Rules that keep the swap safe:

- Only `server/repositories/index.ts` imports an adapter.
- Only `server/adapters/mock` imports `src/data/*.json`.
- `features/*/schema.ts` is the contract. The same Zod schemas validate the
  sample data at startup and every API response at runtime.
- Caching lives in `features/*/queries.ts` and doesn't depend on the adapter, so
  the real API gets the same caching behavior.

## Switching

```bash
DATA_SOURCE=http
ISLA_API_URL=https://api.theisla.org/v1/
ISLA_API_TOKEN=...            # sent as "Authorization: Bearer <token>"
```

`src/config/env.ts` validates these settings at boot. Setting `DATA_SOURCE=http`
without a URL fails immediately.

## Endpoints the http adapter expects

All endpoints are JSON. Response schemas are in `src/features/*/schema.ts`.
Change the paths in `src/server/adapters/http/index.ts` if the backend uses
different ones.

| Repository method | Method & path | Request | Response schema |
|---|---|---|---|
| `schools.list(filter)` | `GET /schools?q=&region=&status=&freshness=` | query | `SchoolSummary[]` |
| `schools.listAll()` | `GET /schools?view=full` (all pages; ~450 rows) | — | `School[]` |
| `schools.get(id)` | `GET /schools/:id` (404 → null) | — | `School` |
| `schools.updateSection(id, section, patch)` | `PATCH /schools/:id/{overview\|leadership\|schedule\|programs\|contacts}` | `SectionPatchSchemas[section]` | `School` |
| `schools.createPending(input)` | `POST /schools/submissions` | `NewSchool` | `School` (`listing: "pending"`) |
| `schools.submitReport(input)` | `POST /schools/reports` | `NewReport` + `kind` | `SchoolReport` |
| `schools.listReports()` | `GET /schools/reports` | — | `SchoolReport[]` |
| `schools.resolveReport(id, decision)` | `POST /schools/reports/:id/resolve` | `{ decision: "approved" \| "dismissed" }` | `SchoolReport` |
| `schools.sendContactMessage(id, msg)` | `POST /schools/:id/contact` (204) | `{ name, email, message }` | — |
| `schools.setGeo(id, geo)` | `PUT /schools/:id/geo` (body `Geo` or `null`) | `Geo \| null` | `School` |
| `schools.requestUpdate(ids)` | `POST /schools/update-requests` | `{ ids: string[] }` | `{ sent: number }` |
| `jobs.listBySchool(id)` | `GET /schools/:id/jobs` | — | `Job[]` |
| `jobs.listOpen()` | `GET /jobs?status=open` | — | `Job[]` |
| `jobs.create(id, job)` | `POST /schools/:id/jobs` | `NewJob` | `Job` |
| `billing.getPlan(id)` | `GET /schools/:id/plan` (404 → null) | — | `Plan` |
| `billing.updatePlan(id, patch)` | `PATCH /schools/:id/plan` | `{ autoRenew: boolean }` | `Plan` |
| `billing.listInvoices(id)` | `GET /schools/:id/invoices` | — | `Invoice[]` |
| `billing.getOrgSummary()` | `GET /billing/summary` | — | `OrgBillingSummary` |
| `analytics.compare(id, peers)` | `GET /analytics/schools/:id/compare?region=&size=` | query | `SchoolComparison` |
| `analytics.regionStats()` | `GET /analytics/regions` | — | `RegionStats[]` |
| `analytics.overview()` | `GET /analytics/overview` | — | `NetworkOverview` |
| `store.listProducts()` | `GET /store/products` | — | `Product[]` |
| `knowledge.ask(input)` | `POST /knowledge/ask` | `{ question, schoolId }` | `KnowledgeAnswer` |
| `offers.listOffers()` | `GET /offers` | — | `Offer[]` |
| `offers.getOffer(id)` | `GET /offers/:id` (404 → null) | — | `Offer` |
| `offers.createOffer(input)` | `POST /offers` (created as `status: "draft"`) | `OfferInput` | `Offer` |
| `offers.updateOffer(id, input)` | `PUT /offers/:id` | `OfferInput` | `Offer` |
| `offers.patchOffer(id, patch)` | `PATCH /offers/:id` | `{ status?, featured? }` | `Offer` |
| `offers.listClaims(filter)` | `GET /offers/claims?schoolId=&offerId=` | query | `Claim[]` |
| `offers.claim(offerId, input)` | `POST /offers/:id/claims` (idempotent per school, or per email when anonymous) | `ClaimInput` (`NewClaim` + `schoolId \| null` + `schoolName`) | `Claim` |
| `offers.setClaimStatus(id, status)` | `PATCH /offers/claims/:id` | `{ status: "claimed" \| "redeemed" }` | `Claim` |

Analytics responses carry precomputed statistics so the UI does no aggregation:

- `SchoolComparison` includes `distribution[metric]` (`min`, `p25`, `median`, `p75`,
  `max` of the peer group) and `percentile[metric]` (share of peers with a lower
  value, from 0 to 1).
- `RegionStats.membership` counts schools by status.
- `NetworkOverview.medians` gives network-wide medians for the network median
  line and the summary figures.

Saving a profile section also sets that section's `verifiedAt` date to today.
The mock adapter does this in `applySection` in
`server/adapters/mock/schools.ts`, and the real API should do the same.

## Authentication

`src/server/session.ts` reads the demo role from a cookie. To use real
authentication, replace `getSession()` with Auth.js, Clerk or ISLA single sign-on,
and keep the same return shape:

```ts
{ role: "school" | "isla"; schoolId: string | null; user: { name; title; initials } }
```

The authorization checks (`canManageSchool`) and every page keep working unchanged.

## Things the prototype only fakes

| Area | Prototype | Production |
|---|---|---|
| Card update, invoice PDF | Toast | Payment provider (for example Stripe Customer Portal or hosted invoice URLs) |
| "Send reminders" (billing) | Toast | Email service, triggered by the API |
| Knowledge assistant | Keyword-scripted answers | Retrieval over ISLA research, toolkits and school data, with citations |
| Renew now | Links to theisla.org/membership | Checkout session from the API |

## Caching notes

- After a mutation, the actions call `updateTag` so the user sees their own
  change right away.
- If the API changes data outside this app (for example an admin edits data in
  another tool), call `revalidateTag("schools", "max")` from a webhook route
  handler.
- With serverless hosting, in-memory `'use cache'` entries don't persist between
  instances. Use `'use cache: remote'` for data that should be shared across
  instances.


## School locations (`address.geo`)

`School.address.geo` is optional: `{ lat, lng, precision: "rooftop" | "postal" | "city" | "none", source: "nominatim" | "gazetteer" | "manual", updatedAt }`.
The directory map pins schools that have it and lists the rest as "not on map".
`precision` drives the "approximate location" label, so the API should record how
exact each pin is rather than always returning `rooftop`. Seed data is backfilled with
`node scripts/backfill-geo.mjs` (city-level pins from `src/data/geo/places.json`);
re-run it after `scripts/generate-mock-data.mjs`.
`GET /schools?view=full` must return every school (`School[]`) for the search index.

## Directory search data

New optional `School` fields (defaults keep older payloads parsing): `type`
(`standard|preschool|charter|weekend|afterschool|coop|hifdh|other`), `listing`
(`open|pending|closed`), `features` (ids from `FEATURE_LABELS` in `features/schools/schema.ts`)
and `social` (`facebook|instagram|youtube|x` handles). `metrics.tuition` of `0` means "not
listed", as the profile "Add tuition" task already assumes.

Offline lookups for ZIP / postal-code / place search are static files under `public/geo`
(US ZIPs sharded by first two digits, Canadian FSAs, ~3,900 cities). They are built from
GeoNames (CC BY 4.0) with `node scripts/build-geo-data.mjs <dir>`; see the script header
for the download URLs. Set `GEOCODER_CONTACT` (an email or URL) to enable Nominatim lookups
for place names and exact addresses; without it, pins fall back to ZIP / city centroids.

## Public directory (`/directory`)

Anonymous page, no session. It only ever receives `getPublicSearchIndex()`: open schools,
with staff-only fields removed (`toPublicDoc` in `features/schools/search/doc.ts`). The API
should enforce the same on its side if it ever serves this directly: no pending/closed
schools, no leader names or emails, no salary/retention, no verification dates.

Public forms (contact, add school, report) are rate-limited per client and carry a honeypot
field; `src/server/rate-limit.ts` is in-memory, so use a shared store when running several
instances. A new school is created with `listing: "pending"` plus a `"new"` report; staff
approve or dismiss it under **Reports**. Closure and other reports never change a listing
until staff approve them, and a report is linked to a school only when exactly one school
matches its name, city and state.

## Promo offers (`/promo-offers` public, `/offers` dashboard)

`/promo-offers` is public (no sign-in) and replaces theisla.org/promo-offers. "Avail this offer"
records a claim and shows the redemption steps. A signed-in school admin claims for their school
(`schoolId` set); anyone else enters a school or organization name (`schoolId: null`), and those
claims are rate-limited with a honeypot like the other public forms. In the dashboard, schools only
see what they claimed (`/offers`); staff manage offers and track claims there.

Claim rules (`claimBlocker` in `features/offers/lib.ts`): the offer must be published and inside its
redeem window, and `membersOnly` offers need a signed-in school with an `active` or `grace`
membership. Claiming twice (same school, or same email when anonymous) returns the existing claim.
The API should enforce the same.

`redemption.code` is a secret until claimed: the public list strips it (`redactRedemption`), so a
public `GET /offers` should omit it too. Flyer images (`Offer.image`) are served through
`next/image`; only `theisla.org/wp-content/uploads/**` is optimized (see `next.config.ts`).
