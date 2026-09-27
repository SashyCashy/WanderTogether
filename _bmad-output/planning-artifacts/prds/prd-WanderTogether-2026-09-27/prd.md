---
title: "PRD: WanderTogether"
status: final
created: 2026-09-27
updated: 2026-09-27
---

# PRD: WanderTogether
*Working title — confirm.*

## 0. Document Purpose

This PRD translates the finalized [Product Brief](../../briefs/brief-WanderTogether-2026-09-27/brief.md) into requirements ready for UX and architecture work. It is a portfolio/learning artifact built to practice the BMAD method end-to-end, not a commercial spec — scope and rigor are scaled accordingly (~2 pages, one MVP tier, no phased roadmap). Features are grouped with FRs nested and globally numbered; `[ASSUMPTION]` tags are inline and indexed in §9. Platform is a single surface: a React-based web application, no native mobile.

## 1. Vision

WanderTogether is a web app where a group of friends plans a trip together in one place, instead of five. It combines destination discovery, collaborative group planning, travel-buddy requests, trip write-ups, and accommodation browsing into one flow, so a group can go from "we should go somewhere" to a shared, bookable-ready plan without leaving the product.

`[ASSUMPTION]` To keep the build tutorial-scoped, WanderTogether skips accounts and login entirely. A trip is reached through a shareable code or link, and each person sets a display name for that trip — group access without an auth system. This is a deliberate simplification, not a hidden gap: it shapes several FRs below and is called out explicitly rather than assumed away.

## 2. Target User

### 2.1 Jobs To Be Done

- Get a group of 3–6 friends aligned on where to go and when, without the plan fragmenting across a group chat, a doc, and someone's memory.
- Pull travel inspiration directly into a plan instead of screenshotting it from elsewhere.
- Bring in an extra person (a travel buddy) to fill out the group or split costs, without relying on word of mouth.
- Read real trip write-ups from other travelers before committing to a destination.
- Land on a place to stay without leaving the trip plan to shop for it separately.

### 2.2 Non-Users (v1)

- Solo travelers with no group to coordinate — the product's core value is the shared, collaborative plan.
- Anyone needing a persistent cross-trip identity, saved history across devices, or account-based features (out of scope — see §5).

### 2.3 Key User Journeys

*Lighter form, per hobby/solo scope: `{Persona}, {context}, {what they do and why}`.*

- **UJ-1.** Priya, planning this year's friend trip, browses the destination catalog and starts a Trip with a few taps — no signup — then shares the Trip Code/Link with her friends. Realizes FR-1, FR-2, FR-3.
- **UJ-2.** Marcus, opening Priya's link cold, sets a Traveler Profile and adds his own line to the shared itinerary, which Priya sees next time she opens the Trip. Realizes FR-4, FR-5.
- **UJ-3.** Sofia, without a group of her own, browses Trips open to buddies and requests to join one — becoming a full member once accepted. Realizes FR-7, FR-8, FR-9.
- **UJ-4.** Priya, deciding between destinations, reads another traveler's write-up, then browses and attaches an accommodation listing to her Trip — all without leaving the product. Realizes FR-10, FR-11, FR-12, FR-13.

## 3. Glossary

- **Trip** — A planned trip created by one user, holding a destination, dates, an itinerary, members, and (optionally) an attached accommodation listing.
- **Trip Code / Trip Link** — The shareable identifier used to reach and edit a Trip. Possession of the code/link is the only access control in v1 (see FR-6).
- **Traveler Profile** — A freeform display name a person sets when they open a Trip. Not an account; not persisted across Trips or devices.
- **Destination** — A static, curated catalog entry (place + short description) that can be browsed and used to start a Trip.
- **Travel Buddy Request** — A request from a person outside a Trip to join it, submitted against a Trip marked open to buddies.
- **Trip Write-up** — A text-plus-photo post about a past trip experience, optionally linked to a Destination.
- **Accommodation Listing** — A static/mock hotel or hostel entry that can be browsed and attached to a Trip.

## 4. Features

### 4.1 Destination Discovery
**Description:** Users browse a curated catalog of destinations and trip ideas and can jump straight from a Destination into starting a Trip. Realizes UJ-1. `[ASSUMPTION]` The catalog is static/seed content maintained by the builder — end users cannot submit new Destinations in v1.

**Functional Requirements:**

#### FR-1: Browse and filter destinations
Any visitor can browse the Destination catalog and filter it by basic criteria (e.g., region, trip type). Realizes UJ-1.

**Consequences (testable):**
- Catalog is visible with no login required.
- Filtering narrows the visible list without a page reload requirement.

#### FR-2: Start a trip from a destination
Any visitor can start a new Trip directly from a Destination, pre-filling the destination field. Realizes UJ-1.

**Consequences (testable):**
- Creating a Trip produces a unique Trip Code/Link immediately.
- The creator does not need to authenticate to create a Trip.

**Out of Scope:** Personalized or algorithmic recommendations (§5).

### 4.2 Group Trip Planning
**Description:** A Trip is a shared space a group edits together: destination, dates, and a basic itinerary. Access is via Trip Code/Link rather than accounts. Realizes UJ-1, UJ-2.

**Functional Requirements:**

#### FR-3: Create a trip
Any visitor can create a Trip with a name, destination, and dates. Realizes UJ-1.

**Consequences (testable):**
- A new Trip Code/Link is generated and returned to the creator.

#### FR-4: Join a trip via code/link
Any visitor with a valid Trip Code/Link can open that Trip and set a Traveler Profile (display name) for it. Realizes UJ-2.

**Consequences (testable):**
- An invalid or expired code shows a clear error rather than a blank/broken page.

#### FR-5: Edit the shared itinerary
Any member of a Trip can add, edit, or remove basic itinerary items (day, title, note). Realizes UJ-2.

**Consequences (testable):**
- Changes are visible to other members the next time they load the Trip.
- Concurrent edits resolve last-write-wins `[ASSUMPTION]` — no merge or lock.

#### FR-6: Trip access control
Anyone holding a valid Trip Code/Link can view and edit that Trip; there are no per-member permission levels (no owner-only actions) in v1. `[ASSUMPTION]`

**Consequences (testable):**
- A member who joined via buddy request (FR-8) has identical edit rights to the creator.
- Trip Codes are random, non-sequential slugs (e.g., 8+ characters) rather than guessable/incrementing IDs, since the code is the sole access control. `[ASSUMPTION]`

**Out of Scope:** Real-time co-editing/live sync, granular per-member permissions, account-based identity (§5).

### 4.3 Travel Buddies
**Description:** A Trip's members can mark it open to outside travelers, and other users can request to join. This is manual browse-and-request, not algorithmic matching. Realizes UJ-3.

**Functional Requirements:**

#### FR-7: Mark a trip open to buddies
Any member of a Trip can toggle it open to buddies and add a short note (e.g., spots available, what they're looking for). Realizes UJ-3.

#### FR-8: Browse and request to join
Any visitor can browse Trips marked open to buddies and submit a join request with a short message. Realizes UJ-3.

**Consequences (testable):**
- A submitted request is visible to existing Trip members before it grants any access.

#### FR-9: Accept or decline a buddy request
Any member of the target Trip can accept or decline a pending Travel Buddy Request. Realizes UJ-3.

**Consequences (testable):**
- Accepting a request adds the requester as a full Trip member (per FR-6) with a Traveler Profile.
- Declining removes the request without granting access.

**Out of Scope:** Compatibility scoring or algorithmic matching (§5); blocking/reporting abusive requests (§8 Open Questions).

### 4.4 Trip Write-ups
**Description:** Users share and read text-plus-photo accounts of past trips, browsable independent of any specific active Trip. Realizes UJ-4.

**Functional Requirements:**

#### FR-10: Publish a write-up
Any visitor can publish a Trip Write-up (title, text, one or more photos) optionally linked to a Destination. Realizes UJ-4.

#### FR-11: Browse and read write-ups
Any visitor can browse and read published Trip Write-ups, optionally filtered by Destination. Realizes UJ-4.

**Out of Scope:** Comments, likes, follows, or any feed-ranking mechanics (§5).

### 4.5 Accommodations
**Description:** Users browse a static/mock catalog of hotel and hostel listings and attach one to a Trip. No real booking or payment occurs. Realizes UJ-4. `[ASSUMPTION]` The catalog is backed by a dummy dataset the builder creates (not a real inventory provider) — sample shape in `addendum.md`.

**Functional Requirements:**

#### FR-12: Browse accommodation listings
Any visitor can browse Accommodation Listings, filterable by a Trip's destination. Realizes UJ-4.

#### FR-13: Attach a listing to a trip
Any member of a Trip can attach one Accommodation Listing to that Trip, visible to all members. Realizes UJ-4.

**Consequences (testable):**
- Attaching a listing does not create any payment, reservation, or external booking-system call.

**Out of Scope:** Real inventory/availability data, payment processing, booking confirmation flows (§5).

## 5. Non-Goals (Explicit)

- No user accounts, login, or persistent cross-trip/cross-device identity.
- No real payment processing or real third-party booking/inventory integration.
- No algorithmic travel-buddy matching or compatibility scoring.
- No social feed mechanics: comments, likes, follows, or ranked feeds.
- No native mobile app — web only.
- No monetization of any kind in v1.
- No user-submitted Destinations to the discovery catalog.

## 6. MVP Scope

### 6.1 In Scope
- Destination discovery (browse/filter a static catalog)
- Trip creation, join-by-code/link, shared itinerary editing
- Travel buddy open-flag, request, accept/decline
- Trip write-ups: publish and browse
- Accommodation listings: browse and attach to a Trip (no booking/payment)

### 6.2 Out of Scope for MVP
See §5 Non-Goals — all items there are full v1 exclusions, not deferred phases, since this project has no planned v2.

## 7. Success Metrics

Success here is about proving the concept holds together end to end, not usage volume:

**Primary**
- **SM-1**: A reviewer can walk one Trip from destination discovery through a buddy request through a write-up read through an attached accommodation, with no dead end or disconnected feature. Validates FR-1–FR-13.
- **SM-2**: All 5 features (§4.1–4.5) are genuinely functional — not stubbed or faked. Validates FR-1–FR-13.

**Counter-metrics (do not optimize)**
- **SM-C1**: Depth in any single pillar at the expense of the others. The goal is breadth across all 5 features, not a fully-built pillar next to stubbed ones. Counterbalances SM-2.

## 8. Open Questions

1. Should there be any spam/abuse guard on public Travel Buddy Requests and Trip Write-ups, given there's no account system to ban or rate-limit against? *(Deferred — non-blocker for a portfolio-scale project; revisit if the build is ever exposed publicly.)*
2. Should a Trip's itinerary support any structure beyond a flat list (e.g., grouping by day)? Brief and this PRD assume a flat list is enough for MVP. *(Deferred — non-blocker; revisit if UX work surfaces a real need.)*

## 9. Assumptions Index

- §1 — No accounts/login; Trip access is via shareable code/link with a per-Trip freeform display name.
- §4.1 — Destination catalog is static/seed content; end users cannot submit new Destinations.
- §4.2 (FR-5) — Concurrent itinerary edits resolve last-write-wins; no locking or live sync.
- §4.2 (FR-6) — Access control is link-as-auth: no per-member permission levels in v1.
- §4.2 (FR-6) — Trip Codes are random, non-sequential slugs (8+ characters) rather than guessable IDs.
- §4.5 — Accommodation catalog is a dummy dataset created by the builder, not a real inventory provider (sample shape in `addendum.md`).
