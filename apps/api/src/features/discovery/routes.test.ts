import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import Database from 'better-sqlite3';

/**
 * Covers spec-1-2's I/O & Edge-Case Matrix for GET /api/destinations:
 *   - seeded catalog -> 200 with the 4-item array, trimmed field shape
 *   - empty Destination table -> 200 with []
 *   - a query-time failure -> 500 in the shared error envelope
 *
 * Runs against its own throwaway SQLite file, migrated by replaying every
 * migration under prisma/migrations in order (not just the first one),
 * rather than apps/api/prisma/dev.db, so it never races or interferes with
 * seed.test.ts's writes to the shared dev database, and can safely
 * exercise a genuinely empty table.
 *
 * DATABASE_URL is set before any app/prisma module is imported (Prisma's
 * singleton in shared/prisma.ts reads it once, via shared/config.ts, at
 * import time) — every import below is dynamic for that reason.
 */

const tempDir = mkdtempSync(join(tmpdir(), 'wandertogether-routes-test-'));
const tempDbPath = join(tempDir, 'test.db');
// pathToFileURL (not manual string interpolation) so this resolves to a
// valid `file:` URI regardless of the host OS's path separator.
process.env.DATABASE_URL = pathToFileURL(tempDbPath).href;

const migrationsDir = join(import.meta.dirname, '../../../prisma/migrations');
const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

try {
  const db = new Database(tempDbPath);
  try {
    for (const folder of migrationFolders) {
      db.exec(readFileSync(join(migrationsDir, folder, 'migration.sql'), 'utf-8'));
    }
  } finally {
    db.close();
  }
} catch (error) {
  // The `after()` hook below isn't registered yet if migration replay
  // itself throws — clean up the temp dir here so a malformed
  // migration.sql doesn't also leak a temp SQLite file on every run.
  rmSync(tempDir, { recursive: true, force: true });
  throw error;
}

const { createApp } = await import('../../app.js');
const { prisma } = await import('../../shared/prisma.js');
const { seedDatabase, SEED_COUNTS } = await import('../../../prisma/seed.js');

const app = createApp();
const server = app.listen(0);
const { port } = server.address() as AddressInfo;
const baseUrl = `http://127.0.0.1:${port}`;

after(async () => {
  server.close();
  await prisma.$disconnect();
  rmSync(tempDir, { recursive: true, force: true });
});

test('GET /api/destinations returns the seeded catalog with the trimmed field shape', async () => {
  await seedDatabase();

  const response = await fetch(`${baseUrl}/api/destinations`);
  assert.equal(response.status, 200);

  const body = (await response.json()) as unknown[];
  assert.equal(body.length, SEED_COUNTS.destinations);

  for (const destination of body) {
    assert.deepEqual(Object.keys(destination as object).sort(), [
      'country',
      'description',
      'id',
      'name',
      'photoUrl',
      'region',
      'tripType',
    ]);
  }
});

test('GET /api/destinations returns 200 with [] when the Destination table is empty', async () => {
  // Delete in FK-safe order: AccommodationListing/Trip reference
  // Destination, so they go first even though this suite never seeds
  // Trips.
  await prisma.accommodationListing.deleteMany();
  await prisma.destination.deleteMany();

  const response = await fetch(`${baseUrl}/api/destinations`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test('GET /api/destinations returns 500 in the shared error envelope when the query fails', async () => {
  // Drop the table out from under Prisma to force a genuine query-time
  // failure (rather than mocking the service), exercising the real
  // errorMiddleware path the frontend's "Couldn't load this" state relies on.
  await prisma.$executeRawUnsafe('DROP TABLE "Destination"');

  const response = await fetch(`${baseUrl}/api/destinations`);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
});
