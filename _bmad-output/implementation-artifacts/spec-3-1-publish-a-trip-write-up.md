---
title: 'Story 3.1: Publish a Trip Write-up'
type: 'feature'
created: '2026-09-28'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '9fcbd453d1d7658189508f4539428f15238a0afc'
context:
  - _bmad-output/implementation-artifacts/epic-3-context.md
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `TripWriteup` has existed in the schema since Story 1.1, but nothing lets a visitor publish one — Epic 3 (the most standalone epic, no Trip Code or membership needed) has no entry point yet.

**Approach:** Add `POST /api/write-ups` (multipart, `multer` writing photos to `apps/api/uploads/`) and a composer screen (title, body, optional Destination link, one or more photo slots) reachable at `/write-ups/new`.

## Boundaries & Constraints

**Always:**
- Publishing requires a title, body, and at least one photo — no Trip Code, membership, or authentication at any point (this write-up isn't attached to any `Trip` record).
- Photos are written to `apps/api/uploads/` via `multer` and referenced from `TripWriteup.photoUrls` (a JSON array of relative URL strings) — never base64-in-DB, never a cloud service, never a separate `Photo` entity.
- A `multer` rejection (oversized file, disallowed type) is translated into the shared `{ error: { code, message } }` vocabulary (`FILE_TOO_LARGE` for size; `VALIDATION_ERROR` for type) — never falls through as a generic `INTERNAL_ERROR` — and shown inline on the composer without clearing the already-entered title/body/destination.
- `destinationId` is optional; when provided, it's validated against the real Destination catalog the same way `createTrip` already does (AD-1's seed-data exception).
- Uploaded files are served statically from `/uploads/*`; the frontend dev proxy (`vite.config.ts`) forwards that path to the API alongside the existing `/api` proxy, or `<img>` tags requesting them in dev would 404 against Vite's own dev server.

**Never:**
- No browse/listing/detail screen for write-ups — Story 3.2. Publishing succeeds with a calm inline confirmation, not a redirect to a page that doesn't exist yet.
- No draft-saving — losing an in-progress composer entry (e.g. a reload) is an accepted v1 gap, per the epic's own Requirements.
- No comments, likes, or any interaction beyond publishing itself.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Publish with a Destination link | title, body, ≥1 photo, valid `destinationId` | `201`; `photoUrls` populated; `destinationId` set | N/A |
| Publish without a Destination link | title, body, ≥1 photo, no `destinationId` | `201`; write-up exists independently of any Trip/Destination | N/A |
| No photo provided | title + body only | `400 VALIDATION_ERROR` | No `TripWriteup` row, no orphaned uploaded file |
| A photo exceeds the size limit | Oversized file | `413 FILE_TOO_LARGE` | Inline message; title/body/destination retained, not cleared |
| A file isn't an accepted image type | e.g. a `.pdf` | `400 VALIDATION_ERROR` | Same retained-form behavior |
| Unknown `destinationId` | Doesn't match any seeded Destination | `400 VALIDATION_ERROR` | No `TripWriteup` row created |

</frozen-after-approval>

## Code Map

- `apps/api/src/shared/uploads.ts` -- new: `multer` instance — disk storage to `apps/api/uploads/` (already exists, gitignored except `.gitkeep`), filenames via `nanoid()` + original extension, 5MB/file limit, `fileFilter` accepting only `image/jpeg`/`image/png`/`image/webp`/`image/gif` (rejects via `cb(new AppError('VALIDATION_ERROR', ...))`, not a generic `Error` — the shared middleware already special-cases `AppError` ahead of its `MulterError` branch)
- `apps/api/src/features/write-ups/service.ts` -- new: `createWriteup(input: { title, body, authorName?, destinationId?, photoUrls: string[] })` — validates `destinationId` via `prisma.destination.findUnique` when present (same idiom `createTrip` uses), `prisma.tripWriteup.create`
- `apps/api/src/features/write-ups/routes.ts` -- new: `POST /` — `upload.array('photos', 6)` middleware, then zod-validates the multipart text fields, requires `req.files.length >= 1` (`VALIDATION_ERROR` otherwise), maps saved files to `/uploads/<filename>` URLs
- `apps/api/src/app.ts` -- mount `writeUpsRouter` at `/api/write-ups`; `express.static('uploads')` mounted at `/uploads`
- `apps/web/vite.config.ts` -- add `/uploads` to the dev proxy, alongside the existing `/api` entry
- `apps/web/src/features/write-ups/api.ts` -- new: `publishWriteup(formData: FormData): Promise<TripWriteupSummary>` — plain `fetch` with a `FormData` body (no `Content-Type` header; the browser sets the multipart boundary)
- `apps/web/src/features/write-ups/WriteupComposerPage.tsx` (+ `.css`) -- new: title/body fields, an optional destination `<select>` (reusing `useDestinations()`), photo slots (empty ones render as dashed-border boxes per `DESIGN.md`, filled ones show a thumbnail preview), submit; on success shows an inline "Write-up published." confirmation with a "Publish another" reset action, not a redirect
- `apps/web/src/App.tsx` -- route `/write-ups/new` → `WriteupComposerPage`; the "Write-ups" nav tab changes from its inert `#write-ups` placeholder to this route (Story 3.2 will likely repoint it to a browse listing once one exists, the way My Trips/Buddies' nav entries evolved)

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/shared/uploads.ts` -- `multer` config
- [x] `apps/api/src/features/write-ups/service.ts` -- `createWriteup`
- [x] `apps/api/src/features/write-ups/routes.ts` -- `POST /`
- [x] `apps/api/src/app.ts` -- mount router + static `/uploads` serving
- [x] `apps/web/vite.config.ts` -- `/uploads` proxy
- [x] `apps/web/src/features/write-ups/api.ts` -- `publishWriteup`
- [x] `apps/web/src/features/write-ups/WriteupComposerPage.tsx` (+ `.css`)
- [x] `apps/web/src/App.tsx` -- route + real nav link
- [x] `apps/api/src/features/write-ups/routes.test.ts` -- coverage for the I/O matrix

**Acceptance Criteria:**
- Given a visitor opens the Write-up composer and fills in a title, body, and one or more photos (optionally linking a Destination), when they submit, then the write-up publishes and photos are written to `apps/api/uploads/`, referenced from `photoUrls`
- Given a photo upload exceeds the size limit or has an invalid type, when `multer` rejects it, then the error is translated into the shared error-code vocabulary and shown inline without clearing the rest of the form
- Given a Trip Write-up isn't linked to any Trip record, when published, then it exists independently — no Trip Code or membership is required to publish

## Implementation Notes

## Spec Change Log

## Review Triage Log

Four-layer parallel review (blind-hunter, edge-case-hunter, verification-gap, acceptance-auditor) run against the story's diff.

**Patched:**
- **Frozen-spec violation — redirect instead of inline confirmation.** `useCreateWriteup`'s `onSuccess` called `navigate('/')`, contradicting the frozen "Never" constraint ("a calm inline confirmation, not a redirect") and the Code Map. Found independently by acceptance-auditor and verification-gap. Fixed: `useCreateWriteup` no longer navigates; `WriteupComposerPage` renders a "Write-up published." confirmation with a "Publish another" action (`resetForm`) when `mutation.isSuccess`.
- **Multer-level rejections bypassed file cleanup.** `upload.array('photos', 6)`'s own rejections (fileFilter throw, the 6-file cap, the size limit) call `next(err)` before the route handler's try/catch ever runs, so any files already written earlier in the same multipart request leaked as orphans. Found by edge-case-hunter (high confidence). Fixed: added `cleanupOnUploadError`, a 4-arg error-handling middleware mounted between `upload.array(...)` and the route handler, so Express routes multer's own errors through it first.
- **Extension trusted from client-controlled `originalname`.** `filename()` derived the stored extension via `extname(file.originalname)`, so a request could pass `fileFilter` with `mimetype: 'image/png'` while naming the file `evil.svg`, landing an attacker-chosen extension (e.g. an SVG capable of embedding a script) in a directory served statically. Found by edge-case-hunter. Fixed: extension is now derived from a `MIME_EXTENSIONS` map keyed by the already-validated `mimetype`, never from `originalname`.
- **Missing test: oversized photo → 413 FILE_TOO_LARGE.** The I/O matrix requires this path; the test file's own header comment claimed coverage but no test exercised it. Found independently by blind-hunter, edge-case-hunter (claims check), and verification-gap. Fixed: added a test posting a >5MB blob asserting `413`/`FILE_TOO_LARGE` and no orphaned file.
- **Missing test: static `/uploads` mount never exercised over HTTP.** Existing tests only checked the file landed on disk, never that `GET /uploads/<file>` actually resolves — a wrong static-mount path would 404 every photo in the browser with the whole suite still green. Found by verification-gap. Fixed: added an HTTP `GET` assertion against the returned `photoUrls[0]` in the existing "writes the photo to uploads/" test.
- **Missing test: >6-photo cap.** `upload.array('photos', 6)`'s `LIMIT_UNEXPECTED_FILE` path (and its cleanup) was untested. Found by blind-hunter. Fixed: added a test posting 7 photos, asserting rejection and no orphaned files.
- **File input didn't reflect the MAX_PHOTOS truncation.** Choosing more than 6 photos truncated the submitted set but left the native `<input type="file">`'s own displayed selection showing every file picked. Found by blind-hunter. Fixed: `handlePhotosChange` clears the input's value when truncating.
- **`deleteUploadedFiles` swallowed all cleanup failures silently.** Found by blind-hunter. Fixed: now logs failures other than `ENOENT` (the expected case when multer's own file-count-limit cleanup already removed the file first).

**Deferred (not spec-required, out of scope for this story):**
- Client-side pre-validation of file size/type before submit (spec only requires server-side validation with an inline error).
- `image/heic`/`heif` support — not in the spec's accepted-type list.
- Retry affordance when `useDestinations()` errors (matches `CreateTripPage`'s existing pattern of the same tradeoff).
- Query-cache invalidation on write-up creation — no write-ups list query exists yet (Story 3.2).
- `destinationId` shape/format pre-validation beyond the existing DB-lookup check — the lookup already 400s cleanly on any non-match.

## Verification

**Commands:**
- `cd apps/api && npm test` -- expected: all tests pass, including the new `write-ups/routes.test.ts`
- `cd apps/api && npx tsc --noEmit` -- expected: clean
- `cd apps/web && npm run lint` -- expected: clean
- `cd apps/web && npm run build` -- expected: succeeds

**Manual checks (if no CLI):**
- Publish a write-up with a photo, no Destination → confirmation appears; the file exists in `apps/api/uploads/`.
- Try publishing with no photo → inline validation error, title/body retained.
- Try uploading a `.pdf` → inline "not an accepted image type" error, form retained.
