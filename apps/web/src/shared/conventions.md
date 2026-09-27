# Frontend conventions

Derived once from `DESIGN.md` and `EXPERIENCE.md` so later feature slices
don't have to re-read and re-derive them from the UX docs each time. If
either doc changes, update this file in the same change.

## Pagination, not infinite scroll

Every listing surface (Discover, My Trips, Buddies, Write-ups) paginates.
Infinite scroll is explicitly banned (EXPERIENCE.md > Interaction
Primitives) — it doesn't fit the calm, deliberate register the rest of
the product uses.

## Banned interaction patterns

`EXPERIENCE.md > Interaction Primitives` — "Banned everywhere":

- Infinite scroll (see above).
- Drag-to-reorder anywhere in v1 (itinerary order is add-order only).
- Modal stacks more than one level deep.
- Any "unsaved changes" browser-native `confirm()` dialog on
  navigate-away. Forms save on blur/submit, not on navigate-away — never
  build a flow that depends on warning someone before they leave.

Also banned by `DESIGN.md > Do's and Don'ts`:

- Drop shadows, gradients, or rounded pill buttons.
- A second accent color — sage (`--color-accent` / `--color-accent-text`)
  is the only "notice this" color in the product.
- Letting the calm/spacious feel collapse into cramped density on small
  viewports. Tighten the spacing *tokens* (`--space-margin-mobile`,
  `--space-section-gap-mobile`) at narrow widths — don't just shrink
  everything proportionally.

## Voice and tone baseline

`EXPERIENCE.md > Voice and Tone` — calm, direct, plain-spoken. No
exclamation points, no emoji, no false urgency. Write every new string as
if it belongs in the table below:

| Do | Don't |
|---|---|
| "No account needed — start a Trip and share the link." | "Sign up now to start planning your dream trip! 🎉" |
| "2 spots open on this trip." | "Hurry, only 2 spots left!!" |
| "Request sent." | "Yay! Your request is on its way! ✨" |
| "This code doesn't match a trip. Check it and try again." | "Oops! Something went wrong lol." |
| "No write-ups yet for Lisbon." | "Nothing here... yet! Be the first! 🚀" |

## Where the rest of the shared layer lives

- `tokens.css` — Calm Atlas color/typography/radius/spacing CSS variables.
- `a11y.css` — the single focus-outline treatment, touch-target/hit-area
  minimums, and the two responsive breakpoint values.
- `breakpoints.ts` — the same breakpoints, for any JS that needs them
  (`matchMedia`, `ResizeObserver`).
- `LiveRegion.tsx` — `useAnnounce()` for same-page updates that need a
  polite screen-reader announcement (WCAG 4.1.3).
- `components/Row.tsx`, `components/EmptyState.tsx`,
  `components/Navigation.tsx` — the shared list-row, empty/error-state,
  and top-nav patterns every slice reuses rather than rebuilding.
