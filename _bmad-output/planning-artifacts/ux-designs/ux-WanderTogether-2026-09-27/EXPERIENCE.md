---
title: "EXPERIENCE.md: WanderTogether"
status: final
created: 2026-09-27
updated: 2026-09-27
sources:
  - ../../prds/prd-WanderTogether-2026-09-27/prd.md
  - ../../prds/prd-WanderTogether-2026-09-27/addendum.md
  - ../../briefs/brief-WanderTogether-2026-09-27/brief.md
---

# WanderTogether — Experience Spine

## Foundation

Responsive web, single surface, no native app. `DESIGN.md` (Calm Atlas) is the visual identity reference; this spine is the behavioral one. No accounts or login — a Trip is reached via a Trip Code/Link and each person sets a Traveler Profile (display name) for that Trip (PRD §1, §4.2). Works across desktop, tablet, and phone browsers; see **Responsive & Platform** for breakpoint behavior.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Discover | Top nav (default landing) | Browse/filter the Destination catalog (FR-1); start a Trip from a Destination (FR-2) |
| My Trips | Top nav | Trips the current browser session has created or joined; entry point to a Trip's shared plan |
| Trip detail | My Trips row / Trip Code-Link | Shared itinerary (FR-5), open-to-buddies toggle (FR-7), attached Accommodation (FR-13) |
| Buddies | Top nav | Cross-trip browse of Trips marked open to buddies (FR-8); submit/track a Travel Buddy Request |
| Write-ups | Top nav | Browse and read Trip Write-ups (FR-11); publish a new one (FR-10) |
| Join a Trip | Direct link, or "Have a code?" entry point from Discover/My Trips | Enter/resolve a Trip Code, set a Traveler Profile, land in Trip detail |

Buddies stays a top-level tab rather than living inside a single Trip, because browsing *across* all open Trips is itself a discovery action, not a within-Trip one.

→ Composition reference: `mockups/discover.html` (Discover, from the Calm Atlas direction) and `mockups/trip-detail.html` (Trip detail — itinerary, buddies, accommodation together; also demonstrates the `< 768px` responsive collapse). Spine wins on conflict — and specifically, both mockups show visual composition only: nav items are marked up as plain `span`s for layout speed, not as the real link/button semantics required by **Accessibility Floor** below (the Open-to-buddies toggle in `trip-detail.html` does model the real `button role="switch"` + `aria-checked` semantics, as a reference for that pattern).

## Voice and Tone

Microcopy only — aesthetic posture lives in `DESIGN.md.Brand & Style`. Calm, direct, plain-spoken. No exclamation points, no emoji, no false urgency.

| Do | Don't |
|---|---|
| "No account needed — start a Trip and share the link." | "Sign up now to start planning your dream trip! 🎉" |
| "2 spots open on this trip." | "Hurry, only 2 spots left!!" |
| "Request sent." | "Yay! Your request is on its way! ✨" |
| "This code doesn't match a trip. Check it and try again." | "Oops! Something went wrong lol." |
| "No write-ups yet for Lisbon." | "Nothing here... yet! Be the first! 🚀" |

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Row item | Discover, Write-ups, Buddies listings | Click anywhere on the row opens the detail (Destination, Write-up, or Trip). No separate "view" button. |
| Search/filter input | Discover, Buddies, Write-ups | Carries a persistent visible label (e.g. a small caption above the field) in addition to any placeholder text — placeholder alone is not a label. |
| Trip Code entry | Join a Trip | Single text field with a persistent visible label (not placeholder-only) + submit. Validates on submit, not on keystroke — no flicker while typing. |
| Itinerary line | Trip detail | Inline-editable on click (title, day, note); blur or Enter saves. Any Trip member can edit or remove any line (FR-6). |
| Open-to-buddies toggle | Trip detail | On: reveals a short note field and immediately lists the Trip on the Buddies surface. Off: removes it from Buddies but does not affect pending requests already submitted. Implemented with real switch/checkbox semantics (`role="switch"` or native checkbox), `aria-checked`, and a programmatically associated label — see Accessibility Floor. |
| Buddy request row | Buddies (submitting), Trip detail (reviewing) | Submitting: message field + submit, one request per person per Trip. Reviewing: Accept / Decline actions visible only to existing Trip members. Same hairline row pattern as everything else — no card treatment (see `DESIGN.md.Do's and Don'ts`). |
| Write-up composer | Write-ups | Title, text, one or more photos, optional Destination link. No draft-saving in v1 — a lost in-progress write-up is an accepted gap at this stage. |
| Accommodation row | Trip detail (browsing) | Same row pattern as Discover; selecting one replaces any previously attached listing rather than allowing multiple. |
| Empty state | Any listing surface | `typography.headline` one-liner + one line of body text. Single primary action when one exists (e.g., "Start a Trip"), none when there isn't (e.g., no write-ups yet). |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Cold load | Any listing | Row-shaped skeleton placeholders (4-6), matching final row layout, resolving on data. |
| Invalid/expired Trip Code | Join a Trip | Inline error under the field, `colors.error`: "This code doesn't match a trip. Check it and try again." No redirect, no blank page (PRD FR-4). |
| No results | Discover, Write-ups, Buddies | Headline + one line, no illustration. e.g., "No destinations match these filters." |
| No trips yet | My Trips | This is the default first-visit state, not an edge case — no accounts means every new browser session starts here. Headline: "No trips yet." Body: "Start one from Discover, or enter a Trip Code." Both actions available as primary/secondary buttons. |
| Listing failed to load | Discover, My Trips, Buddies, Write-ups | Distinct from "No results" — a genuine fetch/network failure. Headline: "Couldn't load this." One-line retry action, same {typography.headline}/{typography.body} empty-state pattern. |
| Concurrent itinerary edit | Trip detail | No conflict UI in v1 — last save wins silently (PRD FR-5 `[ASSUMPTION]`). A member reopening the Trip simply sees the latest saved state. |
| Buddy request pending | Buddies, Trip detail | Requester sees "Request sent — waiting on the group." Trip members see it in a small pending-requests list on Trip detail. |
| Buddy request declined | Buddies (requester's view only, if they return via the same link/session) | "This request was declined." No notification mechanism in v1 (no accounts to notify). |
| Accommodation already attached | Trip detail | Selecting a new listing shows a one-line confirm: "Replace {current listing} with {new listing}?" before swapping. |
| Save failure (any form) | Global | Inline message at the field: "Didn't save. Try again." Input value is retained, not cleared. |

## Interaction Primitives

**Click-first, not keyboard-first.** This is a general consumer surface, not a power-user tool — mouse/touch is primary, keyboard access is a floor (see Accessibility), not the design center.

- Click anywhere on a row to open its detail — no separate "view" affordance.
- Hover reveals secondary row actions (e.g., "Remove" on an itinerary line) on pointer devices; touch surfaces these actions via a persistent icon instead of hover. On keyboard focus, the same action becomes visible identically to the touch treatment — hover is never the only way to discover it.
- Pagination, not infinite scroll, on every listing surface — consistent with the calm, deliberate register in `DESIGN.md`.
- No drag-to-reorder anywhere in v1 (itinerary order is add-order; reordering is a candidate future addition, not a v1 primitive).
- No real-time co-editing indicators (no "Marcus is typing") — the product doesn't claim live collaboration it doesn't have (FR-5 last-write-wins).

**Banned everywhere:** infinite scroll, drag-to-reorder, modal stacks more than one level deep, any "unsaved changes" browser-native confirm dialog (forms save on blur/submit, not on navigate-away).

## Accessibility Floor

Behavioral. Visual contrast lives in `DESIGN.md.Colors` (ink, ink-soft, and accent-text are each verified at WCAG AA against both background and surface — see the "Contrast (verified)" line there; the base `accent` sage is decoration-only and exempt).

- WCAG 2.2 AA across the full responsive surface.
- Every interactive element (rows, toggles, buttons, form fields) is reachable and operable via `Tab` / `Enter` / `Space`, even though the design center is pointer-first.
- Focus state is a solid 2px `colors.ink` outline — the single focus spec for every element, including inputs (see `DESIGN.md.Components`, which points back here) — visible against both `background` and `surface`.
- The Open-to-buddies toggle uses real switch semantics (`role="switch"` or a native checkbox), exposes `aria-checked`, carries a programmatically associated label, and has a minimum 24×24px hit area regardless of the visible track size (WCAG 2.5.8).
- The mobile nav trigger (`< 768px`, see Responsive & Platform) is a real button with a visible or `aria-label`'d accessible name and `aria-expanded`; opening it moves focus into the menu.
- Same-page updates with no navigation (accepting a buddy request, revealing the note field on toggle) are announced to screen readers via a polite live region — a sighted user sees the row change; a screen-reader user needs the equivalent (WCAG 4.1.3).
- All Destination and Write-up photos carry descriptive alt text; decorative swatches (e.g., gradient placeholders) are marked `alt=""`.
- Row click targets are large enough for touch (44px minimum height) even where visual padding looks tighter on desktop.
- Inline errors (invalid Trip Code, save failure) are associated with their field via `aria-describedby`, not color alone.
- Form fields (Trip Code entry, Discover/Buddies/Write-ups search) carry a persistent visible label, not placeholder-only text — a placeholder disappears the moment someone starts typing.
- Nav is a real `<nav>` landmark; each surface's `<h1>` names the surface itself (e.g., "Discover," "Lisbon Friends Trip") so screen-reader users navigating by heading get the same orientation a sighted user gets from the page title.

## Responsive & Platform

| Breakpoint | Behavior |
|---|---|
| `≥ 1024px` (desktop) | Top nav shows all four tab labels inline. Row metadata (price, rating) sits right-aligned on the same line as the title. |
| `768–1023px` (tablet) | Top nav labels remain but tighten spacing per `DESIGN.md` mobile spacing tokens. Row layout unchanged. |
| `< 768px` (phone) | Top nav collapses to a simple menu (label + icon, no persistent tab bar). Row metadata stacks below the title instead of sitting beside it, per `DESIGN.md.Layout & Spacing`. Buttons go full-width. |

WanderTogether is responsive web throughout — every flow below works end to end on a phone browser, not just discovery/reading.

## Key Flows

Named protagonists and IDs mirror the PRD's Key User Journeys (PRD §2.3) — this spine adds the concrete screen-level behavior underneath each one.

### UJ-1 — Priya finds a destination and starts a trip

1. Priya opens WanderTogether; Discover is the default landing surface, no login prompt anywhere.
2. She browses/filters the Destination catalog (row list, per `DESIGN.md`).
3. She opens Lisbon's row, reads the short description, and clicks "Start a Trip here."
4. A short form asks for a Trip name and dates; submitting creates the Trip.
5. **Climax:** The Trip detail screen appears immediately with a visible, copyable Trip Code/Link at the top — no signup screen ever interrupted the path from browsing to having something shareable.
6. She copies the link to share elsewhere (outside the product).

### UJ-2 — Marcus joins the trip and adds to the plan

1. Marcus opens the link Priya sent, on his phone.
2. Join a Trip resolves the code automatically from the link and asks him to set a Traveler Profile (display name).
3. He lands on Trip detail — the same shared itinerary Priya sees, stacked for his phone width.
4. He taps into an empty itinerary line, types an activity, and it saves on blur.
5. **Climax:** The next time Priya opens the Trip (any device, no push notification), Marcus's line is simply there in the shared list — no merge screen, no "new changes" banner, just the current state.

Failure mode: if the link is stale or mistyped, Marcus sees the Invalid/expired Trip Code state (see State Patterns) at step 2 — a clear inline message, not a blank or broken page.

### UJ-3 — Sofia looks for a travel buddy to join an existing trip

0. *(Pre-condition, realizes FR-7)* Before Sofia can find it, a member of the Lisbon trip — say, Priya — flips the Open-to-buddies toggle on Trip detail and adds the note: "2 spots, need someone chill about hostels." The trip now appears on the Buddies surface.
1. Sofia, without a group, opens the Buddies tab.
2. She browses Trips marked open to buddies (row list) and opens the Lisbon trip, reading Priya's note.
3. She submits a request with a short message.
4. On the Trip side, a member sees the pending request on Trip detail and clicks Accept.
5. **Climax:** Sofia's next visit to that Trip (via a link a member sends her) shows the full shared plan — she now has identical edit rights to everyone else on the Trip, with no separate "guest" state.

Failure mode: if a member declines instead, Sofia's request shows the Buddy request declined state (see State Patterns) if she returns via the same link — there's no notification mechanism to alert her proactively, an accepted gap given there are no accounts.

### UJ-4 — Priya reads a write-up, picks a place to stay, then writes her own

1. Later in planning, Priya opens Write-ups and filters by Lisbon.
2. She reads one traveler's post (text + photos) and returns to her Trip.
3. On Trip detail, she opens the Accommodations panel, browses listings filtered to Lisbon (the dummy dataset, per PRD addendum), and selects one.
4. **Climax:** The Trip detail screen now shows destination, dates, itinerary, and a chosen place to stay in one continuous view — Marcus sees the same thing next time he opens the link, with no separate booking site ever involved.
5. *(Realizes FR-10)* Weeks later, back from the trip, Priya opens the Write-up composer herself — title, a few lines, a couple of photos, linked to Lisbon — and publishes it.
6. **Climax (return):** Her post now sits in the same Lisbon list she read from at step 1 — she's gone from reading someone else's trip to being the one a future Sofia or Marcus reads before their own trip.

Failure mode: if Priya tries to attach a second accommodation listing later, she gets the one-line replace-confirm from **State Patterns** rather than silently ending up with two attached accommodations.
