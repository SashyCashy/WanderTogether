import type { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

/**
 * AD-9's fixed code vocabulary. Every non-2xx response uses one of these
 * — never a code invented ad hoc per route.
 */
export type ErrorCode = 'NOT_FOUND' | 'VALIDATION_ERROR' | 'CONFLICT' | 'FILE_TOO_LARGE' | 'INTERNAL_ERROR';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  FILE_TOO_LARGE: 413,
  INTERNAL_ERROR: 500,
};

/**
 * Thrown by any slice's route handler to produce an AD-9-shaped error
 * response without assembling the envelope itself.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

/** Terminal middleware for any request that matched no route. */
export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('NOT_FOUND', `No route matches ${req.method} ${req.originalUrl}`));
}

/**
 * AD-9: "every non-2xx response is `{ error: { code, message } }`,
 * produced by one shared error-handler middleware, never assembled ad hoc
 * per route." Sits after `multer` in the chain (mounted last, in
 * src/index.ts) and explicitly translates `MulterError` into this
 * vocabulary — never left to fall through as `INTERNAL_ERROR`.
 */
// Express identifies error-handling middleware by arity (4 params) — all
// four must stay in the signature even though `_req`/`_next` are unused.
export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  if (err instanceof MulterError) {
    // multer throws before Zod (or any route handler) ever runs — this is
    // the one place that failure gets translated into the shared
    // vocabulary instead of surfacing as a generic 500.
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Uploaded file is too large.' } });
      return;
    }
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: err.message } });
    return;
  }

  if (err instanceof ZodError) {
    const message = err.issues.map((issue) => issue.message).join(', ') || 'Invalid request.';
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message } });
    return;
  }

  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
}
