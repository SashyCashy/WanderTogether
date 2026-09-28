# Epic 4 Context: Browse and Attach a Place to Stay

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let a Trip's group browse accommodation listings for their Trip's destination and settle on one, visible to everyone — building on Epic 1's Trip and Destination foundation. This is the last of the four "job" epics; unlike Buddies or Write-ups, Accommodations has no standalone entry point — it lives entirely inside Trip Detail.

## Stories

- Story 4.1: Browse Accommodation Listings
- Story 4.2: Attach an Accommodation Listing to a Trip

## Requirements & Constraints

- Any Trip member can browse accommodation listings filtered to that Trip's destination — no separate browse surface outside Trip Detail.
- Listings render as hairline rows (name, price, rating), same row pattern as Discover, with a cold-load skeleton while fetching and a "No results" empty state distinct from a genuine fetch failure ("Couldn't load this").
- The Accommodation dataset is seed-only (AD-12) — populated exclusively by the Prisma seed script, matching the PRD addendum's JSON shape (id, name, destinationId, type, pricePerNightUSD, rating, photoUrl, description). No runtime create/edit endpoint or UI affordance exists for it anywhere.
- Any Trip member can attach one accommodation listing to their Trip, visible to all members. Attaching never creates a payment, reservation, or external booking-system call (FR13) — it's a pure data attachment.
- If a Trip already has an accommodation attached and a member selects a different listing, a one-line confirm ("Replace {current} with {new}?") appears before swapping — never a silent multi-attach.

## Technical Decisions

- `AccommodationListing` is its own Prisma entity (`id`, `slug`, `name`, `destinationId`, `type` — "hotel" | "hostel", `pricePerNightUSD`, `rating`, `photoUrl`, `description`), FK'd to `Destination`. Seed-only (AD-12): no admin/create endpoint exists for it at runtime.
- AD-12's seed-only exception to AD-1: any slice may read `AccommodationListing` (and `Destination`) directly via Prisma, the same exception already used for reading the Destination catalog — it's static reference data, never mutated at runtime, so there's no owning slice's business logic to bypass.
- `Trip.attachedAccommodationId` is a nullable FK, updated via the existing PATCH-partial-merge path (AD-8) — the same partial-update mechanism Story 2.1 already built for `openToBuddies`/`buddyNote`, never a full-Trip overwrite that could clobber the itinerary or buddy state.
- Backend: an `accommodations` feature slice under `apps/api/src/features/accommodations`, calling into `trips`' service per AD-1 for the attach step (Story 4.2). Frontend: `apps/web/src/features/accommodations`.
- Validation at the API boundary uses Zod; all non-2xx responses use the shared `{ error: { code, message } }` envelope (AD-9).

## UX & Interaction Patterns

- The Accommodations panel lives on Trip Detail, alongside the itinerary, buddy toggle, and pending buddy requests — not a separate route or nav destination.
- Listing rows use the same hairline-separated `Row` pattern as Discover and Write-ups — no cards, no shadows.
- Cold-load skeleton (row-shaped placeholders) while the listing fetches; "No results" (empty filter) and "Couldn't load this" (fetch failure) are visually and textually distinct, matching every other listing surface in the app.
- Selecting a listing when one is already attached shows a one-line replace-confirm ("Replace {current} with {new}?") before swapping — Story 4.2's concern, but Story 4.1's row click target should anticipate wiring into that flow.
- Calm, direct, plain-spoken microcopy throughout — no exclamation points, no emoji, no false urgency.

## Cross-Story Dependencies

- Story 4.2 depends on Story 4.1's listing UI existing to select from.
- Both stories depend on Story 1.1's scaffold: the full `schema.prisma` (including `AccommodationListing` and `Trip.attachedAccommodationId`), the shared AD-9 error-handling middleware, and the shared frontend Row/RowSkeleton/EmptyState components.
- Both stories depend on Epic 1's Destination catalog and a Trip already existing (Epic 1) — Accommodations has no dependency on Buddies (Epic 2) or Write-ups (Epic 3).
