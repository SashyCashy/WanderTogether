---
title: 'Story 1.1: Project Scaffold & Data Model Setup'
type: 'feature'
created: '2026-09-27'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'c9ea5dd288fa33f9d06ced26b9b805c3eff5660d'
context:
  - _bmad-output/planning-artifacts/architecture/architecture-WanderTogether-2026-09-27/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-WanderTogether-2026-09-27/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-WanderTogether-2026-09-27/EXPERIENCE.md
  - _bmad-output/planning-artifacts/prds/prd-WanderTogether-2026-09-27/addendum.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** No code exists yet. Every later story across all four epics depends on a working monorepo, a complete data model, and a shared design-system layer that don't exist yet.

**Approach:** Scaffold `apps/web` (Vite + React) and `apps/api` (Express, ESM) as an npm-workspaces monorepo; author the full Prisma schema (all 7 entities, per the architecture spine's ERD) and a seed script in one pass; stand up shared API middleware (error envelope, request logger) and a shared frontend layer (design tokens as CSS variables, reusable Row/EmptyState/Navigation components, focus/responsive/accessibility primitives).

## Boundaries & Constraints

**Always:**
- TypeScript throughout both `apps/web` and `apps/api` — not stated explicitly anywhere upstream, but implied unambiguously by the stack (Prisma's generated types, Zod's type inference, TanStack Query's typed hooks all lose their value under plain JavaScript).
- Use exactly the stack and pinned versions in the architecture spine's Stack table — do not substitute a different version or library for any of them.
- npm workspaces at the repo root (not pnpm/yarn/Turborepo) — the simplest option that needs no extra tool for a 2-package monorepo.
- Author `schema.prisma` with all 7 entities from the spine's ERD in this one story, not incrementally (AD-4, AD-5) — the spine explicitly requires this to prevent shape-collision.
- `apps/api` is ESM (`"type": "module"`).
- Every entity id is `nanoid()` at its default length, except Trip Codes (`nanoid`, 10+ characters) — no auto-increment ids anywhere.
- Frontend tokens/components match the DESIGN.md/EXPERIENCE.md docs exactly, including the accessibility-review-darkened `ink-soft`/`accent-text` color values — not any earlier, lighter draft values.

**Never:**
- No feature-slice business logic (discovery/trips/buddies/write-ups/accommodations route handlers or React screens) — that begins in Story 1.2 and later.
- No authentication/session code of any kind.
- No off-the-shelf starter/boilerplate generator (e.g. `create-t3-app`) — build the folder structure by hand per the spine's tree.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Seed script run on a fresh SQLite file | Empty database | Destination + AccommodationListing rows populate per the PRD addendum's shape (4 Lisbon listings + a small destination set) | N/A |
| Seed script run a second time | Database already seeded | No duplicate rows — the script is idempotent | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/` -- new Vite 8.3.0 + React 19.3 SPA; empty feature folders (`discover/`, `my-trips/`, `trip-detail/`, `buddies/`, `write-ups/`, `shared/`) per the spine's frontend tree
- `apps/api/` -- new Express 5.2.1 ESM API; empty feature folders (`discovery/`, `trips/`, `buddies/`, `write-ups/`, `accommodations/`, `shared/`) per the spine's backend tree
- `apps/api/prisma/schema.prisma` -- all 7 entities, exactly as the spine's ERD/AD-4/AD-5 specify
- `apps/api/prisma/seed.ts` -- Destination + AccommodationListing data, shape from the PRD addendum
- `apps/api/src/shared/error-middleware.ts` -- AD-9's fixed envelope + code vocabulary; positioned after `multer` in the chain
- `apps/api/src/shared/logger.ts` -- one app-level request logger
- `apps/web/src/shared/tokens.css` -- DESIGN.md's color/typography/rounded/spacing tokens as CSS variables
- `apps/web/src/shared/components/{Row,EmptyState,Navigation}.tsx` -- shared components per DESIGN.md Components + EXPERIENCE.md Component Patterns

## Tasks & Acceptance

**Execution:**
- [x] `package.json` (root) -- configure npm workspaces for `apps/web` + `apps/api` -- single install/build entrypoint for the monorepo
- [x] `apps/web/*` -- scaffold the Vite+React app with empty feature-slice folders -- matches the spine's frontend tree exactly
- [x] `apps/api/*` -- scaffold the Express app (ESM) with empty feature-slice folders -- matches the spine's backend tree exactly
- [x] `apps/api/prisma/schema.prisma` -- author all 7 entities with `nanoid` ids and the `@prisma/adapter-better-sqlite3` config -- AD-3/AD-4/AD-5
- [x] `apps/api/prisma/seed.ts` -- seed Destinations + AccommodationListings from the addendum shape, idempotently -- AD-12
- [x] `apps/api/src/shared/error-middleware.ts` + `logger.ts` -- AD-9's envelope/code vocabulary and request logging, ready for every later slice to use
- [x] `apps/web/src/shared/tokens.css`, `components/Row.tsx`, `components/EmptyState.tsx`, `components/Navigation.tsx` -- DESIGN.md tokens plus EXPERIENCE.md's focus treatment, touch-target minimums, 3 responsive breakpoints, and the mobile nav trigger's `aria-expanded`/focus-management
- [x] `apps/web/src/shared/conventions.md` (or equivalent constants/README) -- record the pagination-not-infinite-scroll rule, the banned interaction patterns, and the calm/plain-spoken voice baseline, so later stories don't have to re-derive them from the UX docs
- [x] `apps/api/prisma/seed.test.ts` -- automated coverage for the I/O matrix (fresh-seed populate, re-run idempotency) -- added during review audit; the implementation subagent had only verified this manually

**Acceptance Criteria:**
- Given a fresh checkout, when setup runs (`npm install`), then both `apps/web` and `apps/api` start locally without errors
- Given `schema.prisma`, when authored, then it defines all 7 entities with `nanoid` ids and the SQLite adapter, matching the spine's ERD exactly
- Given `seed.ts`, when run, then Destinations and Accommodations populate matching the addendum's shape, and a second run does not duplicate rows
- Given the shared API layer, when set up, then it includes the AD-9 error envelope, its fixed code vocabulary, and a request logger
- Given DESIGN.md's tokens, when the frontend shared layer is set up, then they exist as CSS variables, and the shared Row/EmptyState/Navigation components exist for every later feature slice to reuse
- Given EXPERIENCE.md's Accessibility Floor and Responsive & Platform sections, when the shared layer is set up, then the single focus-outline treatment, the 44px/24px touch-target minimums, the three responsive breakpoints, and the mobile nav trigger's accessible semantics are established as shared styles/utilities, not left for each slice to reinvent

## Implementation Notes

- Monorepo, both apps, full 7-entity schema, seed script, shared API middleware, and shared frontend design-system layer all implemented as specified. Environment note: the sandbox's default Node was v22.23.2, not the pinned 24.x LTS — implementation and all verification (including the audit's new tests) were run under Node 24.21.0 via nvm to match the spine exactly, not "close enough."
- Two unpinned-by-spec choices resolved to latest-stable at implementation time: TypeScript 7.0.2, `@vitejs/plugin-react` 6.1.1. Added `dotenv` (not in the Stack table) to satisfy the "config via .env + a typed config module" convention and because Prisma 7's `prisma.config.ts` needs it directly.
- Organizational deviation from the Code Map's literal file list: the focus/touch-target/breakpoint primitives live in `apps/web/src/shared/a11y.css` + `breakpoints.ts` + `LiveRegion.tsx`, separate from `tokens.css`, rather than folded into the four files the Code Map named. This still satisfies every Acceptance Criterion (these exist once, as shared utilities) — noted for visibility, not reverted.
- **Review-audit fix:** the implementation subagent verified the I/O matrix's two seeding scenarios manually (ran `seed.ts` twice, inspected rows) rather than with an automated test, which the build workflow's Matrix Test Audit step requires. Refactored `seed.ts` to export `seedDatabase()`/`SEED_COUNTS` behind a CLI-entrypoint guard (`import.meta.url` check, so `tsx prisma/seed.ts` still works unchanged) and added `apps/api/prisma/seed.test.ts` (Node's built-in `node:test`, no new dependency) covering both matrix rows plus an id-stability check. Added `"test": "node --import tsx --test prisma/**/*.test.ts"` to `apps/api/package.json`. All 3 tests pass under Node 24.21.0.
- Remaining risks carried over from the implementation subagent's own report, not yet addressed (none block this story's ACs): `npm audit` reports 4 high-severity transitive advisories, unreviewed; Node 24/npm 11's install-scripts approval gate skipped some transitive native-module install scripts (`better-sqlite3`, `esbuild`, `fsevents`, `@prisma/engines`, `prisma`) with a warning — smoke-tested and working here, but worth an `npm install-scripts ls` check if a future clean install misbehaves.

## Spec Change Log

## Review Triage Log

- **low / patch** — `prisma/migrations/20260927090112_init/migration.sql:68` emits `DEFAULT []` (unquoted) for `photoUrls`, mismatching `schema.prisma`'s `@default("[]")`. Verified myself on a fresh SQLite file (`prisma migrate deploy` + raw insert): the migration applies with **zero errors** (Blind Hunter's and Edge Case Hunter's "migrate will fail" claim is disproven), but the DB-level default actually stores `''`, not `'[]'`. Verification Gap independently confirmed the same via a real insert and noted it's currently inert because Prisma Client always supplies the default itself — no code path in this diff is affected. Real but low-impact; fix is a one-line literal correction.
- **low / patch** — `apps/api/prisma.config.ts`'s `datasource.url` has no fallback (`process.env.DATABASE_URL`, undefined if unset) while `apps/api/src/shared/config.ts` falls back to `file:./prisma/dev.db`. Inconsistent, though the actual failure mode (a clear Prisma CLI error on missing env var) is not silent misbehavior. Trivial fix: mirror the same fallback string.
- **false** — Blind Hunter: "multer added as a dependency ... but `apps/api/src/index.ts` never imports or mounts multer ... stale comment or missing wiring." Verified: `error-middleware.ts`'s docstring describes where the *shared error handler* sits relative to a *future* multer-using route (it's mounted last, so any later slice's multer middleware will register before it) — this is forward-declared architecture per AD-9, not stale, and no route exists yet for multer to attach to (explicitly out of scope for this story — "Never: no feature-slice business logic").
- **low / patch** — `error-middleware.ts` and `logger.ts` carry `// eslint-disable-next-line no-console` comments, but no ESLint config or dependency exists anywhere in the diff. Verified: no `.eslintrc*`/`eslint.config.*` file, no `eslint` in any `package.json`. Inert, misleading. Trivial fix: delete the two comments.
- **low / reject** — Blind Hunter: `seed.test.ts` runs against the real dev SQLite file rather than an isolated test DB. Real, but the writes are upsert-only (non-destructive) and the fix (a separate test `DATABASE_URL`, teardown) is not a trivial correction. Unlikely to bite in this project's actual (solo, no-CI) use. Rejected per low-finding criteria.
- **low / patch** (2 reviewers, same root cause) — Blind Hunter + Edge Case Hunter: `LiveRegion.tsx`'s `announce()` schedules a `setTimeout` with no cleanup on unmount. Real; trivial fix (clear the timeout in a `useEffect` cleanup).
- **low / patch** — Blind Hunter: no root README/setup doc describing the bring-up sequence, despite the spec's own Verification section listing the steps. Real gap for a project meant to be reviewed by a tutor. Trivial addition, no code risk.
- **low / reject** — Blind Hunter: no aggregate root `dev`/`test` script running both apps together. The spec's "single install/build entrypoint" language covers `install`/`build` (both already aggregate via workspaces) — a `dev` command was never promised, and two terminal commands is normal, unremarkable npm-workspaces practice. Fix would require adding a new tool (`concurrently`), which the spec explicitly avoided adding for the monorepo setup. Rejected per low-finding criteria.
- **reject (out of scope)** — Blind Hunter: `AccommodationListing.rating` has no range constraint or Zod validation. The Intent itself excludes feature-slice business logic and validation (`Never: no feature-slice business logic`); there is no write endpoint for this entity in this story (seed-only, AD-12) for a range constraint to guard. Out of scope per the intent, not just the spec's boundaries section.
- **false** — Blind Hunter: the shared Zod-error branch collapses `err.issues` into one joined message string, discarding each issue's `path`. Verified against AD-9: the envelope contract is exactly `{ error: { code, message } }` — a string message, nothing more — so the current implementation matches the spec precisely. No consuming code exists yet that needs field-level structure. Not a defect; an enhancement idea with no demonstrated need.
- **low / reject** — Blind Hunter: `apps/web` has no test runner/script despite some nontrivial shared-component behavior (focus management, `aria-expanded`, breakpoint classification). Real absence, but symmetric to the seed-test-isolation finding above: the smallest real fix (standing up `vitest`/RTL) is not trivial, and nothing in this story's frozen I/O matrix required frontend test rows. Rejected per low-finding criteria; revisit once real interactions are wired to these components (Story 1.2+).
- **low / patch** — Edge Case Hunter: `config.ts`'s `PORT` env var coerces to `NaN` with no guard if non-numeric, producing an unclear failure at `app.listen(NaN)`. Real, trivial fix (guard + explicit error).
- **low / patch** — Edge Case Hunter: `index.ts`'s `app.listen(...)` has no `'error'` listener, so `EADDRINUSE` (or any bind failure) surfaces as an unhandled-event crash rather than a clear message. Real, trivial fix.
- **low / patch** — Edge Case Hunter: `Navigation.tsx`'s mobile menu has no click-outside-to-close — only `Escape` and link-activation close it. Real minor UX gap, not required by EXPERIENCE.md but a reasonable expectation. Trivial fix.
- **low / patch** — Edge Case Hunter: `seed.test.ts`'s third test ("re-seeding preserves existing row ids") assumes `'lisbon'` already exists from the first two tests running first, rather than seeding itself — order-dependent. Real test-hygiene bug I introduced during the audit fix. Trivial fix: seed within the test itself.
- **low / patch** — Edge Case Hunter: `seed.ts`'s upserts use `update: {}`, so re-running the seed after editing the source data never propagates those edits to already-seeded rows — only genuinely new rows get inserted. Real ergonomic gap for active development. Trivial fix: spread the fields into `update`.

## Verification

**Commands:**
- `npm install` -- expected: completes with no errors
- `npm run dev --workspace apps/api` -- expected: Express server starts and stays up
- `npm run dev --workspace apps/web` -- expected: Vite dev server starts and stays up
- `npx prisma migrate dev` (in `apps/api`) -- expected: creates a SQLite schema matching `schema.prisma` with no errors
- `npx tsx prisma/seed.ts` (in `apps/api`), run twice -- expected: seed data present after the first run, row counts unchanged after the second

**Manual checks (if no CLI):**
- Open `apps/web` in a browser: the page background uses the Calm Atlas cream token (`#F7F6F2`), confirming the CSS variables loaded correctly
