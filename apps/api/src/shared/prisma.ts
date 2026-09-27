import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../../generated/prisma/client.js';
import { config } from './config.js';

/**
 * One Prisma Client instance for the whole app. Prisma 7 requires an
 * explicit driver adapter for SQLite (the old bare `datasourceUrl`
 * constructor option was removed in v7) — see Stack table.
 *
 * AD-1's exception: seed-only reference data (Destination,
 * AccommodationListing) may be read directly via this client by any
 * slice. Everything else goes through the owning slice's service
 * function, never a fresh Prisma query against another slice's table.
 */
const adapter = new PrismaBetterSqlite3({ url: config.databaseUrl });

export const prisma = new PrismaClient({ adapter });
