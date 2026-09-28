---
title: 'Story 1.2: Browse and Filter Destinations'
type: 'feature'
created: '2026-09-27'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '09abe0b3521054e725779ac7f8d30ecb483b5422'
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Destination catalog exists (seeded in Story 1.1) but nothing browses or displays it — Discover is the app's entry point and the first real screen, and right now `apps/web` renders only a placeholder.

**Approach:** Add a `GET /api/destinations` endpoint (discovery slice) returning the full seeded catalog, and a Discover screen (React) that renders it as rows, with client-side region/trip-type filtering, a cold-load skeleton, and the two distinct empty states (no-results vs. load-failed) EXPERIENCE.md requires.

## Boundaries & Constraints

**Always:**
- Feature API routes mount under `/api/*` (matching `vite.config.ts`'s existing dev proxy target) — this is the first feature route in the project and establishes that convention for every later story. `/health` stays unprefixed (infra, not a feature route).
- Filtering happens client-side against one unfiltered fetch of the full catalog. The Destination catalog is seed-only and structurally small (AD-12 — no runtime create endpoint, ever) — server-side filter query params would be real complexity with no scaling justification. Revisit only if this assumption changes.
- The discovery slice owns `Destination` and reads it directly via Prisma (it's the owning slice, not a cross-slice read — AD-1's rule restricts *other* slices, not the owner).
- No client-side router. `App.tsx` renders the Discover screen directly as its main content; `Navigation`'s other tabs stay non-functional until a second real screen exists (Story 1.3+) and a routing decision is actually needed.
- Reuse the shared `Row` and `EmptyState` components from Story 1.1 exactly as they are — do not fork or modify their props contract.

**Never:**
- No "start a trip" action from a Destination (FR-2, Story 1.3).
- No pagination controls — the catalog is 4 rows; the pagination-not-infinite-scroll *convention* still applies in principle, but there's nothing to paginate yet.
- No server-side query params for region/trip-type filtering (see Boundaries above).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Fetch the catalog | Seeded DB (4 destinations) | `GET /api/destinations` returns `200` with a 4-item JSON array, each `{ id, name, country, region, tripType, description, photoUrl }` | N/A |
| Fetch with no destinations seeded | Empty `Destination` table | `GET /api/destinations` returns `200` with `[]` — an empty catalog is not an error | N/A |
| Client selects a region filter | Full catalog already loaded | Visible rows narrow to matching region, no network request, no page reload | N/A |
| Client's selected filter matches nothing | e.g. a region with 0 destinations | "No results" empty state renders (not "Couldn't load this") | N/A |
| Fetch fails (network/server error) | API unreachable or 5xx | "Couldn't load this" empty state renders, with a retry action | Distinct from "No results" — different headline/body text |

</frozen-after-approval>

## Code Map

- `apps/api/src/index.ts` -- currently builds the Express app *and* calls `.listen()` in one file; split into `apps/api/src/app.ts` (exports the built `app`, no listen) + `index.ts` (imports `app`, calls `.listen`) so a test can import the app without binding a real port
- `apps/api/src/shared/prisma.ts` -- reuse as-is; `prisma.destination.findMany()` is the only query this story needs
- `apps/api/src/features/discovery/service.ts` -- new: `listDestinations(): Promise<DestinationSummary[]>`, selecting only the fields the frontend needs (excludes `slug`/`createdAt`)
- `apps/api/src/features/discovery/routes.ts` -- new: `GET /api/destinations` calling the service, wrapped so thrown errors reach `error-middleware.ts`
- `apps/web/src/shared/components/{Row,EmptyState}.tsx` -- reuse as-is from Story 1.1 (see that story's spec for their prop shapes)
- `apps/web/src/shared/components/RowSkeleton.tsx` -- **new, but belongs in `shared/`, not `discover/`**: Story 1.1's shared layer didn't build a cold-load skeleton despite EXPERIENCE.md requiring one on every listing surface — this is the first surface that needs it, so it's built here as a shared component for Buddies/Write-ups/Accommodations to reuse later, not duplicated locally
- `apps/web/src/features/discover/api.ts` -- new: `fetchDestinations()` — plain `fetch('/api/destinations')`
- `apps/web/src/features/discover/useDestinations.ts` -- new: TanStack Query hook, key `['destinations']` — establishes the query-key convention for this entity family (parallel to AD-10's `['trip', tripCode]` convention for Trips)
- `apps/web/src/features/discover/DiscoverPage.tsx` -- new: renders the filter controls (region/trip-type, options derived from the fetched data itself), the row list via `Row`, and the cold-load/no-results/load-failed states via `RowSkeleton`/`EmptyState`
- `apps/web/src/App.tsx` -- render `<DiscoverPage />` as the main content instead of the current placeholder `<h1>`/`<p>`

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/app.ts` + `index.ts` -- split app-building from `.listen()` -- enables testing the Express app without a real port
- [x] `apps/api/src/features/discovery/service.ts` -- `listDestinations()` querying Prisma -- returns the trimmed field set
- [x] `apps/api/src/features/discovery/routes.ts` -- `GET /api/destinations` -- mounted in `app.ts` under the `/api` prefix established by this story
- [x] `apps/web/src/shared/components/RowSkeleton.tsx` (+ `.css`) -- 4-6 placeholder rows matching `Row`'s layout rhythm
- [x] `apps/web/src/features/discover/api.ts` + `useDestinations.ts` -- fetch + TanStack Query wrapper, key `['destinations']`
- [x] `apps/web/src/features/discover/DiscoverPage.tsx` (+ `.css` if needed) -- filter controls, row list, all three non-happy states
- [x] `apps/web/src/App.tsx` -- wire `DiscoverPage` in as the rendered content
- [x] `apps/api/src/features/discovery/routes.test.ts` -- automated coverage for the I/O matrix (route returns the seeded catalog; empty-table case), using the app/listen split above — no new test-framework dependency, same `node:test` pattern as Story 1.1's `seed.test.ts`

**Acceptance Criteria:**
- Given the Destination catalog has seed data, when a visitor opens Discover, then destinations render as `Row`s (per `DESIGN.md`/`EXPERIENCE.md`'s hairline pattern) with a `RowSkeleton` shown while fetching
- Given a visitor selects a region or trip-type filter, when the filter changes, then the visible list narrows with no network request and no page reload
- Given no destinations match the current filter, when the list is empty, then "No results" renders — visually and textually distinct from a genuine fetch failure
- Given the fetch fails, then "Couldn't load this" renders with a retry action
- Given any visitor, then Discover requires no login step anywhere

## Implementation Notes

- `apps/api/src/index.ts` split into `app.ts` (exports `createApp()`, no `.listen()`) + `index.ts` (imports it, calls `.listen()`), as the Code Map specified.
- `discoveryRouter` mounted at `/api/destinations` in `app.ts` — the first feature route, establishing the `/api/*` convention; `/health` stays unprefixed.
- `listDestinations()` uses a Prisma `select` for the trimmed field set (excludes `slug`/`createdAt`) and orders by `name` for a stable row order.
- Frontend: `useDestinations()` (`['destinations']` key) fetches the full catalog once; `DiscoverPage` derives region/trip-type filter options from the fetched data itself and filters client-side with `useMemo` — no network request or reload on filter change. A `viewState` union (`loading | error | empty | results`) keeps the skeleton/error/no-results/results states mutually exclusive; the "Retry" action calls `refetch()`.
- Added a `QueryClientProvider` in `main.tsx` — TanStack Query was a dependency but no provider existed yet before this story (Story 1.1 only scaffolded the shared layer, not a data-fetching screen).
- `RowSkeleton` built as a new shared component per the Code Map's note that Story 1.1 didn't build one despite EXPERIENCE.md requiring it on every listing surface.
- `routes.test.ts` runs against its own throwaway SQLite file (migrated by replaying every folder under `prisma/migrations`, in order) rather than the shared `apps/api/prisma/dev.db`, so it can safely test a genuinely empty `Destination` table without racing or corrupting `seed.test.ts`'s state. `DATABASE_URL` is set before any app/prisma module is imported (all imports in that file are dynamic for that reason). `apps/api/package.json`'s `test` script was widened from `prisma/**/*.test.ts` to also include `src/**/*.test.ts` — no extra concurrency flag needed, since Node's test runner already isolates each matched file into its own process by default and `routes.test.ts` never touches the shared `dev.db`.
- Verified manually against the real seeded `dev.db`: `GET /api/destinations` returns the 4-item catalog with the trimmed field shape; `GET /health` still responds `{"status":"ok"}`.

### Review Findings

*Code review of the uncommitted diff, via blind-hunter, edge-case-hunter, and verification-gap layers, 2026-09-28.*

- [x] [Review][Patch] `routes.test.ts` hardcodes one migration folder name (`20260927090112_init`) — will silently apply a stale/partial schema once a second migration exists [apps/api/src/features/discovery/routes.test.ts]
- [x] [Review][Patch] `routes.test.ts` asserts `body.length === 4` (magic number) instead of against `SEED_COUNTS.destinations` [apps/api/src/features/discovery/routes.test.ts]
- [x] [Review][Patch] `--test-concurrency=1` serializes the whole suite as a workaround for `seed.test.ts` sharing the dev DB, instead of isolating `seed.test.ts` the way `routes.test.ts` already isolates itself [apps/api/package.json, apps/api/prisma/seed.test.ts]
- [x] [Review][Patch] `DiscoverPage` never uses the app's own `LiveRegionProvider`/`useAnnounce` to announce load-complete, load-failed, or filter-result-count changes to screen-reader users [apps/web/src/features/discover/DiscoverPage.tsx]
- [x] [Review][Patch] `useDestinations` has no `retry` override — TanStack Query's default 3 retries + backoff delay the "Couldn't load this / Retry" UI's appearance well past a genuine failure [apps/web/src/features/discover/useDestinations.ts]
- [x] [Review][Patch] `service.ts`'s AD-1 justification comment cites the rule without a concrete doc reference [apps/api/src/features/discovery/service.ts]
- [x] [Review][Patch] `GET /api/destinations` has no test for its failure path, despite `DiscoverPage` being explicitly built with error UI for exactly that case [apps/api/src/features/discovery/routes.test.ts]
- [x] [Review][Patch] A failed background refetch (e.g. on window refocus) blanks previously-loaded rows and shows the load-failed state, discarding good cached data [apps/web/src/features/discover/DiscoverPage.tsx]
- [x] [Review][False] Clicking Retry repeatedly before the in-flight refetch resolves can fire duplicate concurrent requests [apps/web/src/features/discover/DiscoverPage.tsx, apps/web/src/shared/components/EmptyState.tsx]
- [x] [Review][Patch] Empty-catalog and no-filter-match both render the same filter-specific "No destinations match these filters" message, even when no filter is applied [apps/web/src/features/discover/DiscoverPage.tsx]

**Rejected:**
- `low` (reject) — Blind Hunter: no frontend tests for `DiscoverPage`/`useDestinations`. Verification Gap independently confirmed this predates the diff (Story 1.1 also shipped with no `apps/web` test runner) and isn't a reportable gap under its own rules; consistent with Story 1.1's own prior explicit rejection of adopting frontend test tooling at this project's stakes.
- `low` (reject) — Edge Case Hunter: selected filter could go stale if the region/trip-type option set changes after a refetch. The Destination catalog is seed-only and structurally immutable at runtime (AD-12 — no create/delete endpoint exists anywhere in the product), so this state is unreachable through any real code path in this app.

## Spec Change Log

## Review Triage Log

- **medium, patch** — `routes.test.ts` hardcoded the single migration folder name; a second migration would be silently skipped, applying a stale schema with no test failure. Verified by reading the file (line referencing `20260927090112_init` directly). Fixed: reads all folders under `prisma/migrations`, sorted, and replays each `migration.sql` in order.
- **low, patch** — `body.length === 4` magic number instead of `SEED_COUNTS.destinations`. Verified present. Fixed: asserts against the imported constant.
- **low, patch** — `--test-concurrency=1` was added on the premise that `routes.test.ts`'s temp-DB writes and `seed.test.ts`'s shared-DB writes could interleave. Verified false in practice: ran the full suite without the flag (`node --import tsx --test prisma/**/*.test.ts src/**/*.test.ts`) and all 5 tests passed — Node's test runner isolates each file into its own process by default, and `routes.test.ts` never touches the shared `dev.db`. Fixed: removed the flag and the misleading comment.
- **medium, patch** — `DiscoverPage` never announced load-complete/load-failed/filter-result-count changes via the app's existing `LiveRegionProvider`/`useAnnounce`, despite that mechanism existing specifically for same-page updates with no navigation (per `LiveRegion.tsx`'s own doc comment, which names exactly this class of update). Verified: no import of `useAnnounce` in the file. Fixed: added an effect that announces on `viewState` and result-count changes.
- **medium, patch** — `useDestinations` had no `retry` override; TanStack Query's default (3 retries + backoff) delays the explicit AC's "Couldn't load this / Retry" UI by several seconds past a genuine failure. Verified: no `retry` key in the `useQuery` call. Fixed: `retry: false`.
- **low, patch** — `service.ts`'s AD-1 comment cited the rule without a concrete doc pointer. Verified. Fixed: added a reference to `SOLUTION-DESIGN.md`'s AD-1 section (confirmed present at `architecture/architecture-WanderTogether-2026-09-27/SOLUTION-DESIGN.md:35`).
- **medium, patch** — `GET /api/destinations` had no test for its failure path, though `DiscoverPage`'s AC explicitly requires "Couldn't load this" behavior on fetch failure. Verified: only the two success-path tests existed. Fixed: added a test that drops the table to force a genuine query failure, asserting the 500 + shared error envelope.
- **medium, patch** — A failed background refetch (e.g. window refocus) set `isError` while `destinations` still held the last good catalog, but `viewState`'s original ternary chain prioritized `isError` unconditionally, blanking good cached rows to show "Couldn't load this." Verified by tracing TanStack Query's `isLoading`/`isError` semantics against the ternary. Fixed: `viewState` now falls back to `'error'` only when there is no cached data (`isError && !destinations`); stale data stays visible through a background failure.
- **false** — Clicking Retry repeatedly before an in-flight refetch resolves. TanStack Query's `Query.fetch()` reuses the existing in-flight promise/retryer for a given query key rather than issuing a new network request when a fetch is already underway — verified this is the library's documented deduplication behavior, not something this code needs to guard against itself.
- **low, patch** — The empty state rendered the filter-specific "No destinations match these filters" message even when the catalog itself was empty (no filter applied) — misleading given the I/O matrix's explicit "empty catalog is not an error" scenario. Verified: `viewState === 'empty'` always used the same copy regardless of `hasCatalog`. Fixed: branches on `hasCatalog` to show "No destinations yet." when the catalog itself is empty.
- **low, reject (carried)** — Blind Hunter: no frontend tests for `DiscoverPage`/`useDestinations`. Pre-existing project posture (Story 1.1 shipped with no `apps/web` test runner); not caused by this diff.
- **low, reject (carried)** — Edge Case Hunter: selected filter could go stale if the filter option set changes after a refetch. Unreachable: the catalog is seed-only and structurally immutable at runtime (AD-12).

## Verification

**Commands:**
- `cd apps/api && npm test` -- expected: all tests pass, including the new `routes.test.ts`
- `cd apps/api && npx tsc --noEmit` -- expected: clean
- `cd apps/web && npm run lint` -- expected: clean (this now genuinely typechecks per Story 1.1's code-review fix)
- `cd apps/web && npm run build` -- expected: succeeds

**Manual checks (if no CLI):**
- Open `apps/web` in a browser: Discover renders 4 destination rows; selecting a region filter narrows the list instantly; clearing the filter restores all 4.
