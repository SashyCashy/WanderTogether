---
title: 'Story 4.1: Browse Accommodation Listings'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'e42f3f1d9ab94fe1ca90610493af4e5014ed6d6b'
context:
  - _bmad-output/implementation-artifacts/epic-4-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `AccommodationListing` has existed in the schema since Story 1.1, seeded with sample data, but nothing lets a Trip member see it — Trip Detail has no Accommodations panel yet.

**Approach:** Add `GET /api/accommodations?destinationId=<id>` (new `accommodations` feature slice, reading the seed-only catalog directly per AD-12's exception) and an Accommodations panel on Trip Detail, filtered to the Trip's own destination.

## Boundaries & Constraints

**Always:**
- The listing is filtered to the viewing Trip's `destination.id` — never the full unfiltered catalog.
- Listings render as hairline `Row`s (name, price/night, rating) — the same pattern Discover and Write-ups already use.
- Loading is a `RowSkeleton`; "no listings for this destination" and "listing failed to load" are visually and textually distinct `EmptyState`s (matching every other listing surface).
- No create/edit/delete affordance for accommodation listings exists anywhere in the UI — the catalog is seed-only (AD-12).
- No attach action in this story — clicking/selecting a listing does nothing yet (Story 4.2 owns attaching). The row is present but inert.

**Never:**
- No payment, reservation, or external booking-system call — this story is read-only browsing of seed data.
- No pagination — the seeded catalog per destination is small (a handful of listings), matching Discover's own unpaginated single-fetch precedent (spec-1-2).
- No standalone `/accommodations` route or nav entry — this panel only exists inside Trip Detail (epic-4-context.md's UX pattern).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Browse listings for a destination with results | Valid `destinationId` with seeded listings | `200`; array of listings for that destination only | N/A |
| Browse a destination with zero listings | Valid `destinationId`, no matches | `200`; `[]` — panel renders "No accommodations listed yet." | N/A |
| Unknown `destinationId` | Doesn't match any seeded Destination | `200`; `[]` — same empty-panel render, not a 400 (mirrors Discover's own no-validation-on-read precedent) | N/A |
| Missing `destinationId` query param | `GET /api/accommodations` with no query | `400 VALIDATION_ERROR` | Panel shows "Couldn't load this." (a real bug, not user-facing input) |

</frozen-after-approval>

## Code Map

- `apps/api/src/features/accommodations/service.ts` -- new: `listAccommodationsForDestination(destinationId: string): Promise<AccommodationListingSummary[]>` — `prisma.accommodationListing.findMany({ where: { destinationId }, orderBy: { rating: 'desc' } })`; direct Prisma read is AD-12's exception to AD-1, same idiom `discovery/service.ts`'s `listDestinations` and `write-ups/service.ts`'s `destinationId` validation already use
- `apps/api/src/features/accommodations/routes.ts` -- new: `GET /` — zod-validates a required `destinationId` query param, calls the service, returns the array directly (no pagination wrapper — matches Discover's `listDestinations` response shape, not Write-ups' paginated one)
- `apps/api/src/app.ts` -- mount `accommodationsRouter` at `/api/accommodations`
- `apps/web/src/features/accommodations/api.ts` -- new: `fetchAccommodations(destinationId: string): Promise<AccommodationListing[]>`, plain `fetch`, same shape as `discover/api.ts`'s `fetchDestinations`
- `apps/web/src/features/accommodations/useAccommodations.ts` -- new: `useQuery({ queryKey: ['accommodations', destinationId], queryFn: () => fetchAccommodations(destinationId), retry: false })`
- `apps/web/src/features/accommodations/AccommodationsPanel.tsx` (+ `.css`) -- new: takes `destinationId: string`; `RowSkeleton`/`EmptyState`/results states per `BuddiesPage.tsx`'s established pattern; `Row` per listing (headline = name, description = `{type} · ${pricePerNightUSD}/night`, metadata = `★ {rating}`, thumbnail = `{ src: photoUrl, alt: name }`); no `href`/`onClick` on the `Row` yet (inert per this story's Boundaries — Story 4.2 wires the click)
- `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- render `<AccommodationsPanel destinationId={trip.destination.id} />` after `PendingBuddyRequests`, inside the existing `hasProfile` branch (same placement tier as the buddy/itinerary sections)

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/features/accommodations/service.ts` -- `listAccommodationsForDestination`
- [x] `apps/api/src/features/accommodations/routes.ts` -- `GET /`
- [x] `apps/api/src/app.ts` -- mount router
- [x] `apps/web/src/features/accommodations/api.ts` -- `fetchAccommodations`
- [x] `apps/web/src/features/accommodations/useAccommodations.ts`
- [x] `apps/web/src/features/accommodations/AccommodationsPanel.tsx` (+ `.css`)
- [x] `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- render the panel
- [x] `apps/api/src/features/accommodations/routes.test.ts` -- coverage for the I/O matrix

**Acceptance Criteria:**
- Given the Accommodation dataset is seeded, when a Trip member opens Trip Detail, then the Accommodations panel renders listings filtered to that Trip's destination as hairline rows (name, price, rating), with a cold-load skeleton while fetching
- Given no listings exist for a Trip's destination, when the panel finishes loading, then "No results" renders, visually and textually distinct from a genuine fetch failure
- Given the catalog is seed-only, when any visitor browses, then no create/edit affordance for listings exists anywhere in the UI

## Implementation Notes

## Spec Change Log

## Review Triage Log

Four-layer parallel review (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor) run against the story's diff.

**Patched:**
- **Loading skeleton used `count={3}`, outside the codebase's established 4-6 range.** Every other listing surface (`DiscoverPage`, `WriteupsPage`, `BuddiesPage`) uses `count={4}`, and `RowSkeleton`'s own doc comment cites EXPERIENCE.md's "4-6" requirement. Found by acceptance-auditor. Fixed: changed to `count={4}`.
- **No tie-breaking secondary sort — same-rated listings had a DB-dependent order.** Found independently by blind-hunter and edge-case-hunter. Fixed: `orderBy` is now `[{ rating: 'desc' }, { name: 'asc' }]`.
- **Destination-filtering isolation wasn't actually proven by the tests.** The existing "no listings" test only covered an empty-result destination, never a case where *two* destinations both have listings — a regression that dropped the `destinationId` filter entirely would still have passed the suite. Found by acceptance-auditor. Fixed: added a test that seeds a listing on a second destination and asserts each destination's results contain only its own listing.
- **Missing test: whitespace-only `destinationId`.** The zod schema's `.trim().min(1)` is specifically meant to reject this, but nothing exercised it. Found by blind-hunter. Fixed: added a test for `destinationId=%20`.

**Deferred (matches an existing, established codebase convention — not a deviation introduced by this story):**
- Stale content remaining on screen after a failed refetch, with no explicit error signal (blind-hunter, edge-case-hunter — both flagged the same `isError && !listings` pattern independently). This mirrors the identical, deliberate convention already used by `DiscoverPage`, `WriteupsPage`, and `BuddyRequestPage` — "prefer last-good data over flashing an error" — and was already deferred for the same reason in Story 3.2's review.
- No frontend unit tests for `AccommodationsPanel`/`api.ts`/`useAccommodations.ts` (blind-hunter) — verification-gap independently re-confirmed the whole codebase has zero frontend unit tests anywhere, so this isn't a gap this story introduced.
- No `Intl.NumberFormat`/rounding on price/rating display (blind-hunter) — not a live bug against the actual seed data (whole-dollar prices, single-decimal ratings); no spec requirement either.
- `AccommodationListing`/`AccommodationListingSummary` type duplicated between backend and frontend (blind-hunter) — matches the existing repo-wide convention (Destination, TripWriteup, etc. are all duplicated the same way; there's no shared-types package).
- `useAccommodations` has no `enabled` guard for an empty `destinationId` (blind-hunter) — verification-gap confirmed `trip.destination.id` is always selected/non-null via `TRIP_SELECT`, so this has no live trigger path.

## Verification

**Commands:**
- `cd apps/api && npm test` -- expected: all tests pass, including the new `accommodations/routes.test.ts`
- `cd apps/api && npx tsc --noEmit` -- expected: clean
- `cd apps/web && npm run lint` -- expected: clean
- `cd apps/web && npm run build` -- expected: succeeds

**Manual checks (if no CLI):**
- Open a Lisbon Trip's detail page and confirm the Accommodations panel lists the 4 seeded Lisbon listings with name/price/rating.
- Open a Trip for a destination with no seeded accommodations and confirm "No accommodations listed yet." renders, not a loading spinner or error.
