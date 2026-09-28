# Architecture Spine Review — WanderTogether

## Overall verdict
The spine is well-formed, terse, and mostly at the right altitude — every FR and IA surface resolves to an AD, a Capability→Architecture Map row, or an explicit Deferred, and the 10 ADs are each individually testable. Two defects would let independently-built units genuinely diverge: the ERD draws two relationships as mandatory when the PRD/UX explicitly require them optional (risking non-nullable FKs), and there's no architectural hook — analogous to the one AD-10 already built for "My Trips" — for how an anonymous buddy requester ever learns their request was declined, despite EXPERIENCE.md requiring exactly that state.

### Findings

- **high** ERD draws two explicitly-optional relationships as mandatory (Structural Seed / ERD). `TRIP }o--|| ACCOMMODATION_LISTING : "attaches (0..1)"` — the `||` next to ACCOMMODATION_LISTING means "exactly one accommodation per Trip," i.e. mandatory, directly contradicting the same line's own "(0..1)" label and FR-13 ("attach one Accommodation Listing" — implicitly optional, no listing at Trip creation). Likewise `DESTINATION ||--o{ TRIP_WRITEUP : "optionally about"` uses `||` next to DESTINATION ("exactly one destination per write-up"), contradicting its own "optionally about" label and FR-10 ("optionally linked to a Destination"). A builder implementing `schema.prisma` from this diagram would make `Trip.accommodationListingId` and `TripWriteup.destinationId` non-nullable, breaking both FRs. *Fix:* change to `TRIP }o--o| ACCOMMODATION_LISTING` and `DESTINATION |o--o{ TRIP_WRITEUP` (zero-or-one on the optional side) so the drawn cardinality matches the prose.

- **high** No architectural hook for an anonymous buddy requester to learn their request status (Coverage gap — Travel Buddies / EXPERIENCE.md State Patterns). EXPERIENCE.md requires "Buddy request declined (Buddies, requester's view only, if they return via the same link/session)" and "Request sent — waiting on the group," but AD-2 gives requesters no session or identity at all, and no AD (unlike AD-10, which was built for the structurally identical "My Trips" problem) says how the requester's browser is supposed to recognize *its own* request among a Trip's pending/declined requests. Without a fix, one builder might silently drop this UX state and another might invent an ad hoc localStorage token — a real divergence at this altitude. *Fix:* add an AD parallel to AD-10, e.g. the client stores `{tripCode, requestId}` in `localStorage` on submission (mirroring the My Trips index), and the API returns the created `TravelBuddyRequest.id` so the frontend can poll/look up its own request's status.

- **medium** Dependency diagram omits required reads of Discovery-owned data (Invariants & Rules / mermaid graph). Starting a Trip (FR-2/FR-3) needs a valid `destinationId`, and Write-ups/Accommodations filter by Destination (FR-11, FR-12), so `trips`, `write-ups`, and `accommodations` all need to read Destination data that the folder structure and Capability Map assign to the `discovery` slice. AD-1 says such reads must go through the owning slice's service function, but the diagram only draws `S_Buddies --> S_Trips` and `S_Accom --> S_Trips` — no `S_Trips/S_Writeups/S_Accom --> S_Discovery` edges — leaving it ambiguous whether Destination is exempt from AD-1 (e.g., treated as shared read-only reference data) or just an undrawn instance of it. *Fix:* either add the missing edges, or add one sentence to AD-1/AD-9 stating whether seed-only reference data (Destination, AccommodationListing) may be read directly via Prisma by any slice as an explicit carve-out from the service-call rule.

- **medium** AD-6 fixes envelope shape but not a shared error-code vocabulary (AD-6). The rule guarantees every error is `{ error: { code, message } }`, but nothing fixes what `code` values exist, so five independently-built slices could each invent their own string for "resource not found," "validation failed," etc. EXPERIENCE.md needs the frontend to reliably distinguish specific failure classes (Invalid/expired Trip Code vs. Listing-failed-to-load vs. Save-failure), and per-slice divergent codes would undercut AD-7's promise of consistent cross-surface error handling. *Fix:* add a short enumerated set of canonical codes (e.g. `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`) to AD-6 or the Consistency Conventions table that all slices must reuse.

- **medium** Shared live-region pattern is required by UX but not named in the shared frontend layer (Structural Seed — `apps/web/src/shared`). EXPERIENCE.md's Accessibility Floor requires same-page updates (buddy-request accept, toggle-reveal) to be announced via "a polite live region," reused across at least the `buddies` and `trip-detail` slices — the same kind of cross-slice consistency risk AD-7 was written to close for server state. The shared folder's component list (TanStack Query client, CSS-var tokens, Row/EmptyState/Toggle, AD-10 localStorage index) doesn't include an announcer/live-region utility, so slices may each roll their own or skip it. *Fix:* add a shared `LiveRegion`/`useAnnounce` utility to the shared frontend layer list, or add a one-line AD binding all slices to it.

- **low** ERD's Trip→TripMember cardinality allows a memberless Trip (Structural Seed / ERD). `TRIP ||--o{ TRIP_MEMBER : "has"` uses `o{` (zero-or-more) even though a Trip always has at least its creator as a member from the moment it's created. Cosmetic; doesn't block any builder. *Fix:* optionally tighten to `}|` (one-or-more) for precision, not required.

- **low** Design Paradigm section carries short rationale prose ("Chosen over a layered/hexagonal split because...") that duplicates content already captured in the memlog. It's brief (2–3 sentences) so impact is minimal, but a stricter "build substrate, not rationale" cut would move it out entirely. *Fix:* optional — trim to the decision itself and point to the memlog for the "why," or leave as-is given its brevity.

## Coverage check

| PRD FR / IA surface | Covered by |
| --- | --- |
| FR-1, FR-2 (Discover) | Capability Map row 1 → `discovery` slice, AD-9 |
| FR-3, FR-4, FR-5, FR-6 (Trip create/join/itinerary/access) | Capability Map row 2 → `trips` slice, AD-2/3/4/5 |
| FR-7, FR-8, FR-9 (Travel Buddies) | Capability Map row 4 → `buddies` slice, AD-1/2/4 — **but see the "declined request" finding above: FR-8/FR-9's requester-side UX state has no AD** |
| FR-10, FR-11 (Trip Write-ups) | Capability Map row 5 → `write-ups` slice, AD-4/8 |
| FR-12, FR-13 (Accommodations) | Capability Map row 6 → `accommodations` slice, AD-1/4/9 |
| My Trips (no dedicated FR) | Capability Map row 3, AD-10 |
| Discover / My Trips / Trip detail / Buddies / Write-ups (IA surfaces) | Frontend slices in mermaid + Structural Seed folder tree |
| Join a Trip (IA surface) | Explicitly called out in Design Paradigm as a thin entry point inside `trip-detail`, not a separate slice |
| Deployment/environments | Deferred (explicit, reasoned) |
| Photo/media storage | AD-8 |
| Data model relationships | AD-4 + ERD (ERD has two cardinality bugs — see findings) |
| Error handling | AD-6 (envelope fixed; code vocabulary open — see findings) |
| Frontend state management | AD-7 (server state); client-only state has no cross-slice divergence risk beyond what AD-10 already covers |
| Seeding of static data | AD-9 |
| Stack/version consistency | No contradictions found — every library named in an AD or Consistency Convention (nanoid, multer, TanStack Query, Zod, Prisma) appears in the Stack table; `multer`'s unpinned version is a deliberate, reasonable exception, not an inconsistency |
