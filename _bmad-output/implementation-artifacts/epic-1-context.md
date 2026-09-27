# Epic 1 Context: Discover a Destination and Plan a Trip Together

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Epic 1 delivers a complete, standalone-useful slice: a visitor browses a destination catalog, starts a Trip (or creates one directly) with a name and dates, shares the resulting Trip Code/Link, has a friend open it and set a display name, and the group co-edits a shared itinerary — all with zero accounts, login, or per-member permission differences. It also carries the project's foundational build-out: monorepo scaffold, the complete 7-entity data model (not just Epic 1's needs), seed data, and the shared frontend design-system layer every later epic will reuse.

## Stories

- Story 1.1: Project Scaffold & Data Model Setup
- Story 1.2: Browse and Filter Destinations
- Story 1.3: Start and Create a Trip
- Story 1.4: Join a Trip via Code/Link and Set a Traveler Profile
- Story 1.5: Edit the Shared Itinerary
- Story 1.6: View My Trips

## Requirements & Constraints

- No accounts, login, or persistent cross-trip/cross-device identity — a Trip Code/Link is the sole access mechanism; a valid code grants full view+edit access with no owner-only actions or permission tiers.
- Destination catalog is static/seed content, browsable and filterable (region, trip type) with no login and no page reload on filter change; end users never submit Destinations.
- Starting a Trip from a Destination pre-fills the destination field; a Trip can also be created directly with a name and dates. Creation immediately returns a unique, non-guessable Trip Code/Link, no auth step anywhere.
- Opening a valid Trip Code/Link prompts for a Traveler Profile (freeform display name, not an account) before landing on Trip detail; an invalid/expired code shows a clear inline error, never a blank/broken page.
- Itinerary items (day, title, note) can be added/edited/removed by any Trip member; changes are visible to others on next load; concurrent edits are last-write-wins, no merge/lock UI.
- Success is end-to-end walkability (no dead ends) and genuine functionality, not usage volume or depth in one area at others' expense.
- Deliberately deferred: deployment/hosting, rate-limiting/abuse prevention, real-time collaboration beyond last-write-wins, Trip retention/expiry (Trips live forever), itinerary structure beyond a flat list.
- WCAG 2.2 AA across the whole surface; every flow works end-to-end on phone browsers.

## Technical Decisions

**Stack:** Node.js 24 LTS; `apps/web` = Vite 8.3.0 + React 19.3; `apps/api` = Express 5.2.1, ESM (`"type": "module"`, required by `nanoid` 6). Prisma ORM 7.10.0 with the `@prisma/adapter-better-sqlite3` driver adapter over SQLite (Prisma 7 removed the bare `datasourceUrl` path). TanStack Query 5.103.2 for all frontend server-state (no raw `useEffect`+`fetch`). Zod 4.6.5 validation at the API boundary. `nanoid` 6.0.1 for ids. `multer` ^2.4.0 (min 2.0.2, CVE-2025-7338) for uploads.

**Architecture:** Vertical slices, not layers. Backend `apps/api/src/features/*` (discovery, trips, buddies, write-ups, accommodations); frontend `apps/web/src/features/*` (discover, my-trips, trip-detail, buddies, write-ups — "Join a Trip" lives inside trip-detail). A slice touches another slice's entities only via its exported service function, never a direct query — except seed-only reference data (Destinations), readable directly by any slice.

**Full data model (authored whole upfront — Story 1.1's deliverable, not incremental):** one `schema.prisma` owns all 7 entities: `Trip`, `TripMember`, `Destination`, `ItineraryItem`, `TravelBuddyRequest`, `TripWriteup`, `AccommodationListing`. All ids are bare `nanoid()` except Trip Codes, which use `nanoid` with a 10+ character minimum, URL-safe, non-sequential. Dates are ISO 8601 over the wire, `DateTime` in Prisma. Naming: Prisma models PascalCase singular; REST routes kebab-case plural; JSON fields camelCase; React components PascalCase; slice folders kebab-case.

**Access/membership/mutation rules:** every Trip endpoint takes the Trip Code as a path parameter; a valid code is sufficient authorization, no session/auth model. Responses to a browse context not already holding the code must omit `code` (governs Epic 2's buddies listing, set here as a schema/API-wide rule). Setting a Traveler Profile always creates/upserts a `TripMember` row through one shared `trips.addMember(tripCode, displayName)` function — Epic 2's buddy-accept flow reuses this same function, so it must be a real service call from the start, not inline logic. Itinerary writes are full-resource overwrites with no version/lock check; every other Trip-level field (`openToBuddies`, `buddyNote`, `attachedAccommodationId` — used by later epics) uses PATCH-partial-merge instead, a distinct rule.

**Error handling:** one shared envelope `{ error: { code, message } }`, fixed code vocabulary (`NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `FILE_TOO_LARGE`, `INTERNAL_ERROR`), middleware placed after `multer`; one app-level request logger (method, path, status, duration).

**Frontend query convention:** all Trip reads key off `['trip', tripCode]`; lighter subset views (e.g. My Trips rows) select from that cached query rather than a parallel key.

**Seed data:** Destination catalog and Accommodation dataset come only from one Prisma seed script matching the PRD addendum's shape (`id`, `name`, `destinationId`, `type`, `pricePerNightUSD`, `rating`, `photoUrl`, `description`), including 4 sample Lisbon listings. No runtime create endpoint for either.

**"My Trips":** the backend has no concept of a user's trips. The frontend `shared` layer keeps a `localStorage` index of `{ tripCode: displayName }`, written only on Trip creation and on first successful Traveler Profile submission — never a bare view. This index renders My Trips (via the normal per-Trip GET) and skips re-prompting for a profile on revisit. Config via `.env` + one typed config module, never ad hoc `process.env` reads inside a slice.

## UX & Interaction Patterns

**Visual identity ("Calm Atlas"):** muted palette — cream background, white surface, deep-navy ink for both text and primary actions, sage accent for decoration only (use the darkened `accent-text`/`ink-soft` tokens for AA, not the original lighter ones). Single system font, no serif. Corners sharp to nearly-sharp (2–6px max), no pills, no card/shadow styling; depth comes only from background→surface step plus hairline borders. Spacing tightens on narrow viewports (40px→20px margins, 48px→32px section gaps) rather than shrinking proportionally.

**Core list pattern:** browsable lists (Destinations here) render as hairline-separated rows — left swatch, headline + one-line description, right-aligned metadata — never cards; clicking anywhere opens detail.

**Components:** search/filter input and Trip Code entry need a persistent visible label (never placeholder-only); Trip Code entry validates only on submit. Itinerary line is inline-editable on click, no edit icon, saves on blur/Enter; hover-revealed row actions (e.g. "Remove") must also appear on keyboard focus. Empty-state pattern (headline + one body line, single primary action) repeats everywhere, including "No trips yet" (with "Start a Trip"/"Enter a Trip Code" actions) and the distinct "No results" vs. "Couldn't load this" (retry) states. Top nav: uppercase letter-spaced tabs, active tab underlined, collapsing below 768px to a real `<button>` with accessible name and `aria-expanded`, moving focus into the menu on open.

**Accessibility/responsive:** one focus treatment everywhere (solid 2px ink outline); 44px minimum row click targets; inline errors tied to their field via `aria-describedby`; photos need alt text; `<nav>` is a real landmark with a self-naming `<h1>` per surface. Breakpoints: `≥1024px` full nav + inline metadata; `768–1023px` tightened spacing, same layout; `<768px` collapsed nav menu, stacked row metadata, full-width buttons.

**Interaction/voice:** pagination only, never infinite scroll; no drag-to-reorder, no co-editing indicators, no modal stacks over one level, no native "unsaved changes" dialogs. Copy is calm, direct, plain-spoken — no exclamation points, no emoji, no false urgency (e.g. "This code doesn't match a trip. Check it and try again.").

## Cross-Story Dependencies

- Story 1.1 (scaffold, full schema, seed script, shared error/logging middleware, shared frontend design-system layer) is a hard prerequisite for every other story here and every later epic.
- 1.2 depends on 1.1's Destination seed data.
- 1.3 depends on 1.2 (starting from a Destination row) and 1.1's Trip Code generation; performs the first "My Trips" index write (on creation).
- 1.4 depends on 1.3 (a Trip must exist to join) and implements `trips.addMember`, which Epic 2's buddy-accept story calls directly — must be built as a reusable service call, not inline join logic.
- 1.5 depends on 1.4 (membership exists), though any valid-code holder has identical itinerary edit rights regardless of how they joined.
- 1.6 depends only on the `localStorage` writes made in 1.3 and 1.4 — it renders no data of its own.
- Epic 4's accommodation-attachment feature depends on the `Trip` model and PATCH-partial-merge convention set here.
