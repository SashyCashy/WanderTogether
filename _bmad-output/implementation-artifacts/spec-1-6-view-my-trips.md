---
title: 'Story 1.6: View My Trips'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '98ed88331fea92df1afdd31df334fc20709848af'
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The local "My Trips" index (AD-13) has been written to since Story 1.3, but nothing reads it — there's no screen showing a returning visitor the Trips this browser already knows about.

**Approach:** Add a `/my-trips` screen that reads the local index's stored Trip Codes, resolves each via the existing per-Trip `GET` (no new backend endpoint — `TanStack Query`'s `useQueries` for the dynamic list), and renders them as `Row`s with current name/dates; wire the nav's already-present "My Trips" tab to it.

## Boundaries & Constraints

**Always:**
- Read the index via a new `getMyTripsIndex()` export from `myTripsIndex.ts` (the module's first read-only accessor for the full index — `hasTripInIndex`/`addTripToIndex` already exist for the write side).
- Each stored Trip Code is resolved with the same `fetchTrip`/`['trip', code]` convention `TripDetailPage` uses — `useQueries`, not a new bulk endpoint (AC's own wording: "looked up via the normal per-Trip GET").
- A Trip Code that fails to resolve (transient network error — no delete capability exists anywhere, so a stored code going genuinely invalid isn't a real path) is silently omitted from the rendered list rather than shown as a broken row; this doesn't change what's stored locally.
- The nav's existing "My Trips" tab (`Navigation.tsx`, wired since Story 1.2 as an inert placeholder `href="#my-trips"`) becomes a real link to `/my-trips`, with the same active-tab underline treatment `/` already gets.

**Never:**
- No change to when the index is written — that's already correct (Stories 1.3/1.4): creation and a successful Traveler Profile submission are the only writes, so a merely-viewed, never-joined Trip already can't appear here.
- No pagination UI for this story specifically — the "pagination not infinite scroll" convention applies in principle, but pagination itself isn't built until a listing surface's realistic size calls for it (matches Story 1.2's identical reasoning for Discover's 4-item catalog).
- No new backend route or schema change.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Browser has stored Trips | Local index has ≥1 entry | Each renders as a `Row` with current name/dates, fetched fresh (not from the stale local index value) | N/A |
| Browser has no stored Trips | Local index is empty | "No trips yet." empty state — the default first-visit state, not an edge case — with "Start a Trip" and "Enter a Trip Code" actions | N/A |
| A stored code fails to resolve | Fetch error for one entry among several | That entry is omitted; the rest still render | Silent — no per-row error UI |

</frozen-after-approval>

## Code Map

- `apps/web/src/shared/myTripsIndex.ts` -- add `getMyTripsIndex(): MyTripsIndex` — returns the full stored index (read-only; existing `readIndex()` is already private/internal, this just exposes it)
- `apps/web/src/features/my-trips/MyTripsPage.tsx` (+ `.css`) -- new: reads `getMyTripsIndex()`'s keys, `useQueries` over `fetchTrip` per code (same `['trip', code]` key `useTrip` uses, so results share cache with `TripDetailPage`), renders `Row`s (reusing `RowSkeleton` while loading, `EmptyState` for the no-trips case)
- `apps/web/src/App.tsx` -- add `/my-trips` → `MyTripsPage` in `CurrentPage`; change the "My Trips" `NAV_ITEMS` entry from `href: '#my-trips'` to `href: '/my-trips'`; extend `activeHref` to also match `/my-trips`

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/shared/myTripsIndex.ts` -- `getMyTripsIndex()`
- [x] `apps/web/src/features/my-trips/MyTripsPage.tsx` (+ `.css`) -- list/loading/empty states
- [x] `apps/web/src/App.tsx` -- `/my-trips` route + real nav link

**Acceptance Criteria:**
- Given this browser has created or joined at least one Trip, when the visitor opens My Trips, then each stored Trip Code renders as a row, looked up via the normal per-Trip GET, reflecting its current name/dates
- Given this browser has never created or joined a Trip, when the visitor opens My Trips for the first time, then "No trips yet." renders with both a "Start a Trip" and an "Enter a Trip Code" action, as the default state
- Given the local index only writes on Trip creation or a first successful Traveler Profile submission, when a visitor merely viewed a Trip link without submitting a name, then that Trip does not appear in My Trips

## Implementation Notes

- `useQueries` (not N separate `useTrip` calls) — the list of Trip Codes is dynamic, so a fixed number of hook calls isn't possible; each query still uses the same `['trip', code]` key, so results share the cache with `TripDetailPage`/`useTrip` (opening a trip from My Trips doesn't refetch if it was just resolved here).
- A stored code that fails to resolve is filtered out of `trips` individually; only when *every* stored code fails (and none are still loading) does the page show a distinct "Couldn't load this" state with a Retry that calls `refetch()` on every query — this is a page-level fallback for a total failure, not per-row error UI (spec's Always constraint: per-row failures are silent).
- `getMyTripsIndex()` just exposes the module's existing private `readIndex()` — no new storage format or read path.
- No automated tests: `apps/web` has no test runner configured project-wide (same pre-existing condition Stories 1.2–1.5 already established/carried). Verified via `tsc`/`vite build` only; did not drive the UI in an actual browser this session (no browser-automation tool available) — the empty-state actions, the loaded-list rendering, and the "merely viewed, never joined" exclusion are unverified beyond code review and type/build checks. The last of those is a direct, already-tested consequence of `addTripToIndex` only being called on creation/join-success (Stories 1.3/1.4), not new logic this story adds.
- Post-review: `stillLoading`/`allFailed` now wait for every `useQueries` result to settle before evaluating anything, instead of `every`/aggregate checks that could exit the loading state (or flash a false "Couldn't load this") the moment just one query among several settled first. Added `useAnnounce` calls on load-complete/error, matching the pattern established in Discover/Trip Detail/Create Trip.

## Spec Change Log

## Review Triage Log

*Code review of the diff since baseline, via blind-hunter, edge-case-hunter, and verification-gap layers, 2026-09-28.*

- **medium, patch** — `isLoading`/`allFailed` used `every()`/aggregate checks against individual query settlement, so the moment just one query among several settled (success or error) while others were still fetching, the page could exit the loading state prematurely (silently shrinking the list with no indication more rows were coming) or — worse — show "Couldn't load this" while other codes were still perfectly valid and in flight. Independently caught by all three layers (Blind Hunter, Edge Case Hunter, and Verification Gap's "Other findings"), with Edge Case Hunter and Verification Gap tracing the exact same concrete scenario (one fast error among several still-pending queries). Verified by tracing TanStack Query's per-query `isLoading` semantics against the `every()` calls. Fixed: both derivations now wait for every query to settle (`stillLoading = results.some(isLoading)`) before evaluating success/failure at all.
- **low, patch** — `MyTripsPage` never called `useAnnounce`, unlike every other data-driven screen in the app (Discover, Trip Detail, Create Trip) (Blind Hunter). Fixed: announces on load-complete (with count) and on the all-failed state.
- **low, reject** — Blind Hunter: no tests for `MyTripsPage`'s render branches. Same pre-existing condition already carried since Story 1.2 (`apps/web` has no test runner configured project-wide).
- **low, reject** — Blind Hunter: `retryAll` refetches every query, not just failed ones, on retry. False in practice once the loading-state fix landed: the Retry button only renders in the `allFailed` branch, which is now only reachable when *zero* queries succeeded — so "refetch all" and "refetch only the failed ones" are the same set in that branch.
- **low, reject** — Blind Hunter: no sorting order for the trips list (renders in local-index insertion order). Not a defect — no AC specifies an order, and insertion order is a defensible, simple default consistent with the project's "no drag-to-reorder" simplicity posture elsewhere.
- **low, reject** — Blind Hunter: no cap on parallel `fetchTrip` requests fired by `useQueries` if the local index grows large. Disproportionate for a personal-browser index realistically holding a handful of trips in this project's stated scale; batching adds real complexity for a hypothetical concern.
- **low, reject** — Blind Hunter: a Trip Code that fails to resolve isn't cleaned up from the local index, so it keeps failing on every future visit. Deliberately not "fixed": since no delete capability exists anywhere in the product, a failure is almost always transient (network blip), and auto-removing the entry on a possibly-transient failure risks discarding a real trip reference — worse than leaving it.
- **false** — Edge Case Hunter: `formatDateRange` could render literal "Invalid Date" text if `startDate`/`endDate` were non-null but malformed. Unreachable: these values always originate from the backend's already-validated `z.iso.date()` fields (Story 1.3), and this is the exact same function already shipped, unflagged, in `TripDetailPage` since that story — not a new risk this diff introduces.

## Verification

**Commands:**
- `cd apps/web && npm run lint` -- expected: clean
- `cd apps/web && npm run build` -- expected: succeeds
- `cd apps/api && npm test` -- expected: unaffected, still passing (no backend changes)

**Manual checks (if no CLI):**
- Fresh browser/private window with an empty local index → visiting `/my-trips` shows "No trips yet." with both actions.
- Create a Trip, then visit `/my-trips` → it appears with the trip's name and dates.
- Open a Trip link in a fresh window and merely view it (don't submit a display name) → `/my-trips` in that window still shows "No trips yet."
