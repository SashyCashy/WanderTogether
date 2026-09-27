---
title: "DESIGN.md: WanderTogether"
status: final
created: 2026-09-27
updated: 2026-09-27
sources:
  - ../../prds/prd-WanderTogether-2026-09-27/prd.md
  - ../../prds/prd-WanderTogether-2026-09-27/addendum.md
  - ../../briefs/brief-WanderTogether-2026-09-27/brief.md
name: Calm Atlas
description: A calm, minimal, map-inspired identity for a group trip-planning web app — trustworthy and quiet rather than social/energetic.
colors:
  background: '#F7F6F2'
  surface: '#FFFFFF'
  surface-sunken: '#F1EFE8'
  ink: '#23303B'
  ink-soft: '#5C6B76'
  ink-faint: '#9AA5AC'
  primary: '#23303B'
  on-primary: '#FFFFFF'
  accent: '#7C9885'
  accent-text: '#4E6B58'
  on-accent: '#FFFFFF'
  border: '#E3E0D8'
  border-strong: '#23303B'
  error: '#B3402D'
  on-error: '#FFFFFF'
  error-container: '#F5E1DC'
typography:
  eyebrow:
    fontFamily: system-ui, -apple-system, "Segoe UI", sans-serif
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: 0.12em
  display:
    fontFamily: system-ui, -apple-system, "Segoe UI", sans-serif
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline:
    fontFamily: system-ui, -apple-system, "Segoe UI", sans-serif
    fontSize: 19px
    fontWeight: '600'
    lineHeight: '1.3'
  body:
    fontFamily: system-ui, -apple-system, "Segoe UI", sans-serif
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.6'
  label:
    fontFamily: system-ui, -apple-system, "Segoe UI", sans-serif
    fontSize: 13.5px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  caption:
    fontFamily: system-ui, -apple-system, "Segoe UI", sans-serif
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: 0.01em
rounded:
  sm: 2px
  DEFAULT: 4px
  md: 6px
  lg: 8px
  full: 9999px
spacing:
  unit: 8px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 20px
  section-gap: 48px
  section-gap-mobile: 32px
components:
  button-primary:
    background: '{colors.primary}'
    text: '{colors.on-primary}'
    radius: 0px
    padding: '14px 22px'
  button-secondary:
    background: transparent
    border: '1px solid {colors.border-strong}'
    text: '{colors.ink}'
    radius: 0px
  row-item:
    border-bottom: '1px solid {colors.border}'
    padding: '22px 0'
    background: '{colors.surface}'
  input-search:
    border: '1px solid {colors.border-strong}'
    radius: 0px
    background: transparent
  eyebrow-label:
    text: '{colors.accent-text}'
    font: '{typography.eyebrow}'
  status-tag:
    text: '{colors.accent-text}'
    font: '{typography.label}'
  toggle-switch:
    track-off: '{colors.border-strong}'
    track-on: '{colors.accent}'
    knob: '{colors.surface}'
    min-hit-area: 24px
  itinerary-line:
    border-bottom: '1px solid {colors.border}'
    padding: '16px 0'
    edit-affordance: 'text cursor on click, no visible edit icon'
  write-up-composer:
    field-border: '1px solid {colors.border-strong}'
    radius: 0px
    photo-slot: '1px dashed {colors.border}'
  empty-state:
    headline-font: '{typography.headline}'
    body-font: '{typography.body}'
    padding: '{spacing.section-gap} 0'
---

## Brand & Style

WanderTogether reads as a **calm, map-inspired trip planner**, not a social feed. The posture is quiet confidence: generous whitespace, hairline dividers instead of drop-shadowed cards, and restrained color used deliberately rather than decoratively. It should feel closer to a well-made atlas or a boutique travel publication than a chat app — trustworthy first, delightful second.

This matters because the product's real differentiator (per the PRD) is holding four different jobs — discovery, group planning, buddy requests, accommodations — in one calm surface. A loud, busy visual language would undercut that "everything belongs together" feeling by making every screen compete for attention.

## Colors

The palette is muted and desaturated, built around three roles:

- **{colors.background} (cream)** — the page canvas. Warm, not stark white, so long planning sessions don't feel clinical.
- **{colors.surface} (white)** — content surfaces (rows, panels, modals) sit one step brighter than the background to imply layering without needing shadows.
- **{colors.ink}** — primary text and primary actions both use the same deep navy-ink. There is no separate "brand color" competing for attention; navy *is* the brand color, used for both words and buttons.
- **{colors.accent} (sage)** — decorative/structural use only: the toggle-on track fill, a left-border accent (e.g. the buddy note callout). Never used as text color directly — see {colors.accent-text} below.
- **{colors.accent-text}** — a darkened sage used wherever the accent register appears *as text*: eyebrow labels and status tags ("open to buddies," "Attached"). Kept distinct from {colors.accent} because the lighter sage fails contrast as text; this token exists specifically so "sparingly used, worth noticing" doesn't also mean "hard to read."
- **{colors.ink-soft}** — secondary/metadata text (descriptions, prices, dates, itinerary day labels). Darkened from a first-draft lighter sage-gray after contrast review; still reads as quieter than {colors.ink} while clearing AA for normal-size text.
- **{colors.error}** — reserved for real failure states (an invalid Trip Code, a failed submission). Never used for emphasis.

**Contrast (verified):** {colors.ink} on {colors.background} and on {colors.surface} both exceed 7:1 (comfortably AA/AAA for normal text). {colors.ink-soft} on {colors.background} and {colors.surface} both clear 4.5:1. {colors.accent-text} on {colors.background} and {colors.surface} both clear 4.5:1. {colors.accent} itself is never used as text, so its lower contrast against light surfaces is not a violation. {colors.on-error} on {colors.error} and {colors.on-primary} on {colors.primary} both exceed 4.5:1.

## Typography

A single system-font family carries the whole product — no serif, no display font. Hierarchy comes from size, weight, and spacing, not from mixing typefaces.

- **{typography.display}** — page-level headlines (e.g., the Discover hero headline). Lighter weight (400) keeps it calm rather than shouty.
- **{typography.headline}** — section and row-level titles (Destination names, Trip names).
- **{typography.eyebrow}** — small, tracked-out, uppercase, always in {colors.accent-text} (not the base {colors.accent} — see Colors). Used to label a section ("Plan together") before a headline, never as a standalone UI label.
- **{typography.body}** / **{typography.label}** / **{typography.caption}** — body copy, form labels, and metadata (ratings, prices, dates) respectively.

## Layout & Spacing

Content reads as a **list of rows**, not a grid of cards, wherever the content is inherently list-like (Destinations, Trip Write-ups, Travel Buddy Requests). Rows are separated by a single hairline ({colors.border}) rather than boxed in shadowed containers — this is the single most identifying layout trait of Calm Atlas.

Desktop margins are generous ({spacing.margin-desktop}, 40px) and section breaks use {spacing.section-gap} (48px) so the page never feels crowded. On narrower viewports, margins tighten to {spacing.margin-mobile} (20px) and section gaps to {spacing.section-gap-mobile} (32px) — the calm, uncrowded feel should hold at every width, not just desktop. Row layout (the core list pattern) stacks its right-aligned metadata below the title on narrow screens rather than compressing it. See EXPERIENCE.md Foundation and Responsive & Platform for breakpoint behavior.

## Elevation & Depth

No drop shadows. Depth is communicated entirely through the {colors.background} → {colors.surface} step and 1px hairline borders. A screen should look flat and calm even at full brightness — if a shadow feels necessary somewhere, that's a signal the layout needs a divider instead, not a shadow.

## Shapes

Corners are sharp to nearly-sharp ({rounded.sm}–{rounded.DEFAULT}, 2–4px). No pill shapes, no heavily rounded cards — rounding beyond {rounded.md} (6px) should not appear anywhere in this product. This is deliberate: it's what separates Calm Atlas from a "friendly app" register and keeps it in "considered tool" territory.

## Components

- **Buttons:** Primary buttons are solid {colors.ink} fill with {colors.on-primary} text, sharp corners, no shadow. Secondary buttons are transparent with a 1px {colors.border-strong} outline. No pill-shaped buttons anywhere.
- **Rows (the primary list pattern):** Used for Destinations, Trip Write-ups, and Travel Buddy Request listings. A left-aligned swatch/thumbnail, headline + one-line description, right-aligned metadata (price, rating, count). Separated by {colors.border} hairlines, not cards.
- **Inputs:** Bordered rectangles (1px {colors.border-strong}), sharp corners, no inner shadow. Focus treatment is defined once, in `EXPERIENCE.md.Accessibility Floor` (a solid 2px {colors.ink} outline) — this is the only focus spec for inputs; nothing here overrides it.
- **Tags/badges:** Reserved for the "open to buddies" and error states only — small, uppercase, {typography.label} sized, in {colors.accent-text} or {colors.error} respectively. Not used decoratively elsewhere.
- **Navigation:** A top nav bar with uppercase, letter-spaced tab labels; the active tab is underlined, never pill-highlighted or filled.
- **Itinerary line:** A row-pattern variant with no swatch — day label (left, {typography.caption}, {colors.ink-soft}) + inline-editable title text. No visible "edit" icon; the click/focus target is the text itself.
- **Open-to-buddies toggle:** A track-and-knob switch, not a checkbox visually. Off: {colors.border-strong} track. On: {colors.accent} track (decorative use of sage is allowed here — it's not text). Knob is {colors.surface}. Visual track may stay slim, but the hit area is padded to a 24×24px minimum regardless of the visible track size.
- **Write-up composer:** Stacked fields (title, then body, then photo slots), same bordered-rectangle language as Inputs. Photo slots are 1px dashed {colors.border} boxes until filled.
- **Empty state:** {typography.headline} one-liner, {typography.body} supporting line below, generous {spacing.section-gap} padding above/below so it doesn't read as an error.

## Do's and Don'ts

- **Do** use a hairline row list for anything that is fundamentally a browsable list (Destinations, Trip Write-ups, Travel Buddy Requests).
- **Do** reserve {colors.accent} / {colors.accent-text} for the one or two things per screen actually worth flagging.
- **Don't** add drop shadows, gradients, or rounded pill buttons — they belong to a different (rejected) direction.
- **Don't** introduce a second accent color; sage carries all "notice this" moments alone.
- **Don't** let the calm, spacious feel collapse into cramped density on small viewports — tighten spacing tokens, don't just shrink everything proportionally.
