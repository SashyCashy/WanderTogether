# Validation Report — WanderTogether

- **DESIGN.md:** `DESIGN.md`
- **EXPERIENCE.md:** `EXPERIENCE.md`
- **Run at:** 2026-09-27

## Overall verdict

The spine pair is structurally sound and usable as a downstream contract: shape fit is textbook-correct, tokens are complete with real hex values, all four PRD user journeys have named Key Flows, and both files avoid bloat or source-restatement. Two categories are thin enough to cause real friction for a downstream consumer — Component coverage (4 of 8 components lack a DESIGN.md visual spec) and State coverage (the "My Trips" surface has no defined states at all, despite being a near-certain empty first-touch screen).

The accessibility lens shifts the picture materially: it found a **critical** color-contrast failure in the sage accent used for eyebrow labels and status tags (the one place the product communicates real state via color+text), plus a near-miss failure in the secondary "ink-soft" text color used almost everywhere. Several interaction patterns (hover-only row actions, the toggle switch, mobile nav collapse) are specified visually/behaviorally but never given the keyboard/ARIA semantics needed to actually meet the spine's own stated "Tab/Enter/Space" floor. None of this requires a rewrite — it's a punch list, and the disciplined parts of the spine (focus treatment, aria-describedby on errors, 44px touch targets, alt-text requirements) are already there.

## Category verdicts
- Flow coverage — Adequate
- Token completeness — Adequate
- Component coverage — Thin
- State coverage — Thin
- Visual reference coverage — Strong
- Bloat & overspecification — Strong
- Inheritance discipline — Adequate
- Shape fit — Strong

## Findings by severity

### Critical (1)
**Accessibility** — Sage accent fails contrast as text everywhere it's used (DESIGN.md colors/Typography.eyebrow/Components tags)
accent #7C9885 on background/surface computes to ≈2.9:1 / ≈3.1:1, vs. 4.5:1 required — used for eyebrow labels and "open to buddies"/"Attached" status tags.
Fix: darken to ~#5C7A67-#4E6B58 for text use, or keep sage decoration-only and use ink for eyebrow/tag text.

### High (4)
**Token completeness** — Accessibility Floor asserts a contrast verification that doesn't exist in DESIGN.md (EXPERIENCE.md L86)
Fix: add actual computed contrast ratios to DESIGN.md's Colors section.

**Component coverage** — Itinerary line, toggle, write-up composer, empty state lack visual specs (EXPERIENCE.md L52-57 / DESIGN.md L138-144)
Fix: add DESIGN.md rows for at least the toggle and the composer.

**State coverage** — "My Trips" has no cold-load, empty, or error state defined (EXPERIENCE.md L22, L65)
Fix: add a row — "No trips yet — start one from Discover, or enter a Trip Code."

**Accessibility** — Hover-revealed row actions have no keyboard fallback (EXPERIENCE.md Interaction Primitives)
Fix: state that secondary row actions become visible on keyboard focus, identically to the touch treatment.

### Medium (10)
**Flow coverage** — UJ-3 never walks FR-7 (marking a trip open to buddies). Fix: add a step 0 or note as pre-condition.
**Flow coverage** — UJ-4 never walks FR-10 (publish a write-up). Fix: add a short publish beat.
**Component coverage** — "Buddy request card" contradicts the design's anti-card rule. Fix: rename to "Buddy request row."
**State coverage** — No generic "listing failed to load" state anywhere. Fix: add one global row.
**Inheritance discipline** — addendum.md cited but not declared as a source. Fix: add to sources: list.
**Inheritance discipline** — "Travel Buddy Request" glossary term drifts in DESIGN.md. Fix: align phrasing.
**Accessibility** — Mobile nav collapse has no accessible name/state spec. Fix: real button trigger, aria-expanded, focus-into-menu.
**Accessibility** — Toggle switch lacks ARIA semantics and is under min. target size. Fix: native-checkbox-styled-as-switch, ≥24×24px.
**Accessibility** — Contradictory/inert input focus spec between the two files. Fix: delete the DESIGN.md "darkens border" line.
**Accessibility** — No live-region announcement for in-page state changes. Fix: note polite live-region announcement.
**Accessibility** — Placeholder-only labeling on search and Trip Code fields. Fix: require persistent visible labels.

### Low (6)
**Component coverage** — Buttons/Tags have no behavioral row in EXPERIENCE.md.
**Visual reference coverage** — Only 2 of 6 IA surfaces have any mockup (acceptable for stakes).
**Inheritance discipline** — Inconsistent capitalization of glossary nouns in DESIGN.md.
**Accessibility** — Mockups use non-semantic markup with no implementer caveat.
**Accessibility** — No heading/landmark structure specified.
**Mechanical** — mockups/discover.html retains its pre-decision title/header comment.

## Reviewer files
- `review-rubric.md`
- `review-accessibility.md`
