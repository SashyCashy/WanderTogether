# Epic 3 Context: Share and Read Trip Write-ups

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Let anyone publish and read write-ups about past trips, independent of any specific Trip record — the write-up may optionally link to a Destination, but requires no Trip Code, membership, or authentication. This is the most standalone epic in the product: it gives visitors a way to share and learn from trip experiences outside the Trip-planning flow entirely.

## Stories

- Story 3.1: Publish a Trip Write-up
- Story 3.2: Browse and Read Trip Write-ups

## Requirements & Constraints

- Any visitor can publish a Trip Write-up (title, body text, one or more photos), optionally linked to a Destination — no Trip Code, membership, or authentication required at any point.
- Any visitor can browse and read published write-ups, optionally filtered by Destination; write-ups with no Destination link are excluded from a Destination-filtered view but remain visible in the unfiltered list.
- No comments, likes, follows, or ranked feeds anywhere (explicit product non-goal).
- No draft-saving in v1 — losing an in-progress composer entry is an accepted gap.
- Pagination on the write-ups listing (never infinite scroll).

## Technical Decisions

- `TripWriteup` is its own Prisma entity, not attached to `Trip` — publishing requires no Trip context.
- Photos are stored as local-disk files under `apps/api/uploads/` via `multer` (^2.4.0, minimum 2.0.2 for CVE-2025-7338) and referenced from `TripWriteup.photoUrls`, a JSON array of relative URL strings. Never base64-in-DB, never cloud storage, never a separate `Photo` table/entity.
- All non-2xx API responses use the single shared error envelope `{ error: { code, message } }` with a fixed code vocabulary (`NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `FILE_TOO_LARGE`, `INTERNAL_ERROR`), produced by shared middleware sitting after `multer` in the chain. `multer` upload failures (e.g. `MulterError`/`LIMIT_FILE_SIZE`) must be explicitly translated into this vocabulary (e.g. `FILE_TOO_LARGE`) rather than falling through as `INTERNAL_ERROR`.
- Backend: `write-ups` feature slice under `apps/api/src/features/write-ups`; REST route is kebab-case plural (`/write-ups`). Frontend: `write-ups` feature slice under `apps/web/src/features/write-ups`.
- Validation at the API boundary uses Zod.
- Uploaded files are served statically from `apps/api/uploads/`.

## UX & Interaction Patterns

- Write-up composer: stacked fields in order — title, then body, then photo slots. Empty photo slots render as 1px dashed border boxes until filled.
- Listing rows (Destinations/Write-ups/Buddies share this pattern): left swatch/thumbnail, headline + one-line description, right-aligned metadata, hairline-separated — no cards, no shadows.
- Search/filter input (Destination filter on Write-ups) carries a persistent visible label, not placeholder-only text.
- Cold-load skeleton (row-shaped placeholders) while the write-ups list fetches.
- "No results" (empty filter) and "Listing failed to load" (genuine fetch failure) are visually and textually distinct states — must not share copy or treatment. Empty state pattern: headline one-liner + one body line, generous padding, reused identically across listing surfaces; no primary action needed for "no write-ups yet."
- Save failure on the composer (including file-upload errors) shows an inline message without clearing already-entered form values.
- All write-up photos carry descriptive alt text; decorative placeholders use `alt=""`.
- Calm, direct, plain-spoken microcopy throughout — no exclamation points, no emoji, no false urgency.
- Click anywhere on a write-up row opens its detail view; no separate "view" button.

## Cross-Story Dependencies

- Story 3.2 depends on Story 3.1 having published data to browse (or seed/test data).
- Both stories depend on Story 1.1's scaffold: the full `schema.prisma` (including `TripWriteup`), the shared AD-9 error-handling middleware, and the shared frontend Row/Empty State/Navigation components and design tokens.
- The optional Destination link on a write-up depends on Epic 1's Destination catalog (Story 1.2) existing, but write-ups are not otherwise coupled to any Trip-related epic (2 or 4).
