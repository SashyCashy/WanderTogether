import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { prisma } from '../src/shared/prisma.js';
import { SEED_COUNTS, seedDatabase } from './seed.js';

/**
 * Covers the spec's I/O & Edge-Case Matrix (spec-1-1-project-scaffold-data-model-setup.md):
 *   - Seed script run on a fresh SQLite file -> Destination + AccommodationListing rows populate
 *   - Seed script run a second time -> no duplicate rows (idempotent)
 *
 * Runs against whatever DATABASE_URL is configured (the dev SQLite file) —
 * this suite is destructive-safe because every write is an upsert on a
 * stable slug, never a delete, so re-running it never loses data.
 */

after(async () => {
  await prisma.$disconnect();
});

test('seeding a fresh (or already-seeded) database populates the expected rows', async () => {
  const result = await seedDatabase();
  assert.equal(result.destinationCount, SEED_COUNTS.destinations);
  assert.equal(result.accommodationCount, SEED_COUNTS.accommodations);
});

test('running the seed a second time does not duplicate rows', async () => {
  const first = await seedDatabase();
  const second = await seedDatabase();

  assert.equal(second.destinationCount, first.destinationCount);
  assert.equal(second.accommodationCount, first.accommodationCount);
  assert.equal(second.destinationCount, SEED_COUNTS.destinations);
  assert.equal(second.accommodationCount, SEED_COUNTS.accommodations);
});

test('re-seeding preserves existing row ids (upsert, not insert)', async () => {
  await seedDatabase();
  const before = await prisma.destination.findUniqueOrThrow({ where: { slug: 'lisbon' } });
  await seedDatabase();
  const after = await prisma.destination.findUniqueOrThrow({ where: { slug: 'lisbon' } });

  assert.equal(after.id, before.id);
});
