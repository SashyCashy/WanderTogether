import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { AppError } from './error-middleware.js';

/**
 * AD-11: photos are written to disk under `apps/api/uploads/` (already
 * exists, gitignored except `.gitkeep`) and referenced by relative URL —
 * never base64-in-SQLite, never a cloud service, never a separate `Photo`
 * entity. `apps/api/src/app.ts` serves this directory statically at
 * `/uploads/*`.
 */
const UPLOADS_DIR = join(import.meta.dirname, '../../uploads');

/**
 * Doubles as the fileFilter allow-list and the on-disk extension map. The
 * stored extension is derived from this validated `mimetype`, never from
 * `file.originalname` — `originalname` is entirely client-supplied, so
 * trusting it would let a request claim `mimetype: 'image/png'` (passing
 * the filter) while naming the file `evil.svg`, landing an
 * attacker-chosen extension (e.g. an SVG capable of embedding a script)
 * in a directory served statically at `/uploads/*`.
 */
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOADS_DIR),
  // Safe to index unconditionally: `fileFilter` below runs first and
  // rejects anything whose mimetype isn't a key of `MIME_EXTENSIONS`, so a
  // file reaching this callback always has a known extension.
  filename: (_req, file, callback) => callback(null, `${nanoid()}${MIME_EXTENSIONS[file.mimetype]}`),
});

/**
 * A type rejection throws a plain `AppError`, not a generic `Error` —
 * `errorMiddleware` checks `instanceof AppError` before its `MulterError`
 * branch, so this surfaces as the shared `VALIDATION_ERROR` shape rather
 * than an untranslated `INTERNAL_ERROR`. Size-limit rejections are real
 * `MulterError`s (multer's own `LIMIT_FILE_SIZE`), which that same
 * middleware already translates to `FILE_TOO_LARGE`.
 */
export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!(file.mimetype in MIME_EXTENSIONS)) {
      callback(new AppError('VALIDATION_ERROR', 'Only JPEG, PNG, WEBP, or GIF images are allowed.'));
      return;
    }
    callback(null, true);
  },
});

/**
 * Best-effort cleanup for files `multer` already wrote to disk before a
 * *later* validation step (e.g. an invalid `title`) rejects the request —
 * without this, a successfully-uploaded photo would become an orphaned
 * file with no `TripWriteup` row ever referencing it.
 */
export async function deleteUploadedFiles(files: Express.Multer.File[]): Promise<void> {
  await Promise.all(
    files.map((file) =>
      unlink(file.path).catch((error: NodeJS.ErrnoException) => {
        // ENOENT is the expected case when multer's own file-count-limit
        // rejection already removed the file before we get here — not
        // worth logging. Anything else (e.g. a permissions issue) means a
        // file is stuck on disk with nothing referencing it, so it's
        // logged rather than swallowed silently.
        if (error.code === 'ENOENT') return;
        console.error(`Failed to delete orphaned upload ${file.path}:`, error);
      }),
    ),
  );
}

/**
 * `upload.array(...)`'s own rejections (fileFilter throw, the 6-file cap,
 * the size limit) call `next(err)` before the route handler's try/catch
 * ever runs — any files multer had already written earlier in the same
 * multipart request would otherwise leak as orphans. Mounted as the next
 * handler after `upload.array(...)` in the route definition: Express
 * routes an in-flight error straight to the next 4-arg (error-handling)
 * middleware, skipping the non-error handler in between.
 */
export function cleanupOnUploadError(err: unknown, req: Request, _res: Response, next: NextFunction): void {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  void deleteUploadedFiles(files).then(() => next(err));
}
