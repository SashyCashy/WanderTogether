---
title: 'Story 1.4: Join a Trip via Code/Link and Set a Traveler Profile'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'cdb4a97fc608d91468979069ffdc3ece0b5c6b18'
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Trip Detail (Story 1.3) is read-only display — opening a Trip Code/Link never becomes real membership, and there's no way to reach a Trip by typing a bare code instead of following a link.

**Approach:** Add a shared `trips.addMember(tripCode, displayName)` service function (AD-6, reusable by Epic 2's buddy-accept later) behind `POST /api/trips/:code/members`; gate Trip Detail on the local "My Trips" index (AD-13) so a browser that hasn't recorded this Trip sees a Traveler Profile prompt before the header, while a browser that already has (the creator, or a prior joiner) sees the header directly; and add a standalone "Have a code?" entry form for typing a bare Trip Code.

## Boundaries & Constraints

**Always:**
- `addMember(tripCode, displayName)` lives in `trips/service.ts`, pre-checks the Trip exists (`AppError('NOT_FOUND', ...)` if not, same idiom as `createTrip`'s `destinationId` check), creates one `TripMember` row (`nanoid()` id, no `(10)` — only Trip Codes use the longer form).
- The profile-prompt gate reads `hasTripInIndex(tripCode)` (new `myTripsIndex.ts` export) — presence of the key is what matters, not its value; the creator's `null` entry from Story 1.3 counts as "already recorded" and must not be re-prompted.
- Only a successful profile submission calls `addMember` and `addTripToIndex(tripCode, displayName)` — merely viewing a Trip (loading Trip Detail, or resolving a code on the "Have a code?" form) must never call either.
- The "Have a code?" form validates on submit only (no per-keystroke fetch); on an unresolvable code it shows an inline error tied to the field via `aria-describedby` and does **not** navigate away — "no redirect, no blank page" per `EXPERIENCE.md`.
- Reuse `EmptyState`, `useAnnounce`, the router, and `TripDetailPage`'s existing `useTrip`/loading/not-found handling exactly as they are; the profile prompt renders inside `TripDetailPage` at the same `/trip/:code` URL (no new route for it).

**Never:**
- No member-list UI on Trip Detail (who's joined) — not required by this story's acceptance criteria.
- No parsing of a pasted full Trip Link out of the bare-code field — the field expects the code itself.
- No itinerary/buddy/accommodation work (later stories).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Open `/trip/:code` never seen by this browser | Valid code, not in local index | Traveler Profile prompt renders instead of the header | N/A |
| Open `/trip/:code` already in this browser's index | Valid code (creator, or a prior joiner) | Header renders directly, no prompt | N/A |
| Submit a display name | Valid code + non-empty name | `201`; `TripMember` created; local index updated; header then renders | N/A |
| Merely view a Trip (no name submitted) | Any valid code | No `TripMember` created, index untouched | N/A |
| Resolve a bare code via "Have a code?" | Valid code typed | Navigates to `/trip/:code` | N/A |
| Resolve an unknown code via "Have a code?" | Invalid code typed | Stays on the form | Inline error under the field, `aria-describedby` |

</frozen-after-approval>

## Code Map

- `apps/api/src/features/trips/service.ts` -- add `addMember(tripCode, displayName): Promise<{ id, displayName, joinedAt }>` — pre-checks the Trip via `findUnique`, `prisma.tripMember.create`
- `apps/api/src/features/trips/routes.ts` -- add `POST /:code/members` (zod: `displayName` trimmed, min 1, max 100), `try/catch` → `next(error)`, matching the existing routes' idiom
- `apps/web/src/shared/myTripsIndex.ts` -- add `hasTripInIndex(tripCode: string): boolean` (key presence, ignores value)
- `apps/web/src/features/trip-detail/api.ts` -- add `joinTrip(code, displayName): Promise<{ id, displayName, joinedAt }>` (`POST /api/trips/:code/members`)
- `apps/web/src/features/trip-detail/useJoinTrip.ts` -- new: `useMutation` wrapping `joinTrip`
- `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- after a successful `useTrip` load, branch on `hasTripInIndex(code)`: render a Traveler Profile form (name field + submit) when absent; on submit success, call `addTripToIndex(code, name)` and flip local state to render the existing header immediately (no route change, no refetch needed)
- `apps/web/src/features/trip-detail/JoinTripPage.tsx` (+ `.css`) -- new: bare Trip Code entry field + submit; on submit calls `fetchTrip(code)` (existing `api.ts` export) via `useMutation`; success → `navigate('/trip/' + code)`; failure → inline field error, no navigation
- `apps/web/src/features/discover/DiscoverPage.tsx` -- add a "Have a code?" link next to "Start a Trip"
- `apps/web/src/App.tsx` -- route `/join` → `JoinTripPage`

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/features/trips/service.ts` -- `addMember` -- owning-slice member creation, reusable by Epic 2
- [x] `apps/api/src/features/trips/routes.ts` -- `POST /:code/members`
- [x] `apps/web/src/shared/myTripsIndex.ts` -- `hasTripInIndex()`
- [x] `apps/web/src/features/trip-detail/api.ts` + `useJoinTrip.ts` -- `joinTrip` + mutation hook
- [x] `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- Traveler Profile prompt gate
- [x] `apps/web/src/features/trip-detail/JoinTripPage.tsx` (+ `.css`) -- bare-code entry form
- [x] `apps/web/src/features/discover/DiscoverPage.tsx` -- "Have a code?" entry point
- [x] `apps/web/src/App.tsx` -- `/join` route
- [x] `apps/api/src/features/trips/routes.test.ts` -- coverage for the I/O matrix (join happy path, join against unknown code, missing/empty `displayName`)

**Acceptance Criteria:**
- Given the Trip Code entry field, when rendered, then it carries a persistent visible label (not placeholder-only) and validates only on submit
- Given a visitor opens a valid Trip Code/Link and hasn't set a Traveler Profile for it yet, then they're prompted for a display name before landing on Trip Detail
- Given a visitor submits a display name for a valid Trip, when it succeeds, then a `TripMember` row is created via `addMember` and the local My Trips index picks it up; a visitor who only views the Trip without submitting a name gets neither
- Given a visitor opens an invalid/expired Trip Code, then a clear inline error appears (never a blank/broken page)

## Implementation Notes

- `TripDetailPage` gained a `key={code}` at its call site in `App.tsx` — forces a full remount (resetting `hasProfile`/`copyLabel` state) if the pathname ever changes from one `/trip/:code` to a different one without an intervening screen, which the component's own `useState(() => hasTripInIndex(code))` initializer wouldn't otherwise re-run.
- `addMember` reuses the same "pre-check via `findUnique`, throw a clean `AppError`" idiom `createTrip` established for `destinationId` — consistent 404 behavior instead of a raw Prisma FK-constraint error.
- `TravelerProfilePrompt` is a private component inside `TripDetailPage.tsx` (not its own file) — it's only ever rendered from there, has no reuse target yet, and splitting it out would just add an import for no benefit.
- `JoinTripPage` reuses `fetchTrip`/`ApiError` from the existing `trip-detail/api.ts` rather than adding a second "resolve a code" endpoint — `GET /api/trips/:code` already is that resolution.
- Verified backend end-to-end via `curl` against the running dev server: create → join → duplicate-safe (a second `POST .../members` with a different name just adds a second row, which is correct — nothing in this story caps membership count) → unknown-code 404 → missing-`displayName` 400. `tsc`/`vite build` clean for the frontend; did not drive the UI in an actual browser this session (no browser-automation tool available) — the profile-prompt gate, the "Have a code?" form, and the skip-on-revisit behavior are unverified beyond code review and type/build checks.
- Post-review: `TravelerProfilePrompt` now passes the server's trimmed `displayName` (from the mutation's response) to `onJoined` instead of the raw local value, so the local "My Trips" index can't diverge from what's actually persisted. Both new forms guard `handleSubmit` against a second `mutate()` call while one is already in flight (e.g. a repeated Enter press before the button's `disabled` state re-renders). `addMember` trims `tripCode` before the `findUnique` lookup, matching the trimming already applied to `displayName`. Added a test for a whitespace-only `displayName` (the spec's own task item said "missing/empty," but only "missing" was actually covered).

## Spec Change Log

## Review Triage Log

*Code review of the diff since baseline, via blind-hunter, edge-case-hunter, and verification-gap layers, 2026-09-28.*

- **medium, patch** — `TravelerProfilePrompt` passed the raw, untrimmed local `displayName` to `onJoined` (used to write the local "My Trips" index), while the server independently trims it via zod — a name typed with leading/trailing whitespace would be stored differently locally than on the server, a foundational mismatch for a value Story 1.6 (My Trips) will read (Edge Case Hunter). Verified: `mutate(displayName, { onSuccess: () => onJoined(displayName) })` used the closure variable, not the response. Fixed: `onJoined(member.displayName)` uses the server's (trimmed) response value.
- **medium, patch** — Neither new form's `handleSubmit` checked `mutation.isPending` before calling `mutate()` — only the submit *button* was disabled while pending, so a repeated Enter keypress (or a click landing before the disabled-state re-render) could fire a second concurrent request (Blind Hunter). Verified: TanStack Query's `useMutation`, unlike `useQuery`, has no built-in in-flight dedup. Fixed: both `handleSubmit`s now early-return when `mutation.isPending`.
- **low, patch** — `addMember` looked up the Trip by `tripCode` without trimming it, unlike `displayName` (trimmed via zod) — an incidentally whitespace-padded code would fail lookup even for a real trip (Blind Hunter). Verified: no `.trim()` before `prisma.trip.findUnique`. Fixed: trims before both the lookup and the `tripId` written on create. (Not applied to `getTripByCode` from Story 1.3 — same untrimmed pattern there, but out of this diff's scope and not a regression this story introduced.)
- **low, patch** — The spec's own task checklist said test coverage included "missing/empty `displayName`," but only the fully-missing-field case was actually tested — an empty/whitespace-only string exercises a different zod branch (`.min(1)` vs. the field being absent) and was unverified (Edge Case Hunter's claims check). Fixed: added a whitespace-only `displayName` test case.
- **false** — Blind Hunter: an all-whitespace Trip Code typed into "Have a code?" trims to `''` client-side, producing a confusing generic error instead of the curated "doesn't match a trip" message. Verified via `curl`: `GET /api/trips/` (empty segment) returns `404 NOT_FOUND` same as a real unknown code, and `JoinTripPage`'s error branch keys only on `error.status === 404` (not the response body), so the curated copy shows either way.
- **defer** — Blind Hunter + Blind Hunter (duplicate submissions / no dedup on same displayName): neither `addMember` nor the route guards against two `TripMember` rows for what a user experiences as one "join" (a race past the new client-side pending-guard, e.g. a genuine double-click, or two people submitting the same name). No stable identity exists to dedupe against without accounts — same class of gap AD-14 already accepts by design for buddy requests ("client-side honor-system dedup... explicitly not solved via DB constraint"), and there is no member-list or member-count UI yet for duplicates to visibly corrupt. Revisit if/when a member-list surface is built.
- **low, reject (carried)** — Blind Hunter: no frontend test coverage for `JoinTripPage`/`useJoinTrip`/the `TravelerProfilePrompt`/`hasProfile` gating. Same pre-existing condition Stories 1.2 and 1.3's reviews already triaged and rejected (`apps/web` has no test runner configured project-wide).
- **low, reject (carried)** — Blind Hunter: error banners in both new forms can surface a raw `AppError` message (e.g. a zod validation string) instead of fully curated copy. Same pattern `CreateTripPage` already used unflagged in Story 1.3; in practice unreachable here since `TravelerProfilePrompt` only renders after `useTrip` already succeeded (no delete-Trip capability exists anywhere, so its own 404 branch can't fire) and client-side `required`/`maxLength` guards keep normal use from ever hitting zod's raw message.
- **low, reject** — Blind Hunter: both new components hardcode DOM ids instead of using `useId()` (used elsewhere in `JoinTripPage` for its error paragraph). Purely a consistency nit with no present failure mode — neither component is ever instantiated twice on the same page today.
- **low, reject** — Blind Hunter: `TripDetailPage`'s `onJoined` doesn't check whether the best-effort `localStorage` write in `addTripToIndex` actually succeeded before flipping `hasProfile`. Real only in private-browsing/quota-exceeded conditions, self-heals (the prompt just reappears on next load, and resubmitting works), and detecting the failure would require changing `myTripsIndex`'s API — not a trivial fix for a rare, non-blocking edge case.
- **false** — Blind Hunter: this story's own spec file isn't part of the reviewed diff. Expected — a story's spec file is committed alongside its code at the end of the workflow, not present mid-implementation; not a code defect.
- **defer** — Verification Gap: `TripDetailPage`'s `hasProfile` state (seeded per-mount from `hasTripInIndex`) has no test proving client-side navigation between two different `/trip/:code` routes correctly re-gates on the new code, rather than reusing stale state from the previous trip (the added `key={code}` is what makes this correct, but nothing pins it). No frontend test harness exists in this repo yet (no vitest/testing-library dependency) — standing one up is out of scope for this routing tweak; revisit when frontend test tooling is introduced.

### Independent code-review pass (2026-09-28, `/code-review` — blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor)

Run separately against this story's own commit diff (`cdb4a97..9ea9e4a`), per `sprint-status.yaml`'s documented process. Acceptance Auditor found no new AC/constraint violations — every frozen boundary (nanoid vs. nanoid(10), the index-presence gate, the side-effect boundary, validate-on-submit, aria-describedby, no new route) checked out. Verification Gap found no gaps — the new `addMember`/`POST /:code/members` behavior is fully covered by real tests.

- **low, patch** — `addMember`'s `NOT_FOUND` error still interpolated the *untrimmed* `tripCode` in its message even after trimming it for the lookup — the earlier "trim the code" fix was incomplete (Blind Hunter). Verified against the code. Fixed: uses `trimmedCode` in the thrown message too.
- **low, patch** — No test exercised the `tripCode.trim()` fix itself — only a whitespace-only `displayName` was tested, not a whitespace-*padded* (but otherwise valid) code (Blind Hunter). Fixed: added a test posting to a code wrapped in leading/trailing spaces, asserting `201`.
- **medium, patch** — `TravelerProfilePrompt`'s display-name `<input>` had no `aria-describedby`/`id` wiring to its error paragraph, unlike `JoinTripPage`'s field, which does associate its error this way (Blind Hunter). Real accessibility parity gap between the story's two new forms. Fixed: added `useId()`-based `aria-describedby`/`aria-invalid`, matching `JoinTripPage`'s existing pattern.
- **low, patch** — Neither new form rejected whitespace-only input before calling `mutate()` — HTML5 `required` treats a string of spaces as non-empty, so a spaces-only display name or Trip Code triggered a network round trip guaranteed to fail server-side (Blind Hunter). Fixed: both `handleSubmit`s now early-return on an empty-after-trim value.
- **medium, patch** — `addTripToIndex`'s "skip if the key already exists" guard could silently drop a legitimate join's server-confirmed display name if two tabs/windows resolved the same Trip Code concurrently — the second tab's successful join would be recorded server-side but never written locally, while its UI proceeded as if it had been (Edge Case Hunter). Fixed: the guard now only applies to the `null` (creation) case; a real `displayName` (a join) always writes through.
- **defer (filed)** — `addMember` has no dedup guard against two `TripMember` rows for one physical "join" — re-raised independently by this pass (also caught in story 1.4's own build-time review, where it was first deferred with the same AD-14 reasoning). A `(tripId, displayName)` uniqueness constraint was considered and rejected here too: `displayName` is freeform, not a stable identity, so it would incorrectly block two different people sharing a common name. Filed to `deferred-work.md` this time (it wasn't tracked anywhere durable before) so a second review pass doesn't need to re-discover it.
- **low, reject** — Blind Hunter: Implementation Notes disclose the UI was never driven in an actual browser this session, yet the Execution checklist marks the two new UI files' tasks `[x]`. The checkbox tracks "implemented per the task description," which is accurate; the browser-testing caveat is already explicitly disclosed in prose in the same section — not a hidden gap.
- **low, reject** — Blind Hunter: `.discover-page__have-code` has no explicit `:hover`/`:focus-visible` beyond base styling. The global `:focus-visible` rule in `a11y.css` already covers every element project-wide, and the adjacent `.discover-page__start-trip` it sits next to has no explicit `:hover` either — consistent with the existing sibling, not a deviation.
- **false** — Blind Hunter: `TripMemberSummary.joinedAt` is typed `Date` server-side while the client's `TripMember.joinedAt` is typed `string`, a "divergent same-shape interface." This is the same, already-established, correct pattern used throughout the codebase (e.g. `TripDetail`'s own dates) — a `Date` serializes to a JSON string over HTTP, and every client-side interface already reflects that; not a new inconsistency.

## Verification

**Commands:**
- `cd apps/api && npm test` -- expected: all tests pass, including new `trips/routes.test.ts` cases
- `cd apps/api && npx tsc --noEmit` -- expected: clean
- `cd apps/web && npm run lint` -- expected: clean
- `cd apps/web && npm run build` -- expected: succeeds

**Manual checks (if no CLI):**
- Create a Trip, then open its `/trip/:code` link in a fresh private/incognito window (empty local index) → Traveler Profile prompt appears; submit a name → header renders.
- Re-open the same link in the same window → header renders directly, no prompt.
- From Discover, click "Have a code?", type an unknown code → inline error appears, page doesn't navigate.
