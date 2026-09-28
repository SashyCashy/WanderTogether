---
title: 'Story 3.2: Browse and Read Trip Write-ups'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '9c508f19022296765524b02140c1126ad31d21b1'
context:
  - _bmad-output/implementation-artifacts/epic-3-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 3.1 lets a visitor publish a Trip Write-up, but nothing lets anyone browse or read one — published write-ups are invisible with no listing or detail screen.

**Approach:** Add `GET /api/write-ups` (paginated, optional `destinationId` filter) and `GET /api/write-ups/:id`, plus a listing screen at `/write-ups` and a detail screen at `/write-ups/:id`. The "Write-ups" nav tab repoints from Story 3.1's composer to this listing (mirroring how My Trips/Buddies' nav entries evolved); the listing's own header carries a "Write a Trip Write-up" link to the composer.

## Boundaries & Constraints

**Always:**
- Browsing and reading a write-up requires no Trip Code, membership, or authentication — same as publishing (Story 3.1).
- The listing is paginated (page-based, never infinite scroll) — `page`/`pageSize` query params, response includes `totalCount` so the frontend can render Prev/Next controls.
- The Destination filter is a server-side query param (`destinationId`), not client-side filtering — unlike Discover's region/trip-type filters (spec-1-2), because the write-ups list is paginated and an unfiltered full-catalog fetch isn't available client-side to filter against.
- A write-up with no Destination link is excluded from a Destination-filtered view but remains visible in the unfiltered list.
- Loading state is a `RowSkeleton` (existing shared component); "no write-ups yet" / "no write-ups match this filter" and "listing failed to load" are visually and textually distinct `EmptyState`s.
- Every write-up photo in the detail view carries descriptive alt text derived from the write-up's title (e.g. `"Photo from {title}"} — not empty `alt=""`, since these are content photos, not decorative swatches.
- Clicking a listing row opens `/write-ups/:id` — no separate "view" button, matching `Row`'s existing pattern.

**Never:**
- No comments, likes, or any interaction on a write-up beyond reading it.
- No editing or deleting a write-up from this screen (no such capability exists anywhere yet).
- No client-side caching/prefetch of every page — each page navigation is its own fetch, same as every other listing in this codebase.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Browse the unfiltered listing | `GET /api/write-ups?page=1` | `200`; `items` (newest first), `totalCount`, `page`, `pageSize` | N/A |
| Browse filtered by Destination | `GET /api/write-ups?destinationId=<id>&page=1` | `200`; only write-ups linked to that Destination | N/A |
| Filter by a Destination with zero write-ups | Valid `destinationId`, no matches | `200`; `items: []`, `totalCount: 0` — renders "no write-ups match this filter" | N/A |
| Page beyond the last page | `page` past `totalCount / pageSize` | `200`; `items: []` (not a 400) — same empty-listing render | N/A |
| Read a write-up detail | `GET /api/write-ups/:id`, valid id | `200`; full write-up incl. `destination: { name, country } \| null` | N/A |
| Read a write-up that doesn't exist | Unknown or malformed id | `404 NOT_FOUND` | Detail screen shows "Couldn't find this write-up." with a link back to the listing |

</frozen-after-approval>

## Code Map

- `apps/api/src/features/write-ups/service.ts` -- add `listWriteups({ destinationId?, page, pageSize }): Promise<{ items: TripWriteupSummary[], totalCount: number, page: number, pageSize: number }>` (uses `prisma.tripWriteup.findMany` with `skip`/`take`/`orderBy: { createdAt: 'desc' }`, `prisma.tripWriteup.count` for `totalCount`) and `getWriteupById(id): Promise<TripWriteupDetail>` (throws `AppError('NOT_FOUND', ...)` when missing, `include: { destination: { select: { name: true, country: true } } }`) — same file as `createWriteup`, no new file needed
- `apps/api/src/features/write-ups/routes.ts` -- add `GET /` (zod-validates `page`/`pageSize`/`destinationId` query params, defaults `page=1`, `pageSize=10`) and `GET /:id`
- `apps/web/src/features/write-ups/api.ts` -- add `fetchWriteups(params): Promise<WriteupsPage>` and `fetchWriteup(id): Promise<TripWriteup>` (extend the existing `TripWriteup` interface with `destination: { name, country } | null`), alongside the existing `createWriteup`
- `apps/web/src/features/write-ups/WriteupsPage.tsx` (+ `.css`) -- new: listing at `/write-ups` — `Row` per write-up (headline = title, description = body truncated, eyebrow = destination name if linked), Destination filter `<select>` (reusing `useDestinations()`, same idiom as `CreateTripPage`'s dropdown), Prev/Next pagination controls, `RowSkeleton`/`EmptyState` per the loading/empty/error states already established in `BuddiesPage.tsx`
- `apps/web/src/features/write-ups/WriteupDetailPage.tsx` (+ `.css`) -- new: full title/body/photos (`<img>` grid) /author/destination for one write-up at `/write-ups/:id`; 404 renders `EmptyState` with a "Back to Write-ups" link
- `apps/web/src/App.tsx` -- add `/write-ups` → `WriteupsPage` and `/write-ups/:id` → `WriteupDetailPage` (mirrors the existing `/buddies` + `/buddies/:buddyListingId` pair); repoint the "Write-ups" nav item from `/write-ups/new` to `/write-ups`

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/features/write-ups/service.ts` -- `listWriteups`, `getWriteupById`
- [x] `apps/api/src/features/write-ups/routes.ts` -- `GET /`, `GET /:id`
- [x] `apps/web/src/features/write-ups/api.ts` -- `fetchWriteups`, `fetchWriteup`
- [x] `apps/web/src/features/write-ups/WriteupsPage.tsx` (+ `.css`)
- [x] `apps/web/src/features/write-ups/WriteupDetailPage.tsx` (+ `.css`)
- [x] `apps/web/src/App.tsx` -- routes + repointed nav link
- [x] `apps/api/src/features/write-ups/routes.test.ts` -- coverage for the I/O matrix (extends the existing file from Story 3.1)

**Acceptance Criteria:**
- Given at least one published write-up exists, when a visitor opens `/write-ups`, then they see it listed without any Trip Code, membership, or login
- Given more write-ups exist than fit on one page, when the visitor pages through the listing, then each page is its own fetch (`page`/`pageSize` params) and Prev/Next reflect whether a previous/next page exists
- Given a visitor filters the listing by Destination, when a write-up has no Destination link, then it's excluded from that filtered view but still appears in the unfiltered listing
- Given a visitor clicks a listing row, when the detail screen loads, then it shows the full title, body, all photos, and (if linked) the Destination name

## Implementation Notes

## Spec Change Log

## Review Triage Log

Four-layer parallel review (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor) run against the story's diff.

**Patched:**
- **Listing row missing the Destination eyebrow — real deviation from this spec's own Code Map.** The Code Map specified `eyebrow = destination name if linked`, but the listing's `Row` usage passed no `eyebrow`, and — worse — `WRITEUP_SUMMARY_SELECT` never fetched `destination.name`/`.country` for list items at all, so a Destination-linked write-up was indistinguishable from an unlinked one in the list. Found independently by blind-hunter and acceptance-auditor. Fixed: `WRITEUP_SUMMARY_SELECT` now joins `destination: { select: { name, country } }` (shared by `createWriteup`, `listWriteups`, and `getWriteupById` alike — `TripWriteupSummary` and `TripWriteupDetail` collapsed into one type since the fields are now identical); `WriteupsPage`'s `Row` passes `eyebrow` from it.
- **No way back to the listing from a successfully-loaded detail view.** The "Back to Write-ups" link only existed on the 404/error branch. Found by blind-hunter. Fixed: added a "Back to Write-ups" link to the successful-load view too.
- **Full RowSkeleton flash on every page/filter change.** `useQuery` had no `placeholderData`, so clicking Next or changing the Destination filter blanked the list and replayed the cold-load skeleton instead of a smooth transition, and re-fired the "N found" live-region announcement each time. Found by blind-hunter. Fixed: added `placeholderData: keepPreviousData`.
- **Missing test: invalid pagination input.** `listWriteupsQuerySchema` enforces `page >= 1` and `pageSize <= 50`, but nothing tested the rejection path. Found by blind-hunter. Fixed: added a test covering `page=0`, `page=-1`, `pageSize=51`, and a non-numeric `page`, all asserting `400`.
- **Missing test: pagination correctness across a page boundary.** Only "page past the last page is empty" was tested — nothing confirmed page 2 actually returns the *next* slice in the right order. Found by blind-hunter. Fixed: added a test publishing 12 write-ups to an isolated Destination and asserting page 1/page 2 split 10/2 with no overlap, matching newest-first order.
- **`publishWriteup` test helper didn't assert its own POST succeeded.** A regression in `POST /api/write-ups` would have surfaced as a confusing `undefined.id` failure in an unrelated `GET` test instead of pointing at the real break. Found by blind-hunter. Fixed: the helper now asserts `201` before returning.
- **Destination-filter `<select>` gave no indication when `useDestinations()` failed.** It silently fell back to just "All destinations" with no error signal. Found by blind-hunter. Fixed: added an inline note when `destinationsError` is true.

**Deferred (matches an existing, established codebase convention — not a deviation introduced by this story):**
- Stale content remaining on screen after a failed page-navigation fetch, with no explicit error signal (edge-case-hunter). `WriteupsPage`'s `isError && !data` branching intentionally mirrors `DiscoverPage`'s existing "prefer last-good data over flashing an error" convention.
- `WriteupDetailPage`'s `isError || !writeup` branching replacing cached content with an error screen on any background-refetch failure (edge-case-hunter). This exactly matches `BuddyRequestPage`'s existing convention for single-entity detail views (the closer precedent — `DiscoverPage`'s catalog-refresh case isn't analogous).
- No frontend unit tests for `WriteupsPage`/`WriteupDetailPage` (blind-hunter) — verification-gap independently confirmed the whole codebase has zero frontend unit tests anywhere, so this isn't a gap this story introduced.

## Verification

**Commands:**
- `cd apps/api && npm test` -- expected: all tests pass, including the extended `write-ups/routes.test.ts`
- `cd apps/api && npx tsc --noEmit` -- expected: clean
- `cd apps/web && npm run lint` -- expected: clean
- `cd apps/web && npm run build` -- expected: succeeds

**Manual checks (if no CLI):**
- Publish two write-ups (one with a Destination link, one without) via `/write-ups/new`, then open `/write-ups` and confirm both are listed, newest first.
- Filter by the linked Destination — only that one write-up should remain visible.
- Click a row and confirm the detail screen renders its title, body, and photo(s).
- Visit `/write-ups/not-a-real-id` and confirm a "couldn't find this write-up" state, not a blank page.
