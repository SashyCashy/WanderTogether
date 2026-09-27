# Spine Pair Review — WanderTogether

## Overall verdict

The spine pair is structurally sound and usable as a downstream contract: shape fit is textbook-correct, tokens are complete with real hex values, all four PRD user journeys have named Key Flows, and both files avoid bloat/source-restatement. But two categories are thin enough to cause real friction for a downstream consumer — Component coverage (four of eight EXPERIENCE.md components have no DESIGN.md visual spec, and one is misnamed against the design's own anti-card philosophy) and State coverage (the "My Trips" surface has zero defined states, including its very-likely-empty first-visit state). None of the findings block extraction outright, but several would force an architect or story-dev to invent an answer the spine should have committed to.

## 1. Flow coverage — adequate
Checked: PRD UJ-1–UJ-4 against EXPERIENCE.md Key Flows for named protagonist, numbered steps, climax beat, failure path, and full FR realization per UJ.

All four UJs are present with correct protagonist names (Priya, Marcus, Sofia, Priya), numbered steps, and a bolded **Climax** beat. Good skeleton. Gaps are at the FR-realization and failure-path level.

### Findings
- **medium** UJ-3's flow never walks FR-7 (a member marking a Trip "open to buddies") — the flow opens with Sofia browsing Trips that are *already* marked open, so the toggle action PRD lists as part of UJ-3 is never dramatized (EXPERIENCE.md lines 126–132). *Fix:* add a step 0 (a Trip member flips the toggle) or explicitly note it as a pre-condition.
- **medium** UJ-4's flow never walks FR-10 (publish a write-up) — it only shows Priya *reading* a write-up (FR-11) before moving to accommodations; publishing exists only as a behavioral row in Component Patterns ("Write-up composer," line 55), never as a narrated flow, despite PRD UJ-4 explicitly listing FR-10 among the requirements it realizes (EXPERIENCE.md lines 134–139). *Fix:* add a short publish beat, or a fifth micro-flow.
- **low** Failure paths are inconsistently surfaced in Key Flows: only UJ-4 has an explicit "Failure mode" line (141). UJ-2's obvious failure (invalid/expired Trip Code, FR-4) and UJ-3's (buddy request declined, FR-9) are documented in State Patterns but never referenced inline in their own flows (EXPERIENCE.md lines 118–132). *Fix:* add a one-line failure pointer to UJ-2 and UJ-3, matching UJ-4's pattern.

## 2. Token completeness — adequate
Checked: every frontmatter token in DESIGN.md and every `{path.to.token}` reference in both files' prose against that frontmatter.

All 16 color tokens have real hex values (no missing colors — the explicitly critical case). All 6 typography roles, the `rounded` scale, `spacing` scale, and 5 `components` entries are fully specified, and every `{colors.*}`, `{typography.*}`, `{spacing.*}`, `{rounded.*}` reference found in both files' prose resolves to a real frontmatter key. No dangling token references.

### Findings
- **high** EXPERIENCE.md's Accessibility Floor asserts "Visual contrast lives in `DESIGN.md` (navy-on-cream and navy-on-white both verified at WCAG AA)" (line 86), but DESIGN.md contains no contrast ratio, WCAG statement, or verification of any kind anywhere in its Colors or Do's-and-Don'ts sections. This is a load-bearing accessibility claim with nothing behind it in the file it points to. *Fix:* add the actual computed contrast ratios for ink-on-background and ink-on-surface to DESIGN.md's Colors section (both combinations are very likely compliant given the values, but the spine should state it, not assert it lives elsewhere and leave it absent).

## 3. Component coverage — thin
Checked: every component named in either file, cross-referenced for a DESIGN.md visual row (anatomy/sizing/color) and an EXPERIENCE.md behavioral row.

### Findings
- **high** Four of eight EXPERIENCE.md Component Patterns entries have no corresponding visual spec in DESIGN.md's Components section (which only covers Buttons, Rows, Inputs, Tags/badges, Navigation): **Itinerary line** (inline-edit visual state unspecified), **Open-to-buddies toggle** (a toggle/switch control appears in `mockups/trip-detail.html` but is never mentioned as a component type in DESIGN.md — its shape, sizing, and on/off states are only inferable from the mockup, not specified in the spine itself), **Write-up composer** (form/photo-upload layout unspecified), and **Empty state** (layout/placement beyond the typography tokens used is unspecified). (EXPERIENCE.md lines 52–57; DESIGN.md lines 138–144.) *Fix:* add rows for at least the toggle and the composer — the two components with the most visual ambiguity.
- **medium** EXPERIENCE.md names a "**Buddy request card**" (line 54), but DESIGN.md's Brand & Style and Do's-and-Don'ts sections explicitly reject cards ("hairline dividers instead of drop-shadowed cards"; "Don't add drop shadows... they belong to a different (rejected) direction," lines 101, 150), and the actual mockup implements it as `.request-row` — a row, not a card. The behavioral spec's own component name contradicts the visual language it's paired with. *Fix:* rename to "Buddy request row" in EXPERIENCE.md.
- **low** DESIGN.md's Buttons and Tags/badges components have no corresponding behavioral row in EXPERIENCE.md's Component Patterns table (e.g., no disabled/loading button state, no rule for whether tags are ever clickable). Likely low-stakes given how static these are, but technically uncovered.

## 4. State coverage — thin
Checked: each of the 6 IA surfaces against plausible states (empty, cold-load, error, offline/save-failure) given this product has no accounts.

### Findings
- **high** "**My Trips**" is a named IA surface (EXPERIENCE.md line 22) but never appears anywhere in the State Patterns table — no cold-load, empty, or error treatment is defined for it. Given there are no accounts, every new browser session starts with zero trips, making an empty My Trips a near-certain first-touch state, not an edge case. It's also excluded from the "No results" row, which only lists "Discover, Write-ups, Buddies" (EXPERIENCE.md line 65). *Fix:* add a My Trips row — likely "No trips yet — start one from Discover, or enter a Trip Code."
- **medium** No listing surface has a distinct "load/fetch failed" state. "Cold load" (line 63) covers the loading placeholder and "No results" (line 65) covers a legitimate empty filter/dataset result, but neither covers a genuine network/fetch error on Discover, Buddies, Write-ups, or (per the finding above) My Trips. *Fix:* add one global "listing failed to load" row, parallel to the existing "Save failure (any form)" row.

## 5. Visual reference coverage — strong
Checked: every file in `mockups/` and `.working/` against EXPERIENCE.md's inline references.

Both files in `mockups/` (`discover.html`, `trip-detail.html`) are referenced inline in EXPERIENCE.md's Information Architecture section with specific descriptions of what each illustrates, including a call-out that `trip-detail.html` demonstrates the `<768px` responsive collapse — confirmed accurate against the mockup's own media query and inline rationale comment. No orphans. The three `.working/direction-*.html` files are pre-decision exploration drafts (bright-collective, calm-atlas, warm-wanderer) correctly left unreferenced by the finished spine — treating `.working/` as scratch space rather than a deliverable is the right call, not an omission.

### Findings
- **low** Only 2 of 6 IA surfaces (Discover, Trip detail) have any mockup. My Trips, Buddies (as its own surface), Write-ups, and Join a Trip have none — not a spec violation, but those surfaces' visual composition is left to be inferred purely from DESIGN.md's generic Row/Input specs.

## 6. Bloat & overspecification — strong
Checked both files for pixel-spec duplication of tokens, verbatim PRD/brief restatement, prose-where-table-would-serve, unused sections, and decorative narrative untied to a decision.

No PRD personas, FR text, or scope sections are copied wholesale into either file — both consistently point at FR numbers rather than restating them. DESIGN.md's parenthetical pixel restatements (e.g., "{rounded.md} (6px)") mirror the pattern used in the canonical Quill example and aid readability rather than duplicating without cause. EXPERIENCE.md's Key Flow narrative color (e.g., UJ-2's "no merge screen, no 'new changes' banner") stays tied to a real decision (FR-5 last-write-wins) rather than reading as decorative flourish, consistent with the Drift/Quill examples' own use of narrative color in Key Flows specifically.

### Findings
None of consequence.

## 7. Inheritance discipline — adequate
Checked: `sources:` frontmatter resolution, verbatim UJ/FR naming, Glossary terminology parity across both spine files and the PRD, and `{path.to.token}` resolution.

Both files' `sources:` entries resolve to real files (`prd.md`, `brief.md`), UJ protagonist names and FR numbers are used verbatim and correctly (including the subtle FR-5-vs-FR-6 distinction in the Itinerary line row), and all `{path.to.token}` references checked in category 2 resolve correctly.

### Findings
- **medium** EXPERIENCE.md's UJ-4 flow cites "the dummy dataset, per PRD addendum" (line 138), but `addendum.md` is not listed in either file's `sources:` frontmatter — only `prd.md` and `brief.md` are declared, in both DESIGN.md and EXPERIENCE.md. *Fix:* add the addendum to EXPERIENCE.md's `sources:` list, since it's cited by name in the body.
- **medium** Glossary term drift: the PRD's "**Travel Buddy Request**" (§3 Glossary) is used verbatim in EXPERIENCE.md's IA table (line 24), but DESIGN.md never uses the full term — it shortens to "Buddy-request listings" (Components, line 141) and "buddy requests" (Do's and Don'ts, line 148). *Fix:* align DESIGN.md's phrasing to the Glossary term.
- **low** DESIGN.md capitalizes glossary nouns inconsistently within its own body — "Destinations," "Trip Write-ups," "Trip," and "Trip Code" are capitalized correctly in several places, but "destination names, trip names" (Typography, line 120) and "destinations, write-ups, buddy requests" (Do's and Don'ts, lines 148/152) revert to lowercase generic phrasing.

## 8. Shape fit — strong
Checked: DESIGN.md section order against the canonical Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts, and EXPERIENCE.md's required-section presence/order plus optional-section handling.

DESIGN.md's eight sections appear in exactly the canonical order with none omitted. EXPERIENCE.md contains all eight required defaults (Foundation, Information Architecture, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows) in the canonical relative order, with the optional **Responsive & Platform** section correctly present — appropriate and expected, since a recent decision made this product responsive web, and it sits in the canonical slot (after Accessibility Floor, before Key Flows), matching the Drift example's placement. The optional **Inspiration & Anti-patterns** section is dropped; this is defensible for a hobby/portfolio, consumer-lite-stakes project with no real design-lineage narrative to document (unlike Quill/Drift, which use it to justify borrowed/rejected patterns from named competitors) — its absence is not a defect.

### Findings
None.

## Mechanical notes

- All `sources:` paths in both DESIGN.md and EXPERIENCE.md frontmatter resolve to real files on disk (`prd.md`, `brief.md`); `addendum.md` is cited in EXPERIENCE.md's body but not declared as a source (see §7).
- No broken `{path.to.token}` cross-references were found other than the DESIGN.md-side WCAG contrast claim noted in §2 (which is a missing-content issue, not a syntax/resolution issue).
- `mockups/discover.html` retains its pre-decision `<title>Direction: Calm Atlas</title>` and header-comment framing from the `.working/` exploration phase, rather than being retitled to reflect its promoted role as the Discover surface's reference mockup. Cosmetic only — EXPERIENCE.md's own inline reference already supplies the correct framing ("Discover, from the Calm Atlas direction"), so this doesn't create ambiguity for a downstream reader, but it's worth a rename for hygiene.
- Both files' frontmatter (title/status/created/updated/sources — DESIGN.md additionally carries the full token block) is complete with no missing required keys per the design-md-spec.
