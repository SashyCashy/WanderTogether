---
title: 'Story 1.5: Edit the Shared Itinerary'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '08dccb7784eda67e2f86d2eacc5a6cc20c67b09b'
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Trip Detail (Stories 1.3/1.4) shows a Trip's header and gates on a Traveler Profile, but the itinerary — the actual shared plan — isn't visible or editable anywhere yet.

**Approach:** Add `PUT /api/trips/:code/itinerary` (AD-8: full-resource overwrite, no version/lock check — the one Trip-level write that isn't PATCH-partial-merge) and an Itinerary section on Trip Detail: each line's title is click-to-edit inline text saving on blur/Enter, a "+ Add a line" control appends a new line (day auto-labeled, title focused for typing), and a hover/keyboard-revealed "Remove" removes a line immediately.

## Boundaries & Constraints

**Always:**
- `GET`/`POST /api/trips` responses (`TripDetail`) now include `itineraryItems: { id, day, title, note }[]`, ordered by insertion (add-order — no reordering, per `EXPERIENCE.md`'s "no drag-to-reorder in v1").
- `PUT /api/trips/:code/itinerary` replaces the *entire* itinerary in one write: `deleteMany` + recreate, inside one `$transaction` — never a per-line PATCH/PUT endpoint (AD-8's explicit exception to the PATCH-partial-merge rule every other Trip field uses).
- Any Trip-Code holder can write the itinerary — no membership/ownership check (FR-6: identical edit rights for everyone, matching every other Trip endpoint's existing lack of auth).
- Order preservation across a full overwrite without a schema change: each recreated item's `createdAt` is stamped `baseTime + index` milliseconds (not left to SQLite's second-resolution default), so `orderBy: { createdAt: 'asc' }` stays a stable, correct sort.
- A line's title is the inline-editable "line" `EXPERIENCE.md`/`epic-1-context.md` describe; saves on blur or Enter (Enter blurs the field, the blur handler owns the save). A still-empty newly-added line is discarded locally on blur — never persisted.
- "Remove" is hover-revealed on pointer devices and identically visible on keyboard focus (`EXPERIENCE.md`'s Interaction Primitives) — never hover-only.

**Never:**
- No per-line optimistic lock, version field, or conflict UI — last write wins silently (PRD FR-5 `[ASSUMPTION]`), matching the Concurrent-itinerary-edit state pattern already documented in `EXPERIENCE.md`.
- No drag-to-reorder, no day-field editing after a line is created (remove + re-add is the path to change a day), no `note` field surfaced in this story's UI — the schema already has `note`, but no AC requires editing it here, so the compact single-line row stays scope-minimal. The API still accepts an optional `note` so a later story can add UI for it without another schema/API change.
- No real-time co-editing indicators.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Save a new itinerary from empty | `[]` → `[{day,title}]` | `200` with the new array; order matches submission order | N/A |
| Overwrite an existing itinerary | Full replacement array (add/edit/remove all folded into one array) | `200`; old rows gone, new rows present, order preserved | N/A |
| `PUT` against an unknown Trip Code | Invalid code | `404 NOT_FOUND` | Same shared error envelope every other Trip endpoint uses |
| A line with an empty `title` | `{day: "Day 1", title: ""}` in the array | `400 VALIDATION_ERROR` | No partial write — the whole overwrite is rejected, not just the bad line |
| Two members edit at nearly the same time | Sequential `PUT`s from different browsers | Second write wins; no error, no merge | Matches EXPERIENCE.md's documented "last save wins silently" |

</frozen-after-approval>

## Code Map

- `apps/api/src/features/trips/service.ts` -- extend `TRIP_SELECT`/`TripDetail` with `itineraryItems` (ordered `createdAt asc`); add `updateItinerary(tripCode, items): Promise<ItineraryItemSummary[]>` — pre-checks the Trip (same `findUnique`/`AppError('NOT_FOUND', ...)` idiom as `createTrip`/`addMember`), `$transaction([deleteMany, ...items.map(create-with-offset-createdAt)])`
- `apps/api/src/features/trips/routes.ts` -- add `PUT /:code/itinerary` (zod: array of `{ day: string min1, title: string min1, note: string.optional().nullable() }`), same `try/catch → next(error)` idiom
- `apps/web/src/features/trip-detail/api.ts` -- extend `TripDetail` with `itineraryItems`; add `updateItinerary(code, items): Promise<ItineraryItem[]>`
- `apps/web/src/features/trip-detail/useUpdateItinerary.ts` -- new: `useMutation` wrapping `updateItinerary`; `onSuccess` merges the response into the `['trip', code]` cache (`setQueryData`) rather than refetching, so a save doesn't flash a loading state
- `apps/web/src/features/trip-detail/ItinerarySection.tsx` (+ `.css`) -- new: renders the list, an inline click-to-edit title per line (local `InlineEditableText` sub-component, not extracted to `shared/` — no second consumer yet), a hover/focus-revealed "Remove" per line, and "+ Add a line"
- `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- render `<ItinerarySection tripCode={code} items={trip.itineraryItems} />` below the existing header meta row

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/features/trips/service.ts` -- `itineraryItems` in `TripDetail`/`TRIP_SELECT`; `updateItinerary`
- [x] `apps/api/src/features/trips/routes.ts` -- `PUT /:code/itinerary`
- [x] `apps/web/src/features/trip-detail/api.ts` -- `itineraryItems` field; `updateItinerary`
- [x] `apps/web/src/features/trip-detail/useUpdateItinerary.ts` -- mutation + cache merge
- [x] `apps/web/src/features/trip-detail/ItinerarySection.tsx` (+ `.css`) -- list, inline-edit title, hover/focus "Remove", "+ Add a line"
- [x] `apps/web/src/features/trip-detail/TripDetailPage.tsx` -- mount `ItinerarySection`
- [x] `apps/api/src/features/trips/routes.test.ts` -- coverage for the I/O matrix (save-from-empty, overwrite-preserves-order, unknown code, empty-title rejection)

**Acceptance Criteria:**
- Given a Trip member is viewing the itinerary, when they click a line to edit it, then it becomes inline-editable with no separate edit icon, saves on blur/Enter via a full-resource overwrite, and is visible to other members the next time they load the Trip
- Given any two Trip members (direct-link or buddy-accepted — identical rights), when either edits the itinerary, then the edit succeeds regardless of how they joined
- Given an itinerary line's "Remove" action, when a user reaches it via keyboard focus instead of a mouse, then it's visible identically to the touch/keyboard treatment — never hover-only

## Implementation Notes

- `updateItinerary`'s `$transaction([deleteMany, ...items.map(create)])` returns a heterogeneous array (Prisma's per-call typing doesn't infer a tuple across a spread); `results.slice(1) as ItineraryItemSummary[]` is a deliberate cast, not an oversight — the shape is guaranteed correct at runtime by construction.
- `day` is set once when a line is added and not independently editable afterward (spec's Never list) — only `title` is the click-to-edit "line" the AC describes; a new line's day auto-labels as `Day ${items.length + 1}`.
- `ItinerarySection` never keeps its own mirror of the full item list — it always reads from the `items` prop (backed by the `['trip', code]` query cache) and tracks only ephemeral UI state (which row is being edited, the new-line draft). This sidesteps any prop/local-state sync problem, and is safe precisely because every write is a full-array overwrite: the freshly-saved array always becomes the new `items` prop on success.
- Per `EXPERIENCE.md`'s Save-failure state pattern ("input value is retained, not cleared"), editing/new-line UI state is only cleared inside the mutation's `onSuccess`, never optimistically before the request resolves — a failed save leaves the row exactly as the user left it, so they can just retry.
- `note` is accepted end-to-end (API, `ItineraryItemInput`, schema) but not surfaced in `ItinerarySection`'s UI — no AC requires editing it in this story, and adding it now would mean guessing at an interaction pattern the mockup/AC don't specify.
- Verified end-to-end via `curl` against the running `apps/api` dev server (create → `PUT` a two-line itinerary → `GET` confirms both persisted with correct order). Did not drive the UI in an actual browser this session (no browser-automation tool available) — the inline-edit-on-click, add-a-line, and hover/keyboard-reveal-of-Remove interactions are unverified beyond code review and type/build checks.
- Post-review: `updateItinerarySchema` caps the array at 200 lines; an empty/whitespace-only `note` now normalizes to `null` like a missing one; `updateItinerary`'s transaction-result slice is guarded by a length assertion. `nextDayLabel` computes the next "Day N" from the highest existing N (not `items.length`), so removing a line and adding a new one can't collide with a surviving line's label. All of `ItinerarySection`'s row actions (start editing, Remove, Add a line) are disabled while a save is already in flight, closing a same-tab race where a second action's stale `items` snapshot could silently clobber the first save's result. Escape now cancels an in-progress edit/new-line back to its prior state instead of committing whatever was typed. Added a test for overwriting an itinerary down to an empty array (removing the last line).

## Spec Change Log

## Review Triage Log

*Code review of the diff since baseline, via blind-hunter, edge-case-hunter, and verification-gap layers, 2026-09-28.*

- **medium, patch** — No guard prevented a second row action (Remove, start-editing, Add a line) from firing while an earlier save was still in flight; each action captures `items` from its own closure at click time, so a later response could silently clobber an earlier, not-yet-applied save (Edge Case Hunter). Verified: no `mutation.isPending` check anywhere in `ItinerarySection`. Fixed: Remove/Add-a-line/start-editing are all disabled while `mutation.isPending`.
- **low, patch** — A new line's day auto-numbered as `Day ${items.length + 1}`, which collides with a surviving line's label once an earlier line is removed then a new one added (e.g. remove "Day 2" from a 3-line itinerary, then add — computes "Day 3", duplicating the existing "Day 3") — independently caught by Blind Hunter and by Verification Gap's "Other findings" pass. Fixed: `nextDayLabel` derives the next number from the highest existing `Day N` among current items, not the array length.
- **low, patch** — `updateItinerarySchema` had no upper bound on array length, unlike every other field in this slice, which bounds individual string lengths (Blind Hunter + Edge Case Hunter, same finding). Fixed: `.max(200)`.
- **low, patch** — An empty/whitespace-only `note` (after zod's `.trim()`, which leaves `""` as `""`, not `null`) persisted as an empty string, inconsistent with a missing `note` persisting as `null` on the same line (Edge Case Hunter). Fixed: normalizes falsy `note` values to `null`.
- **low, patch** — No test covered overwriting an itinerary down to an empty array — the exact result `ItinerarySection.removeItem` produces when removing the last remaining line (Blind Hunter). Fixed: added that case.
- **low, patch** — No Escape-to-cancel path for an in-progress edit or new-line draft — blur always attempted a commit, so changing your mind mid-edit meant retyping the original value verbatim (Blind Hunter + Edge Case Hunter). Fixed: Escape reverts to the pre-edit state via a ref flag the blur handler checks before committing.
- **low, patch** — `updateItinerary`'s `results.slice(1)` relied entirely on the `$transaction` array's positional order with no runtime check (Blind Hunter). Fixed: added a length assertion so a future edit to the transaction's shape fails loudly instead of silently returning the wrong rows.
- **false** — Blind Hunter: `note` is modeled end-to-end but has no UI control in `ItinerarySection`. This is the spec's own disclosed, deliberate scope boundary (see this spec's Never list and Implementation Notes) — not a missed requirement.

## Verification

**Commands:**
- `cd apps/api && npm test` -- expected: all tests pass, including the new itinerary coverage
- `cd apps/api && npx tsc --noEmit` -- expected: clean
- `cd apps/web && npm run lint` -- expected: clean
- `cd apps/web && npm run build` -- expected: succeeds

**Manual checks (if no CLI):**
- On Trip Detail, click "+ Add a line" → a day label appears with a focused, empty title field; type a title, blur → line persists on reload.
- Click an existing line's title, edit it, press Enter → saved without a page reload.
- Tab to a line via keyboard (no mouse) → its "Remove" control is visible identically to hovering it with a pointer.
