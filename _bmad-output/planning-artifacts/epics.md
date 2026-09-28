---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-WanderTogether-2026-09-27/prd.md
  - _bmad-output/planning-artifacts/prds/prd-WanderTogether-2026-09-27/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-WanderTogether-2026-09-27/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-WanderTogether-2026-09-27/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-WanderTogether-2026-09-27/EXPERIENCE.md
---

# WanderTogether - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for WanderTogether, decomposing the requirements from the PRD, UX Design, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Any visitor can browse the Destination catalog and filter it by basic criteria (e.g., region, trip type) — visible with no login required, filtering narrows the list without a page reload.

FR2: Any visitor can start a new Trip directly from a Destination, pre-filling the destination field — creating a Trip produces a unique Trip Code/Link immediately, with no authentication required.

FR3: Any visitor can create a Trip with a name, destination, and dates — a new Trip Code/Link is generated and returned to the creator.

FR4: Any visitor with a valid Trip Code/Link can open that Trip and set a Traveler Profile (display name) for it — an invalid or expired code shows a clear inline error, never a blank/broken page.

FR5: Any member of a Trip can add, edit, or remove basic itinerary items (day, title, note) — changes are visible to other members the next time they load the Trip; concurrent edits resolve last-write-wins, no merge or lock.

FR6: Anyone holding a valid Trip Code/Link can view and edit that Trip; there are no per-member permission levels (no owner-only actions) — a member who joined via buddy request has identical edit rights to the creator. Trip Codes are random, non-sequential slugs (8+ characters), never guessable/incrementing IDs.

FR7: Any member of a Trip can toggle it open to buddies and add a short note (e.g., spots available, what they're looking for).

FR8: Any visitor can browse Trips marked open to buddies and submit a join request with a short message — a submitted request is visible to existing Trip members before it grants any access.

FR9: Any member of the target Trip can accept or decline a pending Travel Buddy Request — accepting adds the requester as a full Trip member with a Traveler Profile; declining removes the request without granting access.

FR10: Any visitor can publish a Trip Write-up (title, text, one or more photos), optionally linked to a Destination.

FR11: Any visitor can browse and read published Trip Write-ups, optionally filtered by Destination.

FR12: Any visitor can browse Accommodation Listings, filterable by a Trip's destination.

FR13: Any member of a Trip can attach one Accommodation Listing to that Trip, visible to all members — attaching a listing never creates a payment, reservation, or external booking-system call.

### NonFunctional Requirements

**None were formally specified in the PRD** — this is a hobby/portfolio-scoped PRD with no Cross-Cutting NFRs section (by deliberate choice, per its own stakes calibration). The closest PRD-level analogues are stated as Non-Goals/constraints rather than quality attributes, so they're listed here for visibility rather than mislabeled as NFRs:

- No user accounts, login, or persistent cross-trip/cross-device identity (PRD §5).
- No real payment processing or real third-party booking/inventory integration (PRD §5).
- No native mobile app — web only (PRD §5).
- No monetization of any kind in v1 (PRD §5).
- No algorithmic travel-buddy matching or compatibility scoring (PRD §5).
- No social feed mechanics: comments, likes, follows, or ranked feeds (PRD §5).
- No user-submitted Destinations to the discovery catalog (PRD §5).

Genuine quality-attribute NFRs (performance, accessibility, security posture) are captured below under UX Design Requirements and Additional Requirements, since that's where they're actually specified (EXPERIENCE.md's Accessibility Floor, Architecture's access-control ADs) — the PRD itself doesn't restate them.

### Additional Requirements

**Starter/scaffold (impacts Epic 1 Story 1):** No named starter template — the Architecture spine specifies a from-scratch monorepo scaffold instead:
- `apps/web` — Vite 8.3.0 + React 19.3 SPA.
- `apps/api` — Node.js 24 LTS + Express 5.2.1, committed to ESM (`"type": "module"`) because `nanoid` 6 is ESM-only.
- Persistence: Prisma ORM 7.10.0 + SQLite, via the explicit `@prisma/adapter-better-sqlite3` driver adapter (Prisma 7 removed the old bare `datasourceUrl` path).
- Frontend data layer: TanStack Query (`@tanstack/react-query`) 5.103.2 for all server-state fetching/caching — no raw `useEffect`+`fetch`.
- Validation: Zod 4.6.5 at the API boundary.
- File uploads: `multer` ^2.4.0 (minimum 2.0.2 — CVE-2025-7338).

**Schema and data model (AD-4, AD-5):** `schema.prisma` must be authored complete — covering Trip, TripMember, Destination, ItineraryItem, TravelBuddyRequest, TripWriteup, AccommodationListing — before feature-slice implementation begins. This is itself a story, not something to build up incrementally per-feature.

**Access model (AD-2, AD-3, AD-7) — affects every Trip-touching story's acceptance criteria:**
- Every Trip endpoint takes the Trip Code as a path parameter; possessing a valid code is sufficient authorization. No session/auth model anywhere.
- Trip Codes are generated via `nanoid`, minimum 10 characters.
- Any endpoint/service function returning Trip data to a discovery/browse context (not yet holding the code) must return a restricted view excluding the `code` field — critical for the Travel Buddies browse listing (FR-8).

**Membership (AD-6):** Setting a Traveler Profile always creates/upserts a persisted `TripMember` row via one shared service function; FR-9's accept flow must call that same function, not a separate path.

**Mutation strategy (AD-8):** Itinerary writes are full-resource overwrites, no locking. Every other Trip-level field (`openToBuddies`, `buddyNote`, `attachedAccommodationId`) uses PATCH-partial-merge instead — a distinct rule, not an extension of itinerary's overwrite behavior.

**Error handling (AD-9):** One error envelope shape (`{ error: { code, message } }`) with a fixed code vocabulary (`NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `FILE_TOO_LARGE`, `INTERNAL_ERROR`) across every endpoint, including `multer` upload failures translated into this vocabulary rather than falling through as generic errors.

**Frontend query convention (AD-10):** All Trip reads key off `['trip', tripCode]` in TanStack Query; a lighter subset view (e.g., My Trips) selects from that cached query rather than defining a parallel key.

**Photo storage (AD-11):** Uploaded photos go to `apps/api/uploads/` via `multer`, referenced from `TripWriteup.photoUrls` (a JSON array of relative URL strings) — no base64-in-DB, no cloud storage.

**Seed data (AD-12):** Destination catalog and Accommodation dataset are populated exclusively by one Prisma seed script matching the PRD addendum's JSON shape (id, name, destinationId, type, pricePerNightUSD, rating, photoUrl, description). No runtime create endpoint for either.

**"My Trips" mechanism (AD-13) — no dedicated FR, but a real IA surface and story:** the frontend maintains a `localStorage` index of `{ tripCode: displayName }`, written only on Trip creation and on first successful Traveler Profile submission (never on a bare view). This index both renders My Trips and skips re-asking for a profile on revisit.

**Buddy-request de-duplication (AD-14):** "One request per person per Trip" is enforced client-side only (a `localStorage` flag) — explicitly not a database uniqueness constraint.

**Deferred (do not build in this pass):** deployment/hosting, rate-limiting/abuse prevention, real-time collaboration beyond last-write-wins, Trip retention/expiry policy, itinerary structure beyond a flat list.

### UX Design Requirements

**Design tokens (DESIGN.md "Calm Atlas"):**

UX-DR1: Implement the full color token set as CSS variables/theme values: `background` (#F7F6F2), `surface` (#FFFFFF), `ink` (#23303B), `ink-soft` (#5C6B76), `accent` (#7C9885, decorative-only — never text), `accent-text` (#4E6B58, the only sage used as text), `border`, `border-strong`, `error` (#B3402D) + `on-error`/`error-container`. Both `ink-soft` and `accent-text` were specifically darkened during accessibility review to clear WCAG AA — implement the darkened values, not the original lighter ones.

UX-DR2: Implement the typography scale (`eyebrow`, `display`, `headline`, `body`, `label`, `caption`) as a single system-font family — no serif, no second typeface anywhere.

UX-DR3: Implement the shape/rounding rule: corners at 2–6px maximum (`rounded.sm`–`rounded.md`); no pill shapes, no heavily rounded cards anywhere in the product.

UX-DR4: Implement the spacing scale with both desktop and mobile variants (`margin-desktop` 40px / `margin-mobile` 20px; `section-gap` 48px / `section-gap-mobile` 32px) — spacing tightens on narrow viewports, layout never just shrinks proportionally.

**Components (DESIGN.md Components + EXPERIENCE.md Component Patterns — implement all of these, not a generic "shared components" story):**

UX-DR5: Row item — the primary list pattern (Destinations, Trip Write-ups, Buddy requests, Accommodations): left swatch/thumbnail, headline + one-line description, right-aligned metadata, hairline-separated, no card/shadow styling.

UX-DR6: Search/filter input — with a persistent visible label (not placeholder-only) on Discover, Buddies, and Write-ups.

UX-DR7: Trip Code entry field — persistent visible label, validates on submit only (no keystroke flicker).

UX-DR8: Itinerary line — inline-editable on click, no visible edit icon, day label + title text.

UX-DR9: Open-to-buddies toggle — track-and-knob switch styled per DESIGN.md, implemented with real `role="switch"`/native-checkbox semantics, `aria-checked`, an associated label, and a minimum 24×24px hit area regardless of the visible track size.

UX-DR10: Buddy request row (not "card" — no card treatment anywhere in this product) with message field + submit for requesters, Accept/Decline actions for Trip members.

UX-DR11: Write-up composer — stacked title/body/photo-slot fields, dashed-border empty photo slots.

UX-DR12: Empty state pattern — headline one-liner + one body line, single primary action when one exists, generous padding, reused identically across every listing surface.

UX-DR13: Top navigation — uppercase letter-spaced tab labels, active tab underlined (never pill-highlighted/filled); collapses to a simple menu below 768px.

**Accessibility (EXPERIENCE.md Accessibility Floor — WCAG 2.2 AA):**

UX-DR14: One focus treatment for every interactive element, including inputs: a solid 2px `ink` outline — this was explicitly reconciled during review to be the single spec (DESIGN.md's inputs section previously described a different, unachievable "darken the border" treatment; that's now removed).

UX-DR15: The Open-to-buddies toggle and the mobile nav trigger need real ARIA semantics — `role="switch"`/`aria-checked` for the toggle; a real `<button>` with an accessible name and `aria-expanded` for the nav trigger, moving focus into the menu on open.

UX-DR16: Same-page updates with no navigation (accepting a buddy request, revealing the note field on toggle) must be announced via a polite live region for screen-reader users.

UX-DR17: Hover-revealed row actions (e.g., "Remove" on an itinerary line) must also appear on keyboard focus — not hover-only.

UX-DR18: All photos carry descriptive alt text; decorative gradient/swatch placeholders use `alt=""`.

UX-DR19: Row click targets are minimum 44px height (touch); the toggle's hit area is minimum 24×24px regardless of visible track size.

UX-DR20: Inline errors (invalid Trip Code, save failures) are associated with their field via `aria-describedby`, not color alone.

UX-DR21: `<nav>` is a real landmark; each surface has an `<h1>` naming itself (e.g., "Discover," the Trip's name).

**Responsive (EXPERIENCE.md Responsive & Platform):**

UX-DR22: Implement all three breakpoints end-to-end, not just visually: `≥1024px` (full nav labels, metadata inline), `768–1023px` (tightened spacing, same layout), `<768px` (nav collapses to a menu, row metadata stacks below the title instead of beside it, buttons go full-width). Every flow must work on a phone browser, not just Discover/reading surfaces.

**Interaction primitives:**

UX-DR23: Pagination (not infinite scroll) on every listing surface.

UX-DR24: No drag-to-reorder, no real-time co-editing indicators (no "X is typing"), no modal stacks deeper than one level, no native browser "unsaved changes" confirm dialogs.

**State patterns (EXPERIENCE.md State Patterns — implement each distinctly, not folded into a generic loading/error state):**

UX-DR25: Cold-load skeleton (row-shaped placeholders) on every listing surface.

UX-DR26: Invalid/expired Trip Code — inline error, no blank/broken page.

UX-DR27: No results (a legitimate empty filter/search result) — distinct from...

UX-DR28: ...Listing failed to load (a genuine fetch/network failure) — these two must not share copy or treatment.

UX-DR29: No trips yet — the default My Trips first-visit state (not an edge case, since every new browser session starts here), with both "start a trip" and "enter a Trip Code" actions.

UX-DR30: Buddy request pending / declined states, on both the requester's and the Trip members' side.

UX-DR31: Accommodation already attached — a one-line replace-confirm before swapping, never a silent multi-attach.

UX-DR32: Save failure (any form) — inline message, input value retained, not cleared.

**Voice and tone (EXPERIENCE.md — applies to every piece of product copy):**

UX-DR33: Calm, direct, plain-spoken microcopy — no exclamation points, no emoji, no false urgency, per the Do/Don't table (e.g., "This code doesn't match a trip. Check it and try again." not "Oops! Something went wrong lol.").

### FR Coverage Map

FR1: Epic 1 - Browse and filter the Destination catalog
FR2: Epic 1 - Start a Trip from a Destination
FR3: Epic 1 - Create a Trip (name, destination, dates)
FR4: Epic 1 - Join a Trip via Code/Link, set a Traveler Profile
FR5: Epic 1 - Edit the shared itinerary
FR6: Epic 1 - Trip access control (code-based, no per-member permissions)
FR7: Epic 2 - Mark a Trip open to buddies
FR8: Epic 2 - Browse open-to-buddies Trips and request to join
FR9: Epic 2 - Accept or decline a buddy request
FR10: Epic 3 - Publish a Trip Write-up
FR11: Epic 3 - Browse and read Trip Write-ups
FR12: Epic 4 - Browse Accommodation Listings
FR13: Epic 4 - Attach an Accommodation Listing to a Trip

No dedicated FR: "My Trips" (client-side index, AD-13) - Epic 1, since it's about tracking/returning to Trips created there.

## Epic List

### Epic 1: Discover a Destination and Plan a Trip Together
Users can browse destinations, start a Trip, share its code/link, and build a shared itinerary together - a complete, standalone-useful product even before buddies, write-ups, or accommodations exist. Also covers the project scaffold (Story 1: monorepo setup, full Prisma schema authored upfront per AD-5, and the Destination/Accommodation seed script per AD-12, since Architecture specifies no off-the-shelf starter template) and the "My Trips" client-side surface (AD-13).
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6

### Epic 2: Find and Add Travel Buddies
A Trip can be opened up to new people, and a stranger can request to join and be accepted - complete and shippable on its own, building on Epic 1's Trips.
**FRs covered:** FR7, FR8, FR9

### Epic 3: Share and Read Trip Write-ups
Anyone can publish and read past-trip write-ups, independent of any specific Trip (only an optional Destination link) - the most standalone epic of the four.
**FRs covered:** FR10, FR11

### Epic 4: Browse and Attach a Place to Stay
A Trip's group can browse accommodation options and settle on one, visible to everyone - building on Epic 1's Trips and Destinations.
**FRs covered:** FR12, FR13

## Epic 1: Discover a Destination and Plan a Trip Together

Users can browse destinations, start a Trip, share its code/link, and build a shared itinerary together - a complete, standalone-useful product even before buddies, write-ups, or accommodations exist.

### Story 1.1: Project Scaffold & Data Model Setup

As a developer setting up the project,
I want the monorepo scaffolded with the full data model and seed data in place,
So that every later story has a working stack and a consistent schema to build against.

**Note:** This is a deliberate exception to the general "create tables only when needed" story-sizing guideline — Architecture's AD-5 explicitly mandates the full Prisma schema be authored whole, upfront, before any slice work begins, to prevent the shape-collision incompatibilities the adversarial architecture review caught.

**Acceptance Criteria:**

**Given** a fresh checkout of the repo
**When** setup runs (dependencies installed, `apps/api` configured as ESM)
**Then** `apps/web` (Vite 8.3.0 + React 19.3) and `apps/api` (Express 5.2.1, Node 24 LTS) both start locally without errors

**Given** `schema.prisma`
**When** it is authored
**Then** it defines all 7 entities (Trip, TripMember, Destination, ItineraryItem, TravelBuddyRequest, TripWriteup, AccommodationListing) per the Architecture ERD (AD-4, AD-5), using `nanoid`-generated string ids (AD-3, Consistency Conventions) and the `@prisma/adapter-better-sqlite3` driver adapter

**Given** `prisma/seed.ts`
**When** it is run
**Then** it populates the Destination catalog and Accommodation dataset matching the PRD addendum's JSON shape (AD-12), including the 4 sample Lisbon accommodation listings

**Given** the shared API layer
**When** it is set up
**Then** it includes the AD-9 error-handling middleware (fixed envelope + code vocabulary) and a request logger, ready for feature slices to use

**Given** DESIGN.md's token set (colors, typography, rounded, spacing — including the desktop/mobile spacing variants)
**When** the frontend `shared` layer is set up
**Then** every token is implemented as a CSS variable/theme value (UX-DR1–UX-DR4), and the shared Row, Empty State, and top Navigation components exist for every feature slice to reuse (UX-DR5, UX-DR12, UX-DR13, UX-DR21) rather than being reimplemented per-slice

**Given** EXPERIENCE.md's Accessibility Floor and Responsive & Platform sections
**When** the frontend `shared` layer is set up
**Then** the single 2px focus-outline treatment (UX-DR14), the 44px/24px touch-target minimums (UX-DR19), and the three responsive breakpoints (`≥1024px` / `768–1023px` / `<768px`, UX-DR22) are established as shared styles/utilities, not reimplemented per-slice
**And** the shared Navigation component's `<768px` mobile trigger is a real `<button>` with an accessible name and `aria-expanded`, moving focus into the menu on open (UX-DR15)

**Given** EXPERIENCE.md's Interaction Primitives and Voice and Tone sections
**When** shared list-rendering and copy conventions are established
**Then** pagination (never infinite scroll) is the default list pattern (UX-DR23), the banned patterns (drag-to-reorder, real-time co-editing indicators, modal stacks over one level, native "unsaved changes" dialogs — UX-DR24) are documented as constraints for every future story, and the calm/plain-spoken Do/Don't voice table (UX-DR33) is the copy baseline all product strings follow

### Story 1.2: Browse and Filter Destinations

As a visitor,
I want to browse and filter the destination catalog,
So that I can find a place my group might want to visit.

**Acceptance Criteria:**

**Given** the Destination catalog has seed data
**When** a visitor opens Discover
**Then** destinations render as hairline rows (no cards) with a swatch, name, and one-line description
**And** a cold-load skeleton shows while fetching

**Given** a visitor applies a filter (region or trip type)
**When** the filter changes
**Then** the visible list narrows without a full page reload

**Given** no destinations match the current filter
**When** the list is empty
**Then** the "No results" empty state renders (headline + one line)
**And** this is visually and textually distinct from a genuine fetch failure, which renders "Couldn't load this" with a retry action

**Given** the catalog is browsed with no accounts in this product
**When** any visitor accesses Discover
**Then** no authentication step is ever required

**Given** the destination search/filter input
**When** rendered
**Then** it carries a persistent visible label, not placeholder-only text (UX-DR6)

### Story 1.3: Start and Create a Trip

As a visitor planning with friends,
I want to start a Trip from a Destination (or create one directly) with a name and dates,
So that my group has a shared place to plan.

**Acceptance Criteria:**

**Given** a visitor is viewing a Destination
**When** they choose "Start a Trip here"
**Then** a Trip-creation form opens with the destination pre-filled, asking for a Trip name and dates

**Given** a visitor submits the Trip-creation form (with or without a pre-filled destination)
**When** the Trip is created
**Then** a unique Trip Code/Link is generated immediately (`nanoid`, 10+ characters, AD-3) and shown to the creator
**And** no authentication step occurs anywhere in the flow

**Given** a Trip is just created
**When** the creator's browser processes the response
**Then** the Trip Code is recorded in the local "My Trips" index (AD-13) immediately — not merely on a later view

### Story 1.4: Join a Trip via Code/Link and Set a Traveler Profile

As a friend who received a Trip link,
I want to open it and set my display name,
So that I can start contributing to the plan.

**Acceptance Criteria:**

**Given** the Trip Code entry field (whether reached via a bare code or a full link)
**When** rendered
**Then** it carries a persistent visible label, not placeholder-only text (UX-DR7), and validates only on submit — no flicker while typing

**Given** a visitor opens a valid Trip Code/Link
**When** they haven't set a Traveler Profile yet for that Trip
**Then** they're prompted for a display name before landing on Trip detail

**Given** a visitor submits a display name for a valid Trip
**When** the submission succeeds
**Then** a persisted `TripMember` row is created via the shared `addMember` function (AD-6)
**And** the local My Trips index picks up this Trip (AD-13)
**And** a visitor who merely views the Trip without submitting a name does not get added to either

**Given** a visitor opens an invalid or expired Trip Code/Link
**When** the app attempts to resolve it
**Then** an inline error appears ("This code doesn't match a trip. Check it and try again."), associated with the field via `aria-describedby`
**And** this never results in a blank or broken page

### Story 1.5: Edit the Shared Itinerary

As a Trip member,
I want to add, edit, or remove itinerary items,
So that the group's plan stays current and visible to everyone.

**Acceptance Criteria:**

**Given** a Trip member is viewing the itinerary
**When** they click an itinerary line to edit it
**Then** it becomes inline-editable with no separate edit icon (UX-DR8), and saves on blur/Enter via a full-resource overwrite with no version/lock check (AD-8)
**And** is visible to other members the next time they load the Trip

**Given** any two Trip members have identical edit rights (no owner-only actions, FR-6)
**When** either one edits the itinerary
**Then** the action succeeds regardless of whether they joined via direct link or an accepted buddy request

**Given** an itinerary line's secondary action (e.g., "Remove") is normally hover-revealed
**When** a user reaches that line via keyboard focus instead of a mouse
**Then** the same action becomes visible identically to the touch/keyboard treatment (UX-DR17) — never hover-only

### Story 1.6: View My Trips

As a returning visitor,
I want to see the Trips I've created or joined,
So that I don't have to keep re-entering codes I've already used.

**Acceptance Criteria:**

**Given** this browser has created or joined at least one Trip (per AD-13's write triggers)
**When** the visitor opens My Trips
**Then** each stored Trip Code renders as a row, looked up via the normal per-Trip GET, reflecting its current name/dates

**Given** this browser has never created or joined a Trip
**When** the visitor opens My Trips for the first time
**Then** the "No trips yet" empty state renders with both a "Start a Trip" and an "Enter a Trip Code" action (UX-DR29)
**And** this is the default state, not an edge case

**Given** the local index only writes on Trip creation or first successful Traveler Profile submission (AD-13)
**When** a visitor merely views a Trip link without submitting a name
**Then** that Trip does not appear in My Trips

## Epic 2: Find and Add Travel Buddies

A Trip can be opened up to new people, and a stranger can request to join and be accepted - complete and shippable on its own, building on Epic 1's Trips.

### Story 2.1: Mark a Trip Open to Buddies

As a Trip member,
I want to mark my Trip open to buddies with a note,
So that outside travelers can find and request to join.

**Acceptance Criteria:**

**Given** a Trip member viewing Trip detail
**When** they switch on "Open to buddies"
**Then** a short note field appears
**And** the Trip becomes listed on the Buddies browse surface

**Given** the toggle is implemented as a real switch
**When** rendered
**Then** it exposes `role="switch"`/`aria-checked` and a programmatically associated label (UX-DR9, UX-DR15)
**And** the note-field reveal is announced via a polite live region for screen-reader users (UX-DR16)

**Given** a member switches the toggle off
**When** it's off
**Then** the Trip is removed from the Buddies listing
**And** any already-submitted pending requests remain untouched, not silently deleted

### Story 2.2: Browse Open Trips and Request to Join

As a traveler without a group,
I want to browse Trips open to buddies and submit a join request,
So that I can find a group to travel with.

**Acceptance Criteria:**

**Given** Trips are marked open to buddies
**When** a visitor browses the Buddies surface
**Then** each Trip renders as a row showing its note and open-slot info
**And** the Trip Code is never included in this response shape (AD-7) — the critical fix preventing a browse-context leak of the access credential

**Given** a visitor opens one such Trip's request form
**When** they submit a short message
**Then** the request becomes visible to existing Trip members before it grants any access (FR8)
**And** the requester gains no access from submitting alone

**Given** this browser has already submitted a request to this Trip
**When** they view it again
**Then** the request form is hidden client-side (AD-14) — best-effort only, not a server-enforced constraint

**Given** a request was just submitted
**When** the requester views their own submission
**Then** they see "Request sent — waiting on the group" (UX-DR30) — a distinct state from the trip-member-facing pending-requests list

**Given** a request was declined
**When** the requester returns to that Trip via the same link/session
**Then** they see "This request was declined" (UX-DR30) — with no proactive notification mechanism, an accepted gap given there are no accounts

### Story 2.3: Accept or Decline a Buddy Request

As a Trip member,
I want to accept or decline a pending buddy request,
So that I control who joins my Trip.

**Acceptance Criteria:**

**Given** a pending Travel Buddy Request on a Trip
**When** any member clicks Accept
**Then** the requester is added as a full Trip member via the same shared `addMember` function Story 1.4 uses (AD-6)
**And** the new member has identical edit rights to everyone else

**Given** a pending request
**When** a member clicks Decline instead
**Then** the request is removed without granting any access
**And** no `TripMember` row is created

**Given** the accept action updates the pending-requests list in place
**When** it succeeds
**Then** the change is announced via a polite live region for screen-reader users (UX-DR16), not communicated by a visual disappearance alone

## Epic 3: Share and Read Trip Write-ups

Anyone can publish and read past-trip write-ups, independent of any specific Trip (only an optional Destination link) - the most standalone epic of the four.

### Story 3.1: Publish a Trip Write-up

As a visitor,
I want to publish a write-up about a past trip,
So that I can share the experience with others.

**Acceptance Criteria:**

**Given** a visitor opens the Write-up composer
**When** they fill in a title, body text, and one or more photos (optionally linking a Destination)
**Then** submitting publishes the write-up
**And** photos are written to `apps/api/uploads/` via `multer` and referenced from `TripWriteup.photoUrls` (AD-11) — never stored as base64 or on a cloud service

**Given** a photo upload exceeds the size limit or has an invalid type
**When** `multer` rejects it
**Then** the error is translated into the AD-9 error-code vocabulary (e.g. `FILE_TOO_LARGE`) rather than falling through as a generic internal error
**And** it's shown inline without clearing the rest of the form (UX-DR32)

**Given** a Trip Write-up is not linked to any Trip record (per PRD Glossary)
**When** published
**Then** it exists independently of any specific Trip — no Trip Code or membership is required to publish

### Story 3.2: Browse and Read Trip Write-ups

As a visitor,
I want to browse and read published write-ups, optionally filtered by destination,
So that I can learn from other travelers before committing to a place.

**Acceptance Criteria:**

**Given** published write-ups exist
**When** a visitor opens Write-ups
**Then** they render as hairline rows (title, destination, snippet) with a cold-load skeleton while fetching

**Given** a visitor filters by Destination
**When** applied
**Then** only write-ups linked to that Destination show
**And** write-ups with no Destination link are excluded from a Destination-filtered view but visible in the unfiltered list

**Given** no write-ups exist yet for a Destination
**When** the list is empty
**Then** the "No write-ups yet" empty state renders
**And** no comments/likes/follow affordances exist anywhere (PRD Non-Goals)

**Given** a write-up's photos are displayed
**When** rendered
**Then** each carries descriptive alt text (UX-DR18)

## Epic 4: Browse and Attach a Place to Stay

A Trip's group can browse accommodation options and settle on one, visible to everyone - building on Epic 1's Trips and Destinations.

### Story 4.1: Browse Accommodation Listings

As a Trip member,
I want to browse accommodation listings filtered by my Trip's destination,
So that I can pick a place to stay.

**Acceptance Criteria:**

**Given** the Accommodation dataset is seeded (Story 1.1)
**When** a Trip member opens the Accommodations panel on Trip detail
**Then** listings filtered to the Trip's destination render as hairline rows (name, price, rating), with a cold-load skeleton while fetching

**Given** no listings exist for a destination
**When** the list is empty
**Then** "No results" renders, distinct from a genuine fetch failure ("Couldn't load this")

**Given** the catalog is seed-only (AD-12)
**When** any visitor browses
**Then** no create/edit affordance for listings exists anywhere in the UI

### Story 4.2: Attach an Accommodation Listing to a Trip

As a Trip member,
I want to attach one accommodation listing to my Trip,
So that the group has a shared answer for where to stay.

**Acceptance Criteria:**

**Given** a Trip member selects a listing
**When** they attach it
**Then** the Trip's `attachedAccommodationId` updates via a PATCH-partial-merge request (AD-8) — never a full-Trip overwrite that could clobber the itinerary or open-to-buddies state

**Given** attaching a listing
**When** the request completes
**Then** no payment, reservation, or external booking-system call is ever made (FR13) — it is a pure data attachment

**Given** a Trip already has an accommodation attached
**When** a member selects a different listing
**Then** a one-line confirm ("Replace {current} with {new}?") appears before swapping (UX-DR31) — never silently allowing two attachments
