---
title: 'Story 2.3: Accept or Decline a Buddy Request'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'ce74896'
context:
  - _bmad-output/implementation-artifacts/epic-2-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Stories 2.1/2.2 let a Trip open itself to buddies and let outsiders submit requests, but nothing lets a Trip member actually accept or decline one — pending requests exist in the database with no way to act on them.

**Approach:** Add a Trip-scoped read (`GET /api/trips/:code/buddy-requests`) and two mutations (`POST .../accept`, `POST .../decline`), implemented in the `buddies` slice (it owns `TravelBuddyRequest`) but routed under `trips` (the Trip Code is the authorization, matching every other Trip-scoped endpoint) — `trips/routes.ts` calling `buddies/service.ts` directly avoids a circular import between the two slices' service modules. A Trip Detail section renders the pending list with Accept/Decline, and Story 2.2's "declined" status view gets a way back into the request form instead of the dead end it was deliberately left with.

## Boundaries & Constraints

**Always:**
- `trips/routes.ts` imports from `buddies/service.ts` directly (not through `trips/service.ts`) — `buddies/service.ts` already imports from `trips/service.ts` for its reads/writes, so routing the dependency through `trips/service.ts` too would create a cycle between the two modules.
- Accept calls the exact same `trips.addMember(tripCode, displayName)` function Story 1.4 uses (AD-6) — never a second, parallel `TripMember`-creation path — using the request's `requesterName` as the display name, then marks the request `"accepted"`.
- Decline only updates the request's `status` to `"declined"` — never deletes the row (Story 2.2's requester-facing status check depends on the row surviving so `GET /api/buddies/requests/:requestId` can report it).
- Both actions require the request to currently be `"pending"` and to belong to the Trip Code in the path — anything else is `409 CONFLICT` (already handled) or `404 NOT_FOUND` (wrong Trip/unknown request), never a silent no-op.
- The pending list updates in place on accept/decline, announced via the existing polite live region — not communicated by a visual disappearance alone.
- Story 2.2's "This request was declined" view gets a "Request again" action that clears that listing's local dedup entry and returns to the request form — closing the dead end explicitly deferred from that story's review.

**Never:**
- No email/push notification to the requester — still "check back later," unchanged from Story 2.2.
- No bulk accept/decline, no undo — one request, one action, matching this product's "no version/lock, last action wins" posture elsewhere.
- No change to `submitBuddyRequest`'s or the browse listing's response shapes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| List pending requests | Trip has ≥1 pending request | `200` array, ordered oldest-first | N/A |
| List with none pending | No pending requests | `200 []` | N/A |
| Accept a pending request | Valid Trip Code + pending `requestId` | `201`; a `TripMember` exists with the requester's name; request becomes `"accepted"` | N/A |
| Decline a pending request | Valid Trip Code + pending `requestId` | `200`; no `TripMember` created; request becomes `"declined"` | N/A |
| Accept/decline an already-handled request | `requestId` with `status !== "pending"` | `409 CONFLICT` | No member created, no status change |
| Accept/decline against the wrong Trip Code | `requestId` exists but belongs to a different Trip | `404 NOT_FOUND` | No member created, no status change |
| Accept/decline an unknown Trip Code or `requestId` | Either doesn't exist | `404 NOT_FOUND` | Same shared error envelope |

</frozen-after-approval>

## Code Map

- `apps/api/src/features/buddies/service.ts` -- add `listPendingRequestsForTrip(tripCode)` (`travelBuddyRequest.findMany({where:{tripId, status:'pending'}, orderBy:{createdAt:'asc'}})`, own table, no cross-slice call), `acceptBuddyRequest(tripCode, requestId)` (validates request belongs to `tripCode` and is `'pending'`, calls `trips.addMember(tripCode, request.requesterName)`, then sets `status: 'accepted'`), `declineBuddyRequest(tripCode, requestId)` (same validation, sets `status: 'declined'`)
- `apps/api/src/features/trips/routes.ts` -- add `GET /:code/buddy-requests`, `POST /:code/buddy-requests/:requestId/accept`, `POST /:code/buddy-requests/:requestId/decline` — each validates the Trip Code exists (`getTripByCode`) before delegating to the `buddies` functions above
- `apps/web/src/features/trip-detail/api.ts` -- add `fetchPendingBuddyRequests(code)`, `acceptBuddyRequest(code, requestId)`, `declineBuddyRequest(code, requestId)`
- `apps/web/src/features/trip-detail/usePendingBuddyRequests.ts` -- new: `useQuery(['trip', code, 'buddy-requests'], ...)` + accept/decline `useMutation`s that remove the handled request from the local cache and `announce()` the result
- `apps/web/src/features/trip-detail/PendingBuddyRequests.tsx` (+ `.css`) -- new: renders each pending request as a row (requester name + message + Accept/Decline buttons); nothing rendered when the list is empty
- `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- mount `PendingBuddyRequests` below `BuddyToggle`
- `apps/web/src/shared/buddyRequestIndex.ts` -- add `clearBuddyRequestId(buddyListingId)`
- `apps/web/src/features/buddies/BuddyRequestPage.tsx` -- declined view gets a "Request again" action wired to `clearBuddyRequestId` + resetting local state back to the form

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/features/buddies/service.ts` -- `listPendingRequestsForTrip`/`acceptBuddyRequest`/`declineBuddyRequest`
- [x] `apps/api/src/features/trips/routes.ts` -- 3 routes
- [x] `apps/web/src/features/trip-detail/api.ts` -- fetch/accept/decline functions
- [x] `apps/web/src/features/trip-detail/usePendingBuddyRequests.ts` -- query + mutations
- [x] `apps/web/src/features/trip-detail/PendingBuddyRequests.tsx` (+ `.css`)
- [x] `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- mount it
- [x] `apps/web/src/shared/buddyRequestIndex.ts` -- `clearBuddyRequestId`
- [x] `apps/web/src/features/buddies/BuddyRequestPage.tsx` -- "Request again" on decline
- [x] `apps/api/src/features/trips/routes.test.ts` (or a new buddy-requests-focused file) -- coverage for the I/O matrix

**Acceptance Criteria:**
- Given a pending Travel Buddy Request, when any Trip member clicks Accept, then the requester is added as a full Trip member via the shared `addMember` function, with identical edit rights to everyone else
- Given a pending request, when a member clicks Decline instead, then the request is removed from the pending list without granting any access, and no `TripMember` row is created
- Given the accept action updates the pending-requests list in place, then the change is announced via a polite live region, not communicated by a visual disappearance alone

## Implementation Notes

- The circular-import concern in the spec's Always constraints was real and confirmed by design, not just theory: `buddies/service.ts` already imports from `trips/service.ts` (Story 2.2); having `trips/service.ts` import back from `buddies/service.ts` for the pending-requests read would create a module cycle. Resolved by having `trips/routes.ts` (not `trips/service.ts`) import `buddies/service.ts` directly — still fully AD-1-compliant (cross-slice access goes through the owner's exported function; nothing about *which file* in the consumer calls it), just at the routes layer instead of the service layer.
- Verified end-to-end via `curl` against the running dev server: open a Trip → submit a request → `GET` the pending list → accept → pending list empties, a real `TripMember` exists, and the requester's own `GET /api/buddies/requests/:requestId` now reports `status: "accepted"` with the real `tripCode` — exactly the hand-off Story 2.2 was built to eventually support. Did not drive the UI in an actual browser this session (no browser-automation tool available) — `PendingBuddyRequests`' rendering/live-region announcements and the "Request again" button are unverified beyond code review and type/build checks.
- Post-review: `acceptBuddyRequest`/`declineBuddyRequest` no longer do a read-then-write status check (which three independent review passes confirmed was racy — two concurrent accepts, or a concurrent accept and decline, could both pass a "is it pending?" read before either wrote). Replaced with `claimRequest`, an atomic `updateMany({ where: { ..., status: 'pending' } })` — of any number of concurrent callers, exactly one can ever see `count === 1`; the rest get `409 CONFLICT`. The status claim now happens *before* `addMember` runs (not after), with a rollback to `"pending"` if `addMember` itself then fails, so a request can never end up falsely `"accepted"` with no member.

## Spec Change Log

## Review Triage Log

*Code review of the diff since baseline, via blind-hunter, edge-case-hunter, and verification-gap layers, 2026-09-28.*

- **high, patch** — All three review layers independently caught the same correctness bug: `acceptBuddyRequest`/`declineBuddyRequest` checked `status === 'pending'` in a separate read before writing the new status, so two concurrent accept calls (or a concurrent accept and decline) for the same request could both pass the check before either wrote — producing two `TripMember` rows for one request, or a request that ends up both a member *and* declined depending on write order. Edge Case Hunter additionally flagged that a client-side rapid double-click (before React's `disabled` re-render commits) could trigger this race from a single well-intentioned user, not just a hypothetical adversary. Verified by tracing the original read-then-write sequence. Fixed: replaced with `claimRequest`, an atomic `updateMany({ where: { id, tripId, status: 'pending' } })` — the check and the write happen in one SQLite statement, so only one of any number of concurrent callers can ever succeed; the rest get `409 CONFLICT`. For accept specifically, the claim now happens *before* `addMember` runs, with a rollback to `"pending"` if `addMember` itself fails, so a request can't end up falsely `"accepted"` with no member. Added a test that fires two concurrent accepts at the same request and asserts exactly one `201`/one `409`, with only one `TripMember` row created.
- **medium, patch** — `PendingBuddyRequests` rendered `null` for both "still loading" and "nothing pending," and never surfaced the query's `isError` state — a fetch failure looked identical to "no requests," giving the Trip owner no signal anything was wrong (Blind Hunter + Edge Case Hunter, same finding). Fixed: loading now renders nothing (unchanged, matches the "no empty chrome for the common case" intent) but is now a distinct branch from the error state, which shows an inline "Couldn't load buddy requests." message.
- **low, patch** — Every row's Accept/Decline buttons had identical, non-differentiated text, so a screen-reader user tabbing through a multi-request list had no way to tell which button belonged to which requester (Blind Hunter). Fixed: added `aria-label="Accept/Decline request from {name}"` to each.
- **low, patch** — No test covered the decline route's cross-trip 404 case — only accept's was tested (Blind Hunter). Fixed: added the symmetric test, plus an assertion that the mismatched-trip attempt left the original request untouched.
- **low, patch** — Both POST routes called `getTripByCode` purely to 404 on an unknown Trip Code, but `acceptBuddyRequest`/`declineBuddyRequest`'s own `tripId !== tripCode` check already produces the identical 404 for that case — a redundant query on every accept/decline call (Blind Hunter). Fixed: removed from the two POST routes; kept on the `GET` route, where it's still load-bearing (without it, an unknown Trip Code would return `200 []` instead of `404`, since an empty pending-list query for a nonexistent trip isn't itself an error).
- **low, reject (carried)** — Blind Hunter: no frontend test coverage for the new hooks/components. Same pre-existing, project-wide condition already carried since Story 1.2; Verification Gap independently confirmed no web test infrastructure exists anywhere in the repo to weaken.
- **low, reject** — Blind Hunter: the test helper `submitRequestToTrip` resolves a Trip's `buddyListingId` by matching on trip name, which would silently pick the wrong listing if two trips ever shared a name. Real, but the same pattern was already used and accepted in Story 2.2's own test suite, and there's no alternative lookup available by design — exposing a direct tripId→buddyListingId endpoint would undermine the whole point of `buddyListingId` being a one-way, request-routing-only identifier.

## Verification

**Commands:**
- `cd apps/api && npm test` -- expected: all tests pass, including the new buddy-requests coverage
- `cd apps/api && npx tsc --noEmit` -- expected: clean
- `cd apps/web && npm run lint` -- expected: clean
- `cd apps/web && npm run build` -- expected: succeeds

**Manual checks (if no CLI):**
- Submit a buddy request (Story 2.2 flow), then on the Trip's own Detail page (with the real code) see it in a pending list; click Accept → it disappears from pending, and the requester's own status-check page now shows "You're in!" with a working link to the Trip.
- Submit another request, click Decline → the requester's status-check page shows "This request was declined" with a "Request again" action that returns them to the form.
