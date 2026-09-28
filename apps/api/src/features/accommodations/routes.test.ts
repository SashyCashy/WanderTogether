import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import Database from 'better-sqlite3';

/**
 * Covers spec-4-1's I/O & Edge-Case Matrix for GET /api/accommodations:
 *   - a destination with seeded listings -> 200, filtered to that
 *     destination only
 *   - a destination with zero listings -> 200 with []
 *   - an unknown destinationId -> 200 with [] (not a 400 — mirrors
 *     Discover's own no-validation-on-read precedent)
 *   - a missing destinationId query param -> 400 VALIDATION_ERROR
 *
 * Same isolation pattern as the other slices' routes.test.ts: its own
 * throwaway SQLite file, migrated by replaying every folder under
 * prisma/migrations in order, never touching the shared dev.db.
 */

const tempDir = mkdtempSync(join(tmpdir(), 'wandertogether-accommodations-routes-test-'));
const tempDbPath = join(tempDir, 'test.db');
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

await seedDatabase();
const lisbon = await prisma.destination.findFirstOrThrow({ where: { slug: 'lisbon' } });
const otherDestination = await prisma.destination.findFirstOrThrow({ where: { slug: { not: 'lisbon' } } });

test('GET /api/accommodations returns listings filtered to the given destination only', async () => {
  const response = await fetch(`${baseUrl}/api/accommodations?destinationId=${lisbon.id}`);
  assert.equal(response.status, 200);

  const body = (await response.json()) as { id: string; name: string; type: string; pricePerNightUSD: number; rating: number; photoUrl: string; description: string }[];
  assert.equal(body.length, SEED_COUNTS.accommodations, 'all seeded accommodations are Lisbon listings');
  for (const listing of body) {
    assert.deepEqual(Object.keys(listing).sort(), ['description', 'id', 'name', 'photoUrl', 'pricePerNightUSD', 'rating', 'type']);
  }
});

test('GET /api/accommodations returns 200 with [] for a destination with no listings', async () => {
  const response = await fetch(`${baseUrl}/api/accommodations?destinationId=${otherDestination.id}`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test('GET /api/accommodations excludes another destination even when both have listings', async () => {
  const isolationListing = await prisma.accommodationListing.create({
    data: {
      id: 'isolation-test-listing',
      slug: 'isolation-test-listing',
      name: 'Isolation Test Inn',
      destinationId: otherDestination.id,
      type: 'hotel',
      pricePerNightUSD: 100,
      rating: 4.0,
      photoUrl: '/x.jpg',
      description: 'x',
    },
  });

  const lisbonResponse = await fetch(`${baseUrl}/api/accommodations?destinationId=${lisbon.id}`);
  const lisbonBody = (await lisbonResponse.json()) as { id: string }[];
  assert.ok(
    !lisbonBody.some((listing) => listing.id === isolationListing.id),
    "a listing belonging to another destination must never appear in this destination's results",
  );

  const otherResponse = await fetch(`${baseUrl}/api/accommodations?destinationId=${otherDestination.id}`);
  const otherBody = (await otherResponse.json()) as { id: string }[];
  assert.deepEqual(
    otherBody.map((listing) => listing.id),
    [isolationListing.id],
    "the other destination's results must contain only its own listing, not Lisbon's",
  );

  await prisma.accommodationListing.delete({ where: { id: isolationListing.id } });
});

test('GET /api/accommodations returns 200 with [] for an unknown destinationId', async () => {
  const response = await fetch(`${baseUrl}/api/accommodations?destinationId=not-a-real-destination`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test('GET /api/accommodations returns 400 VALIDATION_ERROR when destinationId is missing', async () => {
  const response = await fetch(`${baseUrl}/api/accommodations`);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
});

test('GET /api/accommodations returns 400 VALIDATION_ERROR when destinationId is whitespace-only', async () => {
  const response = await fetch(`${baseUrl}/api/accommodations?destinationId=%20`);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
});
