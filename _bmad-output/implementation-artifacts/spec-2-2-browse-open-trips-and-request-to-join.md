---
title: 'Story 2.2: Browse Open Trips and Request to Join'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'a9ad4c113f16408950938ebe874ddc962cc2d76e'
context:
  - _bmad-output/implementation-artifacts/epic-2-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Trips can be marked open to buddies (Story 2.1), but nothing lets an outside traveler find them or ask to join — there's no Buddies surface at all yet.

**Approach:** Add a new `buddies` slice (`GET /api/buddies`, `GET /api/buddies/:buddyListingId`, `POST /api/buddies/:buddyListingId/requests`, `GET /api/buddies/requests/:requestId`) built around a second, purpose-built public identifier (`Trip.buddyListingId`, added this story) so the browse listing can safely expose enough to submit a request without ever exposing the Trip Code (AD-7) — and a Buddies screen + per-Trip request form on the frontend.

## Boundaries & Constraints

**Always:**
- `Trip.buddyListingId` (new, unique, `nanoid()`-generated at creation like `id`) is the *only* identifier the Buddies browse/request flow ever sees or accepts — never `Trip.id`/the Trip Code, in any response or route.
- The `buddies` slice never queries `Trip`/`TripMember` directly (AD-1) — it calls `trips`-exported functions (`listOpenTripsForBuddies`, `getOpenTripForBuddies`, `resolveTripIdForBuddyListing`) for every Trip read; it does own `TravelBuddyRequest` directly (its own table).
- `resolveTripIdForBuddyListing` (trips slice) is the one place a real Trip Code is resolved from a `buddyListingId` — used only to create a `TravelBuddyRequest` server-side, never returned in any HTTP response from the listing/browse endpoints.
- Submitting a request never grants access by itself — no `TripMember` row, no Trip Code handed back. `GET /api/buddies/requests/:requestId` (a `TravelBuddyRequest`'s own `nanoid()` id, safe to hand the submitter back and store client-side — it grants nothing but a status check) is how the requester later checks their own request's status; if `status === 'accepted'`, this is the one place that reveals the real Trip Code — by then the requester already has a private, unguessable reference only they hold, not a public browse context (AD-7's concern doesn't apply here).
- Client-side dedup (AD-14): `localStorage` maps `buddyListingId → requestId`; a listing already in this map hides the request form and shows the status check instead. Best-effort only, not server-enforced.
- Standard listing states apply: cold-load skeleton, "No results" (no open Trips) distinct from "Couldn't load this" (fetch failure, retry).

**Never:**
- No accept/decline action — Story 2.3. `status` can only ever be `"pending"` through this story's own code paths; the `"accepted"`/`"declined"` branches are built (the AC requires their UI states exist) but can't be exercised end-to-end until 2.3 ships the mutation that produces them.
- No server-side "one request per person" enforcement — AD-14 is deliberately client-side/bypassable.
- No changes to `PATCH /api/trips/:code` (Story 2.1) or any existing Trip endpoint's response shape.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Browse open Trips | ≥1 Trip has `openToBuddies: true` | `200` array, each item keyed by `buddyListingId`, never `id` | N/A |
| Browse with none open | No open Trips | `200 []` — frontend renders "No results" | N/A |
| Fetch one listing | Valid `buddyListingId` for an open Trip | `200` with the same restricted shape | N/A |
| Fetch a listing that's closed or unknown | Invalid/no-longer-open `buddyListingId` | `404 NOT_FOUND` | Same shared error envelope |
| Submit a request | Valid `buddyListingId` + `requesterName` | `201` with `{ id, status: "pending" }`; no `TripMember` created | N/A |
| Submit against a closed/unknown listing | Invalid `buddyListingId` | `404 NOT_FOUND` | No `TravelBuddyRequest` created |
| Submit with an empty `requesterName` | `{ requesterName: "" }` | `400 VALIDATION_ERROR` | No request created |
| Check a request's status | Valid `requestId`, status still `"pending"` | `200 { status: "pending" }` — no `tripCode` field | N/A |
| Check an unknown request | Invalid `requestId` | `404 NOT_FOUND` | Same shared error envelope |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma` -- add `Trip.buddyListingId String @unique` (migration `add_trip_buddy_listing_id`, applied; existing local `dev.db` had no Trip rows to migrate)
- `apps/api/src/features/trips/service.ts` -- `createTrip` now generates `buddyListingId: nanoid()`; add `listOpenTripsForBuddies()`, `getOpenTripForBuddies(buddyListingId)`, `resolveTripIdForBuddyListing(buddyListingId)` — all select/filter on `openToBuddies: true`, never select `id` in the two public-shape functions
- `apps/api/src/features/buddies/service.ts` -- new: `listBuddyListings`, `getBuddyListing` (thin wraps of the two `trips` reads), `submitBuddyRequest(buddyListingId, requesterName, message)` (resolves via `trips`, then `prisma.travelBuddyRequest.create` — buddies' own table), `getBuddyRequestStatus(requestId)` (reads `TravelBuddyRequest` directly; includes `tripCode: tripId` only when `status === 'accepted'`)
- `apps/api/src/features/buddies/routes.ts` -- new: `GET /`, `GET /:buddyListingId`, `POST /:buddyListingId/requests`, `GET /requests/:requestId` — register `/requests/:requestId` before the generic `/:buddyListingId` route so Express doesn't swallow it
- `apps/api/src/app.ts` -- mount `buddiesRouter` at `/api/buddies`
- `apps/web/src/features/buddies/api.ts` -- new: `fetchBuddyListings()`, `fetchBuddyListing(id)`, `submitBuddyRequest(id, input)`, `fetchBuddyRequestStatus(requestId)`
- `apps/web/src/shared/buddyRequestIndex.ts` -- new: `localStorage` `buddyListingId → requestId` map (AD-14), mirrors `myTripsIndex.ts`'s shape/try-catch conventions
- `apps/web/src/features/buddies/BuddiesPage.tsx` (+ `.css`) -- new: list of open Trips as `Row`s (headline = Trip name, description = `buddyNote`, eyebrow = destination, metadata = date range), `RowSkeleton`/`EmptyState` for loading/no-results/error, each row linking to `/buddies/:buddyListingId`
- `apps/web/src/features/buddies/BuddyRequestPage.tsx` (+ `.css`) -- new: reads `buddyListingId` from the route; if already requested (per the local index), shows a status view (pending/declined/accepted-with-link-to-Trip); otherwise a name+message form that submits, records the returned `requestId` locally, and switches to "Request sent — waiting on the group."
- `apps/web/src/App.tsx` -- add `/buddies` → `BuddiesPage`, `/buddies/:buddyListingId` → `BuddyRequestPage`; change the "Buddies" `NAV_ITEMS` entry from `href: '#buddies'` to `href: '/buddies'`

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/prisma/schema.prisma` + migration -- `Trip.buddyListingId`
- [x] `apps/api/src/features/trips/service.ts` -- generate `buddyListingId`; `listOpenTripsForBuddies`/`getOpenTripForBuddies`/`resolveTripIdForBuddyListing`
- [x] `apps/api/src/features/buddies/service.ts` -- listings, submit, status-check
- [x] `apps/api/src/features/buddies/routes.ts` -- 4 routes
- [x] `apps/api/src/app.ts` -- mount `buddiesRouter`
- [x] `apps/web/src/features/buddies/api.ts` -- fetch/submit functions
- [x] `apps/web/src/shared/buddyRequestIndex.ts` -- local dedup index
- [x] `apps/web/src/features/buddies/BuddiesPage.tsx` (+ `.css`)
- [x] `apps/web/src/features/buddies/BuddyRequestPage.tsx` (+ `.css`)
- [x] `apps/web/src/App.tsx` -- routes + real nav link
- [x] `apps/api/src/features/buddies/routes.test.ts` -- coverage for the I/O matrix

**Acceptance Criteria:**
- Given Trips are marked open to buddies, when a visitor browses the Buddies surface, then each Trip renders as a row showing its note, and the Trip Code is never included in the response shape
- Given a visitor opens one such Trip's request form and submits a short message, then the request becomes visible to existing Trip members before it grants any access, and the requester gains no access from submitting alone
- Given this browser has already submitted a request to this Trip, when they view it again, then the request form is hidden client-side
- Given a request was just submitted, when the requester views their own submission, then they see "Request sent — waiting on the group" — distinct from a trip-member-facing pending list
- Given a request was declined, when the requester returns via the same link/session, then they see "This request was declined"

## Implementation Notes

- `dev.db` had 5 leftover Trip rows from manual QA in earlier stories, none of them real/committed data — deleted and let `prisma migrate dev` recreate it fresh rather than hand-writing a backfill for a NOT-NULL column with no default. Confirmed the existing `routes.test.ts` migration-replay helper (reads every folder under `prisma/migrations`, sorted) picks up the new migration automatically — all 30 pre-existing trips tests still passed unmodified after the schema change.
- `getOpenTripForBuddies`/`resolveTripIdForBuddyListing` both filter on `openToBuddies: true` in the same query as the `buddyListingId` match, not as a separate check after — a Trip toggled closed (Story 2.1) becomes unreachable through the Buddies flow in one step, with no risk of a TOCTOU gap between "found by listing id" and "still open."
- Verified end-to-end via `curl` against the running dev server: toggle a Trip open (Story 2.1) → `GET /api/buddies` shows it with no `id`/`code` field anywhere → `GET /api/buddies/:buddyListingId` → `POST .../requests` → `GET /api/buddies/requests/:requestId` shows `pending`. Also explicitly confirmed the security property the whole design exists for: `GET /api/trips/:buddyListingId` (using the *public* listing id as if it were a Trip Code) returns `404 NOT_FOUND` — `buddyListingId` genuinely grants no Trip access. Did not drive the UI in an actual browser this session (no browser-automation tool available) — `BuddiesPage`'s row rendering, the request form, and the dedup-hides-the-form-on-revisit behavior are unverified beyond code review and type/build checks.
- Post-review: extracted a private `findOpenTripByBuddyListingId` helper so `getOpenTripForBuddies`/`resolveTripIdForBuddyListing` share one query instead of duplicating the `openToBuddies: true` filter — the invariant the whole security design leans on now only has to be correct in one place. Also extracted `formatDateRange` to `shared/formatDateRange.ts` (it had accumulated four separate copies across Trip Detail, My Trips, and this story's two new screens) and normalized an empty-string `message` to `undefined` server-side, matching Story 2.1's `buddyNote` fix. `RequestStatus`'s "accepted" branch now handles a missing `tripCode` defensively (currently unreachable given the backend's own guarantee, but cheap insurance against a future contract mismatch reading as "still waiting" instead of "something's wrong").
- **Deferred to Story 2.3, not fixed here:** once a request is declined, `BuddyRequestPage` has no way back to the request form for that listing short of clearing `localStorage` — a real dead end, but `status` can only ever be `"pending"` through this story's own code paths (nothing before 2.3 can produce `"declined"`), so the right resubmission UX is squarely 2.3's own design question, not something to guess at now with incomplete context.

## Spec Change Log

## Review Triage Log

*Code review of the diff since baseline, via blind-hunter, edge-case-hunter, and verification-gap layers, 2026-09-28.*

- **medium, patch** — `getOpenTripForBuddies`/`resolveTripIdForBuddyListing`'s `openToBuddies: true` filter was only tested against `buddyListingId`s that never existed, not a listing that was open and was then closed — Verification Gap traced a concrete regression (dropping the filter would ship undetected) for both the `GET` and `POST` endpoints independently; Blind Hunter flagged the same gap. Fixed: added both missing tests (open → close → `GET`/`POST` both `404`), and consolidated the filter into one shared private helper so the invariant can't drift between the two call sites.
- **low, patch** — `message` was trimmed but not normalized — an empty/whitespace-only value persisted as `""` rather than `undefined`/no-message, inconsistent with the client's own empty-to-undefined conversion (Blind Hunter). Fixed: same pattern as Story 2.1's `buddyNote` normalization.
- **low, patch** — `formatDateRange` was duplicated verbatim across `TripDetailPage`, `MyTripsPage`, and this story's two new screens — four copies (Blind Hunter). Fixed: extracted to `shared/formatDateRange.ts`, all four call sites updated.
- **low, patch** — `RequestStatus`'s `status === 'accepted'` branch silently fell through to the generic "waiting on the group" message if `tripCode` were ever missing, rather than surfacing that something was wrong (Edge Case Hunter). Currently unreachable given the backend's own guarantee (`getBuddyRequestStatus` always includes `tripCode` when `status === 'accepted'`), but a trivial, cheap defensive branch. Fixed.
- **defer (to Story 2.3)** — Blind Hunter: once declined, `BuddyRequestPage` offers no way back to the request form short of clearing `localStorage` — a real dead end, but unreachable end-to-end until 2.3 ships the mutation that can actually produce a `"declined"` status. The right resubmission UX belongs in that story, designed with full context, not guessed at here.
- **low, reject** — Blind Hunter: the `add_trip_buddy_listing_id` migration's `INSERT` doesn't backfill `buddyListingId` for pre-existing rows, so it would fail against a Trip table that already had data. True, and the migration's own auto-generated header comment says so — but it already applied cleanly to the only database this project has (`dev.db`, recreated fresh; deployment is explicitly out of scope project-wide, no CI, no other environment will ever replay this migration against non-empty data).
- **false** — Blind Hunter: "no real-time notification, check back later" (Boundaries) leaves the requester with no way to see an updated status without a full reload. This is the documented, intended mechanism (`epic-2-context.md`: "no real-time notification exists for requesters ... only visible on revisit via the same link/session") — a normal re-navigation to the page already triggers a fresh fetch; nothing more is owed here.
- **false** — Blind Hunter + Edge Case Hunter: no server-side duplicate-request guard / rate limiting. Explicitly disclosed as intentional in this spec's own Always constraints (AD-14: client-side/bypassable by design) — both reviewers independently confirmed this matches the spec, not a gap.
- **false** — Edge Case Hunter: `nanoid()` collisions on `buddyListingId`/`TravelBuddyRequest.id` are unhandled. Same negligible-probability, already-accepted risk every other `nanoid()`-generated id in this codebase carries (`Trip.id`, `TripMember.id`, `ItineraryItem.id`, ...) — not a new gap this story introduces, and retry-on-collision logic would be disproportionate for a portfolio-scale project.
- **false** — Edge Case Hunter: `formatDateRange` could render "Invalid Date" for a malformed date string. Unreachable: dates always originate from the backend's already-validated `z.iso.date()` fields (Story 1.3) — the same precedent already established for this exact function in Story 1.6's review.
- **low, reject (carried)** — Blind Hunter: no frontend test coverage for the new Buddies screens/index. Same pre-existing, project-wide condition already carried since Story 1.2.

## Design Notes

**The `buddyListingId` decision:** AD-7 requires the Buddies browse listing to never expose the Trip Code (`Trip.id`), since possessing it grants full view+edit access to the Trip. But submitting a request needs *some* stable per-Trip reference. Two options were weighed: a stateless HMAC token computed from `Trip.id` + a server secret (no schema change, but introduces a new "secret management" concept nowhere else in this app), versus a second persisted, `nanoid()`-generated column (a small migration, but matches this codebase's established "ids generated via `nanoid()` in application code" convention exactly, with a plain O(1) unique-index lookup instead of an O(n) scan). Chose the persisted column — more consistent with the rest of the schema, simpler to reason about, and a migration is a normal, unremarkable schema evolution here, not something to avoid.

**Why a separate per-request status-check id, not the `buddyListingId` again:** using `buddyListingId` to check status would mean anyone who ever saw a Trip in the public listing could poll it for *any* requester's status. `TravelBuddyRequest.id` is per-submission and known only to the browser that created it, so it's the right scope for "check my own request."

## Verification

**Commands:**
- `cd apps/api && npm test` -- expected: all tests pass, including the new `buddies/routes.test.ts`
- `cd apps/api && npx tsc --noEmit` -- expected: clean
- `cd apps/web && npm run lint` -- expected: clean
- `cd apps/web && npm run build` -- expected: succeeds

**Manual checks (if no CLI):**
- Toggle a Trip open to buddies with a note (Story 2.1), then visit `/buddies` in a different browser/private window → the Trip appears with its note, no code visible anywhere in the network response.
- Submit a request → "Request sent — waiting on the group." appears; revisiting `/buddies/:buddyListingId` in the same window skips the form and shows the same status.
