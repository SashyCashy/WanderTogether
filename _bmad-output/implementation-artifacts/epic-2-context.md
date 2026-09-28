# Epic 2 Context: Find and Add Travel Buddies

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let a Trip open itself up to outside travelers: any member can mark a Trip open to buddies with a short note, any visitor can browse open Trips and submit a join request, and any existing member can accept or decline that request. This is complete and shippable on its own, building on Epic 1's Trip/membership foundation — it adds no new entities beyond what the buddy-request flow needs, and reuses the same membership path Epic 1 established.

## Stories

- Story 2.1: Mark a Trip Open to Buddies
- Story 2.2: Browse Open Trips and Request to Join
- Story 2.3: Accept or Decline a Buddy Request

## Requirements & Constraints

- Any member of a Trip can toggle it open to buddies and attach a short note (spots available, what they're looking for); switching off removes it from the Buddies browse listing without deleting any already-submitted pending requests.
- Any visitor can browse Trips open to buddies and submit a join request with a short message; the request must be visible to existing Trip members before it grants any access — submitting alone never grants access.
- Any member of the target Trip can accept or decline a pending request. Accepting adds the requester as a full Trip member with identical edit rights to everyone else (no owner-only actions, no permission tiers). Declining removes the request and grants nothing.
- No accounts and no stable per-person identity exist anywhere in this product — "one request per person per Trip" is a best-effort, bypassable client-side rule, not a server guarantee.
- No real-time notification exists for requesters (accepted/declined state is only visible on revisit via the same link/session).

## Technical Decisions

- **Slice boundary is service-call only (AD-1):** the `buddies` slice never writes its own Prisma queries against Trip/TripMember tables. It calls the `trips` slice's exported service functions instead — critically, `trips.addMember(tripCode, displayName)` for accept.
- **Access is link/code-based, not session-based (AD-2):** every Trip-touching endpoint (toggle, note, request, accept/decline) takes the Trip Code as a path parameter; possessing the code is sufficient authorization. No session/auth model anywhere.
- **Joining always persists a TripMember (AD-6):** accepting a buddy request must call the same shared `addMember` function that Epic 1's Traveler Profile submission uses — not a separate/duplicated insert path.
- **Trip Code must never leak into a browse context (AD-7):** the open-to-buddies browse listing response is a restricted view that excludes the `code` field entirely. This is the specific, critical fix that prevents a visitor copying a Trip's own access credential out of the public browse listing and self-joining without going through the request/accept gate.
- **Mutation strategy (AD-8):** `openToBuddies` and `buddyNote` are Trip-level fields updated via PATCH-partial-merge (only fields present in the body change) — never a full-Trip overwrite, which would risk clobbering the itinerary or accommodation state.
- **One error envelope (AD-9):** all endpoints return `{ error: { code, message } }` with codes from the fixed vocabulary (`NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `FILE_TOO_LARGE`, `INTERNAL_ERROR}`), via the shared middleware — never assembled ad hoc in the buddies routes.
- **Frontend data layer (AD-10):** all Trip reads/mutations go through TanStack Query keyed off `['trip', tripCode]`; no raw `useEffect`+`fetch`. A Trip mutation (toggle, accept, decline) invalidates that key so every surface reading it stays consistent.
- **De-duplication is client-side only (AD-14):** "one request per person per Trip" is enforced via a `localStorage` flag that hides the request form on return visits from the same browser — no database uniqueness constraint, accepted as bypassable.
- Naming: REST routes kebab-case plural; JSON fields camelCase; ids via `nanoid()` default length (Trip Codes keep their existing 10+ character rule from Epic 1, unaffected here).

## UX & Interaction Patterns

- Open-to-buddies toggle is a real track-and-knob switch: `role="switch"`, `aria-checked`, a programmatically associated label, and a minimum 24×24px hit area regardless of visible track size.
- Revealing the note field on toggle-on must be announced via a polite live region for screen-reader users; the same applies to the accept action updating the pending-requests list in place (not a visual-only disappearance).
- Buddy request row (not a card — no card treatment anywhere in this product): message field + submit for requesters; Accept/Decline actions for Trip members.
- Distinct, non-interchangeable copy/states: "Request sent — waiting on the group" (just-submitted, requester-facing) vs. the Trip-member-facing pending list vs. "This request was declined" (requester revisits after a decline) — each is its own state, not folded into a generic pending/error state.
- Search/filter input on the Buddies browse surface carries a persistent visible label, not placeholder-only text.
- Standard listing states apply to the Buddies browse surface: cold-load skeleton, "No results" (empty filter) visually/textually distinct from "Couldn't load this" (fetch failure with retry).
- Voice: calm, direct, plain-spoken copy throughout (no exclamation points, no emoji, no false urgency).

## Cross-Story Dependencies

- Depends on Epic 1's Trip/TripMember model and the shared `addMember` service function (Story 1.4) — Story 2.3's accept action reuses it rather than introducing a parallel join path.
- Depends on Epic 1's shared frontend layer (Story 1.1) for the Row, Toggle/switch, Empty State, and live-region/announce utilities — these should already exist and just be reused, not reimplemented.
- Story 2.1 (open-to-buddies + note) must ship before Story 2.2 has any Trips to list, and before Story 2.3 has anything to accept/decline.
