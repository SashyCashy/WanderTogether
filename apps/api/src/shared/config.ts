import 'dotenv/config';

/**
 * The one place `process.env` is read. Every other module imports typed
 * values from here instead of reading `process.env` ad hoc (Consistency
 * Conventions > State & cross-cutting).
 */
function parsePort(): number {
  const raw = process.env.PORT ?? '3001';
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT: ${raw}`);
  }
  return parsed;
}

export const config = {
  port: parsePort(),
  databaseUrl: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  nodeEnv: process.env.NODE_ENV ?? 'development',
} as const;
