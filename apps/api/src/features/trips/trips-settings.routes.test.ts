import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import Database from 'better-sqlite3';

/**
 * Covers spec-2-1's and spec-4-2's I/O & Edge-Case Matrices for
 * `PATCH /api/trips/:code` (AD-8's partial-merge endpoint) across all
 * three fields it accepts: `openToBuddies`, `buddyNote`, and
 * `attachedAccommodationId`.
 *
 * Split out of a single trips/routes.test.ts per epic-2-retro-2026-09-28.md's
 * action item — see trips-crud.routes.test.ts's header comment for the
 * full rationale. Same isolation pattern as every other slice's
 * routes.test.ts.
 */

const tempDir = mkdtempSync(join(tmpdir(), 'wandertogether-trips-settings-routes-test-'));
const tempDbPath = join(tempDir, 'test.db');
process.env.DATABASE_URL = `file:${tempDbPath}`;

const migrationsDir = join(import.meta.dirname, '../../../prisma/migrations');
const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const db = new Database(tempDbPath);
for (const folder of migrationFolders) {
  db.exec(readFileSync(join(migrationsDir, folder, 'migration.sql'), 'utf-8'));
}
db.close();

const { createApp } = await import('../../app.js');
const { prisma } = await import('../../shared/prisma.js');
const { seedDatabase } = await import('../../../prisma/seed.js');

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
const destination = await prisma.destination.findFirstOrThrow();

async function createTripForSettingsTest(name: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      destinationId: destination.id,
      startDate: '2027-09-01',
      endDate: '2027-09-05',
    }),
  });
  const trip = (await response.json()) as { id: string };
  return trip.id;
}

test('PATCH /api/trips/:code toggles openToBuddies without touching buddyNote', async () => {
  const tripId = await createTripForSettingsTest('Buddy Toggle Trip');

  const response = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openToBuddies: true }),
  });

  assert.equal(response.status, 200);
  const trip = (await response.json()) as { openToBuddies: boolean; buddyNote: string | null };
  assert.equal(trip.openToBuddies, true);
  assert.equal(trip.buddyNote, null);
});

test('PATCH /api/trips/:code toggling off leaves buddyNote untouched', async () => {
  const tripId = await createTripForSettingsTest('Buddy Toggle Off Trip');

  await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openToBuddies: true, buddyNote: '2 spots, chill about hostels' }),
  });

  const response = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openToBuddies: false }),
  });

  assert.equal(response.status, 200);
  const trip = (await response.json()) as { openToBuddies: boolean; buddyNote: string | null };
  assert.equal(trip.openToBuddies, false);
  assert.equal(trip.buddyNote, '2 spots, chill about hostels');
});

test('PATCH /api/trips/:code saves a note independently of openToBuddies', async () => {
  const tripId = await createTripForSettingsTest('Buddy Note Trip');

  const response = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buddyNote: 'Looking for two more.' }),
  });

  assert.equal(response.status, 200);
  const trip = (await response.json()) as { openToBuddies: boolean; buddyNote: string | null };
  assert.equal(trip.buddyNote, 'Looking for two more.');
  assert.equal(trip.openToBuddies, false);
});

test('PATCH /api/trips/:code returns 400 VALIDATION_ERROR for an empty body', async () => {
  const tripId = await createTripForSettingsTest('Empty Patch Trip');

  const response = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
});

test('PATCH /api/trips/:code returns 404 NOT_FOUND for an unknown code', async () => {
  const response = await fetch(`${baseUrl}/api/trips/not-a-real-code`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openToBuddies: true }),
  });

  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');
});

test('PATCH /api/trips/:code applies both fields together in one request', async () => {
  const tripId = await createTripForSettingsTest('Combined Patch Trip');

  const response = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openToBuddies: true, buddyNote: 'Room for two more' }),
  });

  assert.equal(response.status, 200);
  const trip = (await response.json()) as { openToBuddies: boolean; buddyNote: string | null };
  assert.equal(trip.openToBuddies, true);
  assert.equal(trip.buddyNote, 'Room for two more');
});

test('PATCH /api/trips/:code accepts a buddyNote at the 280-char limit and rejects one over it', async () => {
  const tripId = await createTripForSettingsTest('Note Length Trip');

  const atLimit = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buddyNote: 'x'.repeat(280) }),
  });
  assert.equal(atLimit.status, 200);
  const atLimitBody = (await atLimit.json()) as { buddyNote: string | null };
  assert.equal(atLimitBody.buddyNote?.length, 280);

  const overLimit = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buddyNote: 'x'.repeat(281) }),
  });
  assert.equal(overLimit.status, 400);
  const overLimitBody = await overLimit.json();
  assert.equal((overLimitBody as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
});

test('PATCH /api/trips/:code normalizes an empty-string buddyNote to null', async () => {
  const tripId = await createTripForSettingsTest('Empty Note Trip');

  const response = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ buddyNote: '   ' }),
  });

  assert.equal(response.status, 200);
  const trip = (await response.json()) as { buddyNote: string | null };
  assert.equal(trip.buddyNote, null);
});

const lisbonDestination = await prisma.destination.findFirstOrThrow({ where: { slug: 'lisbon' } });
const lisbonAccommodations = await prisma.accommodationListing.findMany({
  where: { destinationId: lisbonDestination.id },
  orderBy: { name: 'asc' },
});

async function createLisbonTripForAccommodationTest(name: string): Promise<string> {
  const response = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, destinationId: lisbonDestination.id, startDate: '2027-09-01', endDate: '2027-09-05' }),
  });
  const trip = (await response.json()) as { id: string };
  return trip.id;
}

test('PATCH /api/trips/:code attaches an accommodation listing', async () => {
  const tripId = await createLisbonTripForAccommodationTest('Attach Accommodation Trip');
  const listing = lisbonAccommodations[0];

  const response = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attachedAccommodationId: listing.id }),
  });

  assert.equal(response.status, 200);
  const trip = (await response.json()) as { attachedAccommodationId: string | null; attachedAccommodation: { id: string; name: string } | null };
  assert.equal(trip.attachedAccommodationId, listing.id);
  assert.equal(trip.attachedAccommodation?.id, listing.id);
  assert.equal(trip.attachedAccommodation?.name, listing.name);
});

test('PATCH /api/trips/:code replaces an already-attached accommodation listing', async () => {
  const tripId = await createLisbonTripForAccommodationTest('Replace Accommodation Trip');
  const [first, second] = lisbonAccommodations;

  await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attachedAccommodationId: first.id }),
  });

  const response = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attachedAccommodationId: second.id }),
  });

  assert.equal(response.status, 200);
  const trip = (await response.json()) as { attachedAccommodationId: string | null };
  assert.equal(trip.attachedAccommodationId, second.id);
});

test('PATCH /api/trips/:code returns 400 VALIDATION_ERROR for an unknown attachedAccommodationId, leaving the Trip unchanged', async () => {
  const tripId = await createLisbonTripForAccommodationTest('Unknown Accommodation Trip');
  const listing = lisbonAccommodations[0];

  await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attachedAccommodationId: listing.id }),
  });

  const response = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attachedAccommodationId: 'not-a-real-accommodation' }),
  });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');

  const tripAfter = (await (await fetch(`${baseUrl}/api/trips/${tripId}`)).json()) as { attachedAccommodationId: string | null };
  assert.equal(tripAfter.attachedAccommodationId, listing.id, 'a rejected attach must not change the Trip’s existing attachment');
});

test('PATCH /api/trips/:code attaching an accommodation never touches openToBuddies/buddyNote', async () => {
  const tripId = await createLisbonTripForAccommodationTest('Independent Fields Trip');
  const listing = lisbonAccommodations[0];

  await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openToBuddies: true, buddyNote: 'Looking for one more.' }),
  });

  const response = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attachedAccommodationId: listing.id }),
  });

  assert.equal(response.status, 200);
  const trip = (await response.json()) as { openToBuddies: boolean; buddyNote: string | null; attachedAccommodationId: string | null };
  assert.equal(trip.openToBuddies, true);
  assert.equal(trip.buddyNote, 'Looking for one more.');
  assert.equal(trip.attachedAccommodationId, listing.id);
});

test('PATCH /api/trips/:code accepts attachedAccommodationId: null to clear an attachment', async () => {
  const tripId = await createLisbonTripForAccommodationTest('Clear Accommodation Trip');
  const listing = lisbonAccommodations[0];

  await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attachedAccommodationId: listing.id }),
  });

  const response = await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attachedAccommodationId: null }),
  });

  assert.equal(response.status, 200);
  const trip = (await response.json()) as { attachedAccommodationId: string | null; attachedAccommodation: unknown };
  assert.equal(trip.attachedAccommodationId, null);
  assert.equal(trip.attachedAccommodation, null);
});
