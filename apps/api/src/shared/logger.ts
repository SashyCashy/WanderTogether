import type { NextFunction, Request, Response } from 'express';

/**
 * One app-level request logger — method, path, status, duration — per
 * Consistency Conventions ("Logging: one request logger ... at the
 * Express app level, not per-slice"). Mounted once in src/index.ts,
 * before any feature router.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
  });

  next();
}
