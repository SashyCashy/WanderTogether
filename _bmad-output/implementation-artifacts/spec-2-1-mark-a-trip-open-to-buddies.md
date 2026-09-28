---
title: 'Story 2.1: Mark a Trip Open to Buddies'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '6064d81a529ee4e0ab5fe2f8bd51a3ee1acde3e6'
context:
  - _bmad-output/implementation-artifacts/epic-2-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `Trip.openToBuddies`/`buddyNote` have existed in the schema since Story 1.1 but nothing reads or writes them — a Trip can't yet be opened up to outside travelers.

**Approach:** Add `PATCH /api/trips/:code` (AD-8: partial-merge, only the fields present in the body change — never a full-Trip overwrite, which would risk the itinerary) and a real switch control on Trip Detail that reveals a note field on toggle-on; the toggle and the note save independently.

## Boundaries & Constraints

**Always:**
- `PATCH /api/trips/:code` accepts `{ openToBuddies?: boolean; buddyNote?: string | null }` — partial merge, only present fields change; requires at least one field.
- `TripDetail`'s response (`GET`/`POST /api/trips`) now includes `openToBuddies`/`buddyNote`.
- The toggle is a real switch: `role="switch"`, `aria-checked`, a programmatically associated label, minimum 24×24px hit area regardless of the visible track's size (reuse `.hit-area-min` from `a11y.css`).
- The note field's reveal-on-toggle-on is announced via the existing polite live region (`useAnnounce`).
- Switching off removes the Trip from the (not-yet-built) Buddies browse listing in effect — Story 2.2 reads `openToBuddies`, so this story just needs the flag to end up correctly `false`; no pending `TravelBuddyRequest` row is touched by this story (none can exist yet — Story 2.2/2.3 build that path).
- The toggle and the note save independently (two separate `PATCH` calls, each a partial merge) — toggling on/off never depends on the note field's save state or vice versa.

**Never:**
- No Buddies browse surface, no request form, no pending-requests list — Stories 2.2/2.3.
- No clearing of `buddyNote` when the toggle switches off — the note persists so it reappears if re-enabled; nothing in the AC asks for it to be cleared.
- No full-Trip overwrite semantics for this endpoint — that's the itinerary's endpoint (Story 1.5), a deliberately different rule for a deliberately different field.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Toggle on | `{ openToBuddies: true }` | `200`; Trip's `openToBuddies` becomes `true`; `buddyNote` unchanged | N/A |
| Toggle off | `{ openToBuddies: false }` | `200`; `openToBuddies` becomes `false`; `buddyNote` unchanged (not cleared) | N/A |
| Save a note | `{ buddyNote: "2 spots, chill about hostels" }` | `200`; `buddyNote` updates; `openToBuddies` unchanged | N/A |
| Empty body | `{}` | `400 VALIDATION_ERROR` | No update — at least one field is required |
| `PATCH` against an unknown Trip Code | Invalid code | `404 NOT_FOUND` | Same shared error envelope every other Trip endpoint uses |

</frozen-after-approval>

## Code Map

- `apps/api/src/features/trips/service.ts` -- add `openToBuddies`/`buddyNote` to `TRIP_SELECT`/`TripDetail`; add `updateTripSettings(tripCode, patch: { openToBuddies?, buddyNote? }): Promise<TripDetail>` — same `findUnique`/`AppError('NOT_FOUND', ...)` pre-check idiom, `prisma.trip.update({ data: patch })` (Prisma's own update already does partial-merge — only keys present in `patch` are set)
- `apps/api/src/features/trips/routes.ts` -- add `PATCH /:code` (zod: both fields optional, `.refine()` requires at least one present)
- `apps/web/src/features/trip-detail/api.ts` -- extend `TripDetail` with `openToBuddies`/`buddyNote`; add `updateTripSettings(code, patch): Promise<TripDetail>`
- `apps/web/src/features/trip-detail/useUpdateTripSettings.ts` -- new: `useMutation` wrapping `updateTripSettings`; `onSuccess` merges the response into the `['trip', code]` cache
- `apps/web/src/features/trip-detail/BuddyToggle.tsx` (+ `.css`) -- new: the switch (`role="switch"`, `aria-checked`) + label + reveal-on note `<textarea>` that saves on blur; announces the reveal via `useAnnounce`
- `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- render `<BuddyToggle tripCode={code} openToBuddies={trip.openToBuddies} buddyNote={trip.buddyNote} />` below `ItinerarySection`

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/features/trips/service.ts` -- `openToBuddies`/`buddyNote` fields; `updateTripSettings`
- [x] `apps/api/src/features/trips/routes.ts` -- `PATCH /:code`
- [x] `apps/web/src/features/trip-detail/api.ts` -- fields + `updateTripSettings`
- [x] `apps/web/src/features/trip-detail/useUpdateTripSettings.ts` -- mutation + cache merge
- [x] `apps/web/src/features/trip-detail/BuddyToggle.tsx` (+ `.css`) -- switch + note field
- [x] `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- mount `BuddyToggle`
- [x] `apps/api/src/features/trips/routes.test.ts` -- coverage for the I/O matrix (toggle on/off, save a note, empty-body rejection, unknown code)

**Acceptance Criteria:**
- Given a Trip member viewing Trip detail, when they switch on "Open to buddies," then a short note field appears and the Trip's `openToBuddies` becomes `true`
- Given the toggle is a real switch, when rendered, then it exposes `role="switch"`/`aria-checked` and a programmatically associated label, and the note-field reveal is announced via a polite live region
- Given a member switches the toggle off, then the Trip's `openToBuddies` becomes `false` and `buddyNote` is left untouched, not cleared

## Implementation Notes

- `updateTripSettings` relies on Prisma's `update({ data: patch })` already only setting keys present in `patch` — no explicit merge logic needed, unlike `updateItinerary`'s full-array replace.
- `BuddyToggle`'s note `<textarea>` uses its own local `noteValue` draft (saved on blur, compared against the last-known prop value to skip a no-op `PATCH`), re-synced from the `buddyNote` prop whenever it changes *except* while the field is actively focused — unlike `ItinerarySection`'s equivalent field, this one does need to reflect another member's edit landing via a background refetch, since a Trip is explicitly a shared, multi-member surface.
- Verified end-to-end via `curl` against the running `apps/api` dev server: toggle on → save a note → toggle off, confirming the note survives the toggle-off (not cleared). Did not drive the UI in an actual browser this session (no browser-automation tool available) — the switch's visual state, the note-field reveal/hide, and its live-region announcement are unverified beyond code review and type/build checks.

## Spec Change Log

## Review Triage Log

*Code review of the diff since baseline, via blind-hunter, edge-case-hunter, and verification-gap layers, 2026-09-28.*

- **medium, patch** — Edge Case Hunter's claims check: the spec's own Always constraint says "the toggle and the note save independently ... never depends on the note field's save state or vice versa," but both `handleToggle` and `commitNote` shared one `useUpdateTripSettings` instance, so `mutation.isPending` (used to disable the switch) went `true` while a note save was in flight, coupling the switch's availability to the note's save state — a direct, verified violation of the frozen spec's own claim. Fixed: `BuddyToggle` now uses two separate mutation instances, one per action, so their pending states are independent.
- **medium, patch** — Neither `handleToggle` nor `commitNote` had an `onError` handler; the switch's/note field's visible state is driven purely by props/local draft, so a failed `PATCH` (network error, etc.) left both silently appearing to do nothing, with no feedback (Blind Hunter + Edge Case Hunter, same finding). Fixed: both now announce "Didn't save. Try again." on failure, matching every other mutation in this feature slice.
- **medium, patch** — `noteValue` was seeded once from the `buddyNote` prop via `useState` and never re-synced — a real gap given this Trip is explicitly a shared, multi-member surface (not a hypothetical edge case, per the project's own core premise): another member's note edit landing via a background refetch would leave this member's textarea silently showing a stale value (Blind Hunter + Edge Case Hunter; Verification Gap noted the same code path but scoped its own formal-gap criteria more narrowly and didn't file it as a gap). Fixed: a `useEffect` re-syncs `noteValue` from the prop whenever it changes, skipped only while the field is actively focused (so it can't clobber an in-progress, unsaved edit).
- **low, patch** — The zod schema trimmed `buddyNote` but never normalized an empty/whitespace-only result to `null`, while the client's `commitNote` already did — a direct API caller could persist `""` as a distinct "cleared note" representation from `null` (Blind Hunter + Edge Case Hunter, same finding). Fixed: the schema's `.transform()` normalizes an empty string to `null` server-side too; added a test.
- **low, patch** — The note `<textarea>` used a hardcoded `id="buddy-note"` instead of `useId()`, inconsistent with `labelId` in the same component, and would collide if the component were ever rendered twice (Blind Hunter). Fixed: uses a second `useId()`-generated id.
- **low, patch** — No test covered sending both fields in one `PATCH` (only sequential single-field cases were tested), and no test exercised the `buddyNote` 280-char boundary (Blind Hunter, two findings). Fixed: added both.
- **false** — Blind Hunter + Edge Case Hunter: `updateTripSettings`'s separate `findUnique`-then-`update` is a TOCTOU gap (a delete between the two calls would surface a Prisma `P2025` as a 500 instead of the documented 404). Unreachable: no delete-Trip capability exists anywhere in the product (already established repeatedly across this codebase's other endpoints, which share this exact same idiom).
- **false** — Blind Hunter: `PATCH /api/trips/:code` has no authorization/ownership check. This is the app's deliberate, already-established, project-wide access model (Trip Code possession is the sole access control, identical rights for every holder) — not a deviation this endpoint introduces, and consistent with every other Trip-mutating endpoint.
- **low, reject** — Blind Hunter: no visible character counter for the 280-char note cap. A soft nicety with no AC requirement; the itinerary's own 200-char title cap has the same lack of a counter, unflagged.
- **false** — Blind Hunter: blur-only save (no autosave/unload guard) risks losing an unsaved note on navigate-away. Directly contradicted by `conventions.md`'s explicit, already-established rule: "Forms save on blur/submit, not on navigate-away — never build a flow that depends on warning someone before they leave." This is the intended pattern, not a gap.

## Verification

**Commands:**
- `cd apps/api && npm test` -- expected: all tests pass, including the new coverage
- `cd apps/api && npx tsc --noEmit` -- expected: clean
- `cd apps/web && npm run lint` -- expected: clean
- `cd apps/web && npm run build` -- expected: succeeds

**Manual checks (if no CLI):**
- On Trip Detail, toggle "Open to buddies" on → a note field appears; type a note, blur → persists on reload.
- Toggle off → note field hides, but toggling back on shows the same note still there.
