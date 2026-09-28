---
title: 'Story 1.3: Start and Create a Trip'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '686ef035c56501f59fcd8a179320cee7ac5c0e7c'
context:
  - _bmad-output/implementation-artifacts/epic-1-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Discover lets visitors browse destinations, but there is no way to turn a destination (or a blank slate) into an actual Trip — the app's second real screen and the moment a visitor gets something shareable.

**Approach:** Add `POST /api/trips` + `GET /api/trips/:code` (trips slice), a Trip-creation form reachable from a Destination row's "Start a Trip here" and from a standalone "Start a Trip" entry point on Discover, and a minimal Trip Detail screen showing the created Trip's name/dates/Trip Code immediately. This is the first story needing more than one screen, so it also introduces a minimal URL-path router (no library — see Design Notes).

## Boundaries & Constraints

**Always:**
- Trip Code = `nanoid(10)` used directly as the Trip's `id` (AD-2/AD-3) — never a separate code field.
- `POST /api/trips` requires `name`, `destinationId` (must reference an existing seeded Destination — `VALIDATION_ERROR` if not), `startDate`, `endDate` (ISO date strings, `endDate >= startDate` — `VALIDATION_ERROR` if violated).
- On successful creation, the client immediately writes the Trip Code into the local "My Trips" index (AD-13) via a new shared `shared/myTripsIndex.ts`, then navigates to `/trip/:code`.
- `GET /api/trips/:code` is the one read path this story builds; both post-creation navigation and any direct visit to a Trip link use it (`useTrip(code)`, TanStack Query key `['trip', code]` per the established convention) — no special-casing "just created."
- New routes: `/` (Discover, unchanged), `/trips/new` (Trip-creation form, optional `?destinationId=`), `/trip/:code` (Trip Detail). Internal link clicks are intercepted app-wide (History API `pushState`/`popstate`) — no router dependency added.
- Reuse `Row`, `EmptyState`, `RowSkeleton`, `useAnnounce` exactly as they are.

**Never:**
- No itinerary, buddy-toggle, or accommodation sections on Trip Detail yet (Stories 1.5, Epic 2, Epic 4) — header only (name, dates, Trip Code chip with copy action).
- No Traveler Profile prompt on opening a Trip link (Story 1.4) — this story's Trip Detail view is read-only display, not membership.
- No production static-hosting fallback config for the new paths — deployment is deliberately deferred project-wide.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Create from a Destination | Valid name/destinationId/dates | `201` with the full Trip; client navigates to `/trip/:code` | N/A |
| Create without a pre-filled destination | Form's own destination dropdown used instead | Same as above | N/A |
| Unknown `destinationId` | `destinationId` doesn't match any seeded row | `400 VALIDATION_ERROR` | Inline form error, no Trip created |
| `endDate` before `startDate` | Invalid date range | `400 VALIDATION_ERROR` | Inline form error, no Trip created |
| Open `/trip/:code` for a real Trip | Valid code | `200` with Trip; header renders name/dates/code | N/A |
| Open `/trip/:code` for an unknown/malformed code | Invalid code | `404 NOT_FOUND` | "This code doesn't match a trip." empty state, not a blank page |

</frozen-after-approval>

## Code Map

- `apps/api/src/features/trips/service.ts` -- new: `createTrip(input)` (validates `destinationId` via `prisma.destination.findUnique` per AD-1's seed-data exception, generates `nanoid(10)` id, `prisma.trip.create`), `getTripByCode(code)` (`findUnique`, throws `AppError('NOT_FOUND', ...)` if missing) — both return a trimmed shape `{ id, name, startDate, endDate, createdAt, destination: { id, name, country } }`
- `apps/api/src/features/trips/routes.ts` -- new: `tripsRouter` — `POST /` (Zod-validated body, `endDate >= startDate` check, `VALIDATION_ERROR` on either failure) and `GET /:code`, both `try/catch` → `next(error)`, matching `error-middleware.ts`'s vocabulary
- `apps/api/src/app.ts` -- mount `tripsRouter` at `/api/trips`, alongside the existing `discoveryRouter` mount
- `apps/web/src/shared/router.ts` -- new: minimal `useSyncExternalStore`-based router (`useRoute()`, `navigate(path)`) over `pushState`/`popstate` — no dependency added; a document-level click interceptor (added once in `App.tsx`) captures same-origin internal `<a href>` clicks
- `apps/web/src/shared/myTripsIndex.ts` -- new: `addTripToIndex(tripCode: string)` — reads/merges/writes a `Record<tripCode, string | null>` under one `localStorage` key (`null` = no Traveler Profile set yet; Story 1.4 will overwrite with a real name on join)
- `apps/web/src/features/trip-detail/api.ts` + `useTrip.ts` -- new: `fetchTrip(code)`, `useTrip(code)` (`['trip', code]`)
- `apps/web/src/features/trip-detail/useCreateTrip.ts` -- new: `useMutation` wrapping `POST /api/trips`; on success, seeds `['trip', id]` cache, calls `addTripToIndex(id)`, navigates to `/trip/:id`
- `apps/web/src/features/trip-detail/CreateTripPage.tsx` (+ `.css`) -- new: name/destination-select/start-date/end-date form; reads `?destinationId=` from the URL to pre-fill and lock the destination field when present, otherwise renders the dropdown open (options from `useDestinations()`, already fetched on Discover)
- `apps/web/src/features/trip-detail/TripDetailPage.tsx` (+ `.css`) -- new: header only (name, formatted date range, Trip Code chip + "Copy link" button using `navigator.clipboard`); loading skeleton, and a distinct not-found `EmptyState` on `404`
- `apps/web/src/features/discover/DiscoverPage.tsx` -- add a "Start a Trip" entry point (no destination) near the filters; change each `Row`'s destination click-through to `href="/trips/new?destinationId={id}"` labeled via the row itself (no separate button) per Row's existing "click anywhere" pattern
- `apps/web/src/App.tsx` -- switch on `useRoute()` to render `DiscoverPage` / `CreateTripPage` / `TripDetailPage`; update the `Discover` nav item's `href` from `#discover` to `/`

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/features/trips/service.ts` -- `createTrip` + `getTripByCode` -- owning-slice Prisma access, trimmed response shape
- [x] `apps/api/src/features/trips/routes.ts` -- `POST /` + `GET /:code` -- Zod validation, shared error vocabulary
- [x] `apps/api/src/app.ts` -- mount `tripsRouter` at `/api/trips`
- [x] `apps/web/src/shared/router.ts` -- `useRoute()` / `navigate()` + click interception
- [x] `apps/web/src/shared/myTripsIndex.ts` -- `addTripToIndex()`
- [x] `apps/web/src/features/trip-detail/{api,useTrip,useCreateTrip}.ts` -- fetch/mutate/cache wiring
- [x] `apps/web/src/features/trip-detail/CreateTripPage.tsx` (+ `.css`) -- creation form, both entry-point variants
- [x] `apps/web/src/features/trip-detail/TripDetailPage.tsx` (+ `.css`) -- header + Trip Code chip + not-found state
- [x] `apps/web/src/features/discover/DiscoverPage.tsx` -- "Start a Trip" entry point + row → creation-form linking
- [x] `apps/web/src/App.tsx` -- route switch + nav href update
- [x] `apps/api/src/features/trips/routes.test.ts` -- automated coverage for the I/O matrix (create happy path, unknown destinationId, bad date range, get-by-code happy path, get-by-code 404)

**Acceptance Criteria:**
- Given a visitor is viewing a Destination, when they choose "Start a Trip here," then the creation form opens with that destination pre-filled
- Given a visitor submits the creation form (with or without a pre-filled destination), when the Trip is created, then a Trip Code/Link is generated immediately and shown to the creator, with no authentication step anywhere
- Given a Trip is just created, when the creator's browser processes the response, then the Trip Code is recorded in the local "My Trips" index immediately
- Given any visitor opens a Trip Code/Link directly, then the Trip Detail header renders without requiring a prior in-app navigation

## Implementation Notes

- `trips/service.ts`'s `TripDetail.startDate`/`endDate` are typed `Date | null`, not `Date` — Prisma's schema has them nullable (no other creation path exists yet, but the type should reflect the schema honestly rather than assert non-null against it). `TripDetailPage` handles the `null` case by omitting the date range from the header.
- `createTrip` validates `destinationId` via a direct `prisma.destination.findUnique` (AD-1's seed-data exception) before insert, rather than relying on Prisma's foreign-key constraint failure — gives a clean `VALIDATION_ERROR` instead of translating a raw Prisma error code.
- Router (`shared/router.ts`): `useSyncExternalStore` over `pushState`/`popstate`, plus one document-level click interceptor installed once in `App.tsx`. Every existing `Row href=`/`Navigation` `<a>` works through it unmodified — no `Link` component needed anywhere.
- `useCreateTrip` seeds the `['trip', id]` query cache from the create response before navigating, so `TripDetailPage` renders immediately post-creation with no loading flash; a fresh visit to the same URL still fetches via `GET /api/trips/:code` normally.
- `myTripsIndex.ts` writes `{ [tripCode]: null }` on creation (`displayName` unset) — Story 1.4 will overwrite the value on a Traveler Profile submission; wrapped in try/catch since `localStorage` can throw (private mode, quota).
- Verified end-to-end via `curl` against the running `apps/api` dev server (seeded catalog → `POST /api/trips` → `GET /api/trips/:code` → `GET` on an unknown code returns 404), plus `tsc`/`vite build` for the frontend. Did not drive the UI in an actual browser this session (no browser-automation tool was exercised) — the create-form → trip-detail click-through, the "Start a Trip" entry points, and the copy-link button are unverified beyond code review and type/build checks.
- Post-review: `CreateTripPage` now surfaces `useDestinations()`'s loading/error state on the destination dropdown, resets a stale/unmatched `?destinationId=` instead of letting it silently submit, caps the trip-name input at 200 chars (matching the server's `zod` limit), and announces submission errors via `useAnnounce`. `TripDetailPage`'s not-found/error state gets a "Back to Discover" action and announces load-complete/error/copy outcomes the same way. `routes.test.ts` gained a case that actually exercises `zod`'s own `.parse()` failure (missing `name`), not just the two application-level `VALIDATION_ERROR` checks.

## Spec Change Log

## Review Triage Log

*Code review of the diff since baseline, via blind-hunter, edge-case-hunter, and verification-gap layers, 2026-09-28.*

- **medium, patch** — `CreateTripPage` never observed `useDestinations()`'s `isLoading`/`isError` state (Blind Hunter + Edge Case Hunter, same root cause). Verified: the original dropdown rendered only a static placeholder regardless of fetch state. Fixed: shows "Loading destinations…" while pending, a field-level error message (and disables submit) on failure.
- **medium, patch** — A stale/unmatched `?destinationId=` left `destinationId` state pointing at a non-existent id, so the dropdown's `required` guard didn't stop submission of a bad id (Blind Hunter + Edge Case Hunter, same root cause). Verified by tracing: `prefilledDestination` becomes `undefined` but `destinationId` state, seeded from the same bad value at mount, was never reset. Fixed: an effect clears `destinationId` once destinations have loaded and the prefilled id doesn't match any of them.
- **medium, patch** — `TripDetailPage`'s not-found/error `EmptyState` had no way back into the app — a dead end for a stale or mistyped Trip Code link (Blind Hunter). Verified: no link/action was rendered in that branch. Fixed: added a "Back to Discover" `primaryAction` (`EmptyState` already supports `href` actions).
- **medium, patch** — New trip-detail/create-trip screens never called `useAnnounce`, unlike Discover's established pattern, so submission errors, Trip Detail's load-complete/error, and the copy-link confirmation were visually-only (Blind Hunter + Edge Case Hunter's claims check against the spec's "reuse ... `useAnnounce` exactly as they are"). Verified: no `useAnnounce` import in either file pre-fix. Fixed: both screens now announce their state transitions. The claims-check's parallel objection that `RowSkeleton` should also have been reused for `TripDetailPage`'s loading state is rejected as `false` — `RowSkeleton` renders N list-row placeholders and doesn't fit a single non-list header; the spec's reuse note was about `EmptyState`/`useAnnounce` applying here, which it did for `EmptyState` already and now does for `useAnnounce` too.
- **medium, patch** — No test ever exercised `zod`'s own `.parse()` failure on `POST /api/trips` — the two existing 400 tests both send well-formed bodies that fail a downstream application check (unknown `destinationId`, `endDate < startDate`), never the schema itself (Verification Gap, evidence: read both existing 400 tests and confirmed neither omits/malforms a field). Fixed: added a case posting a body with `name` omitted, asserting `400 VALIDATION_ERROR`.
- **low, patch** — The trip-name input had no client-side length cap matching the server's `zod` 200-char limit, so a too-long name would only be rejected after submit (Blind Hunter). Fixed: `maxLength={200}` on the input.
- **low, reject (carried)** — Blind Hunter: no frontend test coverage for the new router/localStorage/create-trip/trip-detail files. Same pre-existing condition Story 1.2's review already triaged and rejected (`apps/web` has no test runner configured project-wide) — not a regression this diff introduced.
- **false** — Blind Hunter: `navigate()` doesn't validate a malformed `path` argument. No call site in the diff passes anything but a well-formed path (`` `/trip/${trip.id}` ``); this is speculative developer-discipline concern with no demonstrated trigger, not a reachable defect.
- **false** — Edge Case Hunter: a Destination `id` containing a URL-reserved character would break the unencoded `href`. Every Destination id is generated by a bare `nanoid()` call (schema.prisma's own invariant), whose default alphabet (`A-Za-z0-9_-`) contains no URL-reserved characters — the trigger condition cannot occur through any real code path.
- **false** — Edge Case Hunter: `destinations` resolving to an empty array leaves the form's dropdown stuck with no explanation. Unreachable per AD-12 (Destination catalog is seed-only, no runtime create/delete endpoint exists anywhere in the product) — same invariant Story 1.2's review already used to reject an equivalent claim.

## Design Notes

**Router:** a full library (React Router) is unjustified for two new paths in a tutorial-scale SPA with no nested layouts — `useSyncExternalStore` over the native History API is ~20 lines and keeps the "no plugin surface" posture from `SOLUTION-DESIGN.md`. Example shape:

```ts
export function navigate(path: string) {
  window.history.pushState(null, '', path);
  notify();
}
export function useRoute() {
  return useSyncExternalStore(subscribe, () => location.pathname + location.search);
}
```

A single click-interceptor in `App.tsx` (checks `event.target.closest('a')`, same-origin, no modifier keys, no `target`) calls `navigate()` and `preventDefault()`, so every existing/future `Row href=` and nav `<a>` "just works" without a custom `Link` component.

### Independent code-review pass (2026-09-28, `/code-review` — blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor)

Run separately against this story's own commit diff (`686ef03..cdb4a97`), per `sprint-status.yaml`'s documented process.

- **medium, patch** — `CreateTripPage`'s `destinationId` state can desync from the URL: it's seeded once via `useState(prefilledDestinationId)`, and the reset effect only fires when the prefilled id matches *no* destination — never when it changes to a *different valid* one (Blind Hunter + Verification Gap, same root cause, independently caught). Verified: browser back/forward between two different `/trips/new?destinationId=` history entries re-renders the same component instance (`App.tsx`'s `CurrentPage` switched only on `pathname`, not `search`) rather than remounting it, so the locked destination field could show one destination while submitting a stale id for another. Fixed: `CreateTripPage` is now keyed on the full search string (`key={search}` in `App.tsx`), forcing a remount whenever the query string changes.
- **medium, patch** — `decodeURIComponent(tripMatch[1])` in `App.tsx` throws an uncaught `URIError` on malformed percent-encoding in a pasted `/trip/:code` URL, and with no error boundary anywhere in the app that crashes the render to a blank page — directly violating the project's own "never a blank/broken page" principle (Edge Case Hunter). Fixed: wrapped in `try/catch`, falling back to the raw undecoded segment, which just fails the code lookup normally and lands on Trip Detail's existing not-found state instead of crashing.
- **medium, patch** — `POST /api/trips` used `z.coerce.date()`, which accepts anything the native `Date` constructor parses (epoch millis, `"March 14 2027"`, etc.), not just the spec's Always-constraint "ISO date strings" (Acceptance Auditor). Verified `z.iso.date()` exists in the installed zod (4.6.5) and returns the same shape after a `.transform((s) => new Date(s))`. Fixed: both `startDate`/`endDate` now use a strict ISO-date schema; confirmed via `curl` that a non-ISO string is now rejected with `400 VALIDATION_ERROR` while the frontend's actual `"YYYY-MM-DD"` format still passes.
- **low, patch** — `CreateTripPage` never validated `endDate >= startDate` client-side, unlike the unknown-destination case, so a bad range always round-tripped to the server for a generic (not field-associated) error, short of the I/O matrix's "inline form error" framing (Blind Hunter). Fixed: added a client-side check in `handleSubmit` with a field-associated error (`aria-describedby` on the end-date input), cleared when either date changes, and announced via `useAnnounce`.
- **low, patch** — `handleCopy` swallowed a `navigator.clipboard.writeText` failure with an empty catch and no `announce()` call, inconsistent with this same story's own newly-established `useAnnounce` coverage for every other error path (Blind Hunter). Fixed: announces a fallback message on copy failure.
- **low, patch** — `handleCopy`'s `setTimeout` (reverting the "Copied" label) could fire after the component unmounts if the user navigates away within 2 seconds of copying, leaking a timer and risking a set-state-after-unmount warning (Edge Case Hunter). Fixed: tracked via a ref, cleared on unmount and before starting a new one.
- **low, patch** — `routes.test.ts`'s create-happy-path test only asserted `name`, `destination.id`, and `id.length`, leaving `startDate`/`endDate`/`createdAt`/`destination.name`/`destination.country` — part of the Code Map's documented response shape — unverified (Blind Hunter). Fixed: expanded the assertions to cover the full shape.
- **low, accept-deviation** — Acceptance Auditor: `myTripsIndex.ts`'s `addTripToIndex(tripCode, displayName?)` signature has one more parameter than the frozen Code Map's `addTripToIndex(tripCode: string)`. Real deviation from the frozen spec's literal text, but not correctable now: Story 1.4 (already implemented and reviewed) directly depends on this exact two-parameter signature for its join flow. Reverting would regress already-shipped, working code for a documentation-literalism concern with no behavioral downside (the parameter is optional and this story's own call site is unaffected).
- **low, reject** — Blind Hunter: the spec's `## Spec Change Log` section is empty despite substantive post-review fixes. Per the spec template, that section is append-only for `bad_spec` loopback entries specifically — this story's review never produced a `bad_spec` verdict (all findings were `patch`/`false`), and the substantive changes are correctly recorded in `## Implementation Notes` instead. Not a real gap.
- **low, reject** — Blind Hunter: `installLinkInterceptor` drops the URL fragment (`url.hash`) on every intercepted click, so a future in-page anchor link would lose native scroll-to-anchor behavior. No in-page anchor links exist anywhere in the app today; purely speculative future-facing concern.
- **low, reject** — Blind Hunter: `formatDateRange` treats "only one of `startDate`/`endDate` is null" the same as "both null." Unreachable today: the creation form always requires and sends both dates together, and no other write path exists.
- **low, reject** — Blind Hunter: "Start a Trip" and each destination row's link have no `aria-label` distinguishing their different resulting form behavior (locked vs. open destination field) in advance. No concrete accessibility guideline is violated; a screen-reader user isn't owed advance knowledge of a linked page's form behavior any more than a sighted user is.
- **low, reject (reaffirmed)** — Acceptance Auditor flagged the story's own prior `false` verdict on "`RowSkeleton` not reused for Trip Detail's loading state" as worth a human re-check rather than treating it as settled. Re-checked: the judgment stands — `RowSkeleton` renders N list-row placeholders and has no shape that fits a single non-list header; a plain "Loading…" text remains the more honest choice than forcing an ill-fitting shared component.
- **low, reject** — Acceptance Auditor: on a cold destinations cache (a shared `/trips/new?destinationId=X` link opened fresh, no prior Discover visit), the destination field briefly shows a disabled, loading dropdown instead of the locked pre-filled field until the fetch resolves. Expected, self-correcting loading-state behavior — the same pattern Discover's own cold load already uses — not a defect.

## Verification

**Commands:**
- `cd apps/api && npm test` -- expected: all tests pass, including the new `trips/routes.test.ts`
- `cd apps/api && npx tsc --noEmit` -- expected: clean
- `cd apps/web && npm run lint` -- expected: clean
- `cd apps/web && npm run build` -- expected: succeeds

**Manual checks (if no CLI):**
- From Discover, click a destination row → creation form opens with that destination locked in; submit → Trip Detail shows name/dates/code.
- Click "Start a Trip" (no destination) → form's destination dropdown is open/editable; submit → same result.
- Paste the resulting `/trip/:code` URL into a fresh tab → header renders without visiting Discover first.
- Visit `/trip/not-a-real-code` → "This code doesn't match a trip." empty state, not a blank page.
