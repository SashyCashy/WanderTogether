---
title: 'Story 4.2: Attach an Accommodation Listing to a Trip'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '51e4f5d52a31d7ff460833e4d26488d383f63a4b'
context:
  - _bmad-output/implementation-artifacts/epic-4-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Story 4.1's Accommodations panel lists listings but rows are inert — nothing lets a Trip member actually settle on one, so `Trip.attachedAccommodationId` (in the schema since Story 1.1) is never written.

**Approach:** Reuse the existing `PATCH /api/trips/:code` partial-merge endpoint (AD-8, already built for Story 2.1's `openToBuddies`/`buddyNote`) by extending its patch shape with `attachedAccommodationId`, and make the Accommodations panel's rows clickable to attach — with a one-line replace-confirm when a different listing is already attached.

## Boundaries & Constraints

**Always:**
- Attaching updates `Trip.attachedAccommodationId` via the existing PATCH-partial-merge path (AD-8) — never a full-Trip overwrite that could clobber the itinerary or `openToBuddies`/`buddyNote`.
- Attaching never makes a payment, reservation, or external booking-system call (FR13) — it is a pure data attachment (one `prisma.trip.update` call).
- `attachedAccommodationId` is validated against the real `AccommodationListing` catalog when non-null, the same idiom `destinationId` validation already uses in `createTrip`.
- When a Trip already has an accommodation attached and a member selects a different listing, a one-line confirm ("Replace {current} with {new}?") appears before swapping (UX-DR31) — never a silent multi-attach. Selecting the already-attached listing again is a no-op (no confirm, no request).
- The currently-attached listing is visibly distinguished in the panel (e.g. an "Attached" marker) so the group can tell at a glance what's decided.

**Never:**
- No detaching/clearing the accommodation in this story (no "remove" affordance) — only attach and replace.
- No confirm dialog when nothing is attached yet — the first attach is immediate, no confirmation needed.
- No native `window.confirm`/`alert` — every other confirmation-style UI in this app is an inline, in-page element (e.g. Write-ups' publish confirmation), not a browser dialog.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Attach the first listing | `PATCH /:code` with `{ attachedAccommodationId: <valid id> }`, nothing attached yet | `200`; Trip's `attachedAccommodationId` set, `attachedAccommodation` populated in the response | N/A |
| Replace an already-attached listing | Valid `attachedAccommodationId`, different from the current one | `200`; updates to the new id | N/A |
| Attach an unknown accommodation id | `attachedAccommodationId` doesn't match any seeded listing | `400 VALIDATION_ERROR` | Trip's attachment is left unchanged |
| Re-select the already-attached listing | `attachedAccommodationId` equals the current value | Client sends no request (no-op) — never round-trips just to no-op the same value | N/A |
| `openToBuddies`/`buddyNote` PATCH alongside an unrelated `attachedAccommodationId` edit | Two independent PATCH calls, each with one field | Each succeeds independently — neither clobbers the other's field (AD-8) | N/A |

</frozen-after-approval>

## Code Map

- `apps/api/src/features/trips/service.ts` -- `TripSettingsPatch` gains `attachedAccommodationId?: string | null`; `TRIP_SELECT` gains `attachedAccommodationId: true` and `attachedAccommodation: { select: { id, name, type, pricePerNightUSD, rating, photoUrl } }`; `TripDetail` interface gains both fields; `updateTripSettings` validates a non-null `attachedAccommodationId` via `prisma.accommodationListing.findUnique` before the `prisma.trip.update` call (same idiom `createTrip`'s `destinationId` check already uses), throwing `AppError('VALIDATION_ERROR', ...)` on no match
- `apps/api/src/features/trips/routes.ts` -- `updateTripSettingsSchema` gains `attachedAccommodationId: z.string().trim().min(1).nullable().optional()`; the existing `.refine` (`Object.keys(patch).length > 0`) already covers this new field with no change needed
- `apps/web/src/features/trip-detail/api.ts` -- `TripDetail` gains `attachedAccommodationId: string | null` and `attachedAccommodation: { id, name, type, pricePerNightUSD, rating, photoUrl } | null`; `TripSettingsPatch` gains `attachedAccommodationId?: string | null`
- `apps/web/src/features/accommodations/AccommodationsPanel.tsx` -- gains `tripCode: string`, `attachedAccommodationId: string | null`, `attachedAccommodationName: string | null` props; a dedicated `useUpdateTripSettings(tripCode)` instance (separate from `BuddyToggle`'s two instances — same "don't couple independent controls' `isPending`" reasoning spec-2-1 already established); row `onClick`: same id → no-op; nothing attached yet → `mutation.mutate({ attachedAccommodationId: listing.id })` directly; a different id already attached → set local `pendingReplacement` state, render an inline one-line confirm ("Replace {attachedAccommodationName} with {listing.name}?") with Confirm/Cancel buttons, Confirm calls the same mutate; the attached row shows an "Attached" marker in its `metadata`
- `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- passes `tripCode={trip.id}`, `attachedAccommodationId={trip.attachedAccommodationId}`, `attachedAccommodationName={trip.attachedAccommodation?.name ?? null}` to `<AccommodationsPanel>`

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/features/trips/service.ts` -- extend `TripSettingsPatch`/`TRIP_SELECT`/`TripDetail`, validate `attachedAccommodationId` in `updateTripSettings`
- [x] `apps/api/src/features/trips/routes.ts` -- extend `updateTripSettingsSchema`
- [x] `apps/web/src/features/trip-detail/api.ts` -- extend `TripDetail`/`TripSettingsPatch`
- [x] `apps/web/src/features/accommodations/AccommodationsPanel.tsx` (+ `.css`) -- clickable rows, replace-confirm, "Attached" marker
- [x] `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- pass the new props
- [x] `apps/api/src/features/trips/routes.test.ts` -- coverage for the I/O matrix (extends the existing file)

**Acceptance Criteria:**
- Given a Trip member selects a listing, when they attach it, then `Trip.attachedAccommodationId` updates via the PATCH-partial-merge path — never a full-Trip overwrite
- Given attaching a listing, when the request completes, then no payment, reservation, or external booking-system call is ever made
- Given a Trip already has an accommodation attached, when a member selects a different listing, then a one-line confirm appears before swapping — never a silent multi-attach

## Implementation Notes

## Spec Change Log

## Review Triage Log

The standard four-layer parallel review (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor) all failed on launch — the account hit its session rate limit ("You've hit your session limit · resets 11:50pm (Asia/Calcutta)", HTTP 429) before any of the four could produce findings. Since that's a fixed-time account-level cap rather than a transient error, retrying immediately would only fail again. Rather than leave the story unreviewed, I read the full diff myself and applied the same adversarial standard those four layers use (missing-behavior hunting, edge-case tracing, verification-gap analysis, spec-conformance audit) in a single manual pass.

**Patched:**
- **Replace-confirm prompt's appearance wasn't announced to screen readers.** `pendingReplacement` becoming non-null renders a new interactive confirm banner, but nothing called `announce()` — a same-page update with no navigation, which EXPERIENCE.md's Accessibility Floor requires announced the same as every other same-page update in this app (the buddy toggle, pending buddy requests, etc. all do this). Fixed: added a `useEffect` that announces "Replace {current} with {new}?" when the banner appears.
- **`role="alertdialog"` on the confirm banner was a misuse.** That role implies modal, focus-trapping semantics; this in-page banner traps no focus and moves no focus into itself — no surface in this app uses a true modal. Fixed: changed to `role="group"`, which accurately describes a labeled group of controls without claiming dialog semantics the implementation doesn't provide.
- **Missing test: `attachedAccommodationId: null` to clear an attachment.** The PATCH schema explicitly allows `null` (the field is nullable in the schema and the spec's own Boundaries only forbid a UI *affordance* for detaching, not the API accepting it), but nothing exercised this path. Fixed: added a test that attaches then clears, asserting both `attachedAccommodationId` and `attachedAccommodation` come back `null`.

**Considered and not changed:**
- A JSX-comment-syntax slip introduced while writing the `role="alertdialog"` fix above broke the TypeScript build (`{/* ... */}` placed inside a parenthesized ternary expression, not a JSX children position) — caught immediately by `npx tsc --noEmit` and corrected to a plain `//` comment before landing; not a review finding, just self-caught during the fix.
- Considered whether rapid double-clicks across two different listing rows could race past the `mutation.isPending` guard before React re-renders. Concluded this isn't a practical race (unlike Story 2.3's genuine concurrent-HTTP-request race): two row clicks are two separate browser click events in two separate event-loop turns, and React flushes the `isPending` state update between them — there's no single synchronous window where both checks read the stale value. No fix needed.
- No frontend unit tests added for `AccommodationsPanel`'s new attach/replace/confirm logic — matches the same repo-wide "zero frontend unit tests exist anywhere" precedent already established and confirmed in Stories 3.2/4.1's reviews.

## Verification

**Commands:**
- `cd apps/api && npm test` -- expected: all tests pass, including the extended `trips/routes.test.ts`
- `cd apps/api && npx tsc --noEmit` -- expected: clean
- `cd apps/web && npm run lint` -- expected: clean
- `cd apps/web && npm run build` -- expected: succeeds

**Manual checks (if no CLI):**
- Open a Lisbon Trip with nothing attached, click a listing, confirm it attaches immediately (no confirm dialog) and shows "Attached".
- Click a different listing and confirm the one-line "Replace {current} with {new}?" prompt appears; confirming swaps the attachment, canceling leaves it unchanged.
- Click the already-attached listing again and confirm nothing happens (no request, no confirm).
