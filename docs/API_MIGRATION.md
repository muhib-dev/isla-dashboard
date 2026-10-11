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
| `schools.get(id)` | `GET /schools/:id` (404 → null) | — | `School` |
| `schools.updateSection(id, section, patch)` | `PATCH /schools/:id/{overview\|leadership\|schedule\|programs\|contacts}` | `SectionPatchSchemas[section]` | `School` |
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
