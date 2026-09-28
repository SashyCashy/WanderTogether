import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import Database from 'better-sqlite3';

/**
 * Covers spec-1-3's, spec-1-4's, and spec-1-5's I/O & Edge-Case Matrices
 * for the trips slice:
 *   - POST /api/trips: create from a Destination, unknown destinationId,
 *     endDate before startDate
 *   - GET /api/trips/:code: happy path, unknown code
 *   - POST /api/trips/:code/members: happy path, unknown code, missing
 *     displayName
 *   - PUT /api/trips/:code/itinerary: save-from-empty, overwrite preserves
 *     order, unknown code, empty-title rejection
 *
 * Same isolation pattern as discovery's routes.test.ts: its own throwaway
 * SQLite file, migrated by replaying every folder under prisma/migrations
 * in order, never touching the shared dev.db.
 */

const tempDir = mkdtempSync(join(tmpdir(), 'wandertogether-trips-routes-test-'));
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

test('POST /api/trips creates a Trip from a Destination and returns it', async () => {
  const response = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Lisbon Friends Trip',
      destinationId: destination.id,
      startDate: '2027-03-14',
      endDate: '2027-03-20',
    }),
  });

  assert.equal(response.status, 201);
  const body = (await response.json()) as {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    createdAt: string;
    destination: { id: string; name: string; country: string };
  };
  assert.equal(body.name, 'Lisbon Friends Trip');
  assert.equal(body.startDate.slice(0, 10), '2027-03-14');
  assert.equal(body.endDate.slice(0, 10), '2027-03-20');
  assert.ok(body.createdAt);
  assert.equal(body.destination.id, destination.id);
  assert.equal(body.destination.name, destination.name);
  assert.equal(body.destination.country, destination.country);
  assert.ok(body.id.length >= 10);
});

test('POST /api/trips returns 400 VALIDATION_ERROR for an unknown destinationId', async () => {
  const response = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Nowhere Trip',
      destinationId: 'not-a-real-destination',
      startDate: '2027-03-14',
      endDate: '2027-03-20',
    }),
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
});

test('POST /api/trips returns 400 VALIDATION_ERROR when a required field is missing (zod parse failure)', async () => {
  const response = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      destinationId: destination.id,
      startDate: '2027-03-14',
      endDate: '2027-03-20',
    }),
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
});

test('POST /api/trips returns 400 VALIDATION_ERROR when endDate is before startDate', async () => {
  const response = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Backwards Trip',
      destinationId: destination.id,
      startDate: '2027-03-20',
      endDate: '2027-03-14',
    }),
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
});

test('GET /api/trips/:code returns the Trip for a valid code', async () => {
  const createResponse = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Fetchable Trip',
      destinationId: destination.id,
      startDate: '2027-06-01',
      endDate: '2027-06-05',
    }),
  });
  const created = (await createResponse.json()) as { id: string };

  const response = await fetch(`${baseUrl}/api/trips/${created.id}`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as { id: string; name: string };
  assert.equal(body.id, created.id);
  assert.equal(body.name, 'Fetchable Trip');
});

test('GET /api/trips/:code returns 404 NOT_FOUND for an unknown code', async () => {
  const response = await fetch(`${baseUrl}/api/trips/not-a-real-code`);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');
});

test('POST /api/trips/:code/members creates a TripMember for a valid code', async () => {
  const createResponse = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Joinable Trip',
      destinationId: destination.id,
      startDate: '2027-07-01',
      endDate: '2027-07-05',
    }),
  });
  const created = (await createResponse.json()) as { id: string };

  const response = await fetch(`${baseUrl}/api/trips/${created.id}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'Marcus' }),
  });

  assert.equal(response.status, 201);
  const body = (await response.json()) as { id: string; displayName: string; joinedAt: string };
  assert.equal(body.displayName, 'Marcus');
  assert.ok(body.id);
  assert.ok(body.joinedAt);
});

test('POST /api/trips/:code/members succeeds when the code is whitespace-padded', async () => {
  const createResponse = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Padded Code Trip',
      destinationId: destination.id,
      startDate: '2027-07-01',
      endDate: '2027-07-05',
    }),
  });
  const created = (await createResponse.json()) as { id: string };

  const response = await fetch(`${baseUrl}/api/trips/${encodeURIComponent(`  ${created.id}  `)}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'Sofia' }),
  });

  assert.equal(response.status, 201);
  const body = (await response.json()) as { displayName: string };
  assert.equal(body.displayName, 'Sofia');
});

test('POST /api/trips/:code/members returns 404 NOT_FOUND for an unknown code', async () => {
  const response = await fetch(`${baseUrl}/api/trips/not-a-real-code/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: 'Sofia' }),
  });

  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');
});

test('POST /api/trips/:code/members returns 400 VALIDATION_ERROR when displayName is missing', async () => {
  const createResponse = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Nameless Joiner Trip',
      destinationId: destination.id,
      startDate: '2027-07-01',
      endDate: '2027-07-05',
    }),
  });
  const created = (await createResponse.json()) as { id: string };

  const response = await fetch(`${baseUrl}/api/trips/${created.id}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
});

test('POST /api/trips/:code/members returns 400 VALIDATION_ERROR when displayName is whitespace-only', async () => {
  const createResponse = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Blank Joiner Trip',
      destinationId: destination.id,
      startDate: '2027-07-01',
      endDate: '2027-07-05',
    }),
  });
  const created = (await createResponse.json()) as { id: string };

  const response = await fetch(`${baseUrl}/api/trips/${created.id}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: '   ' }),
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
});

test('PUT /api/trips/:code/itinerary saves an itinerary from empty', async () => {
  const createResponse = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Itinerary Trip',
      destinationId: destination.id,
      startDate: '2027-08-01',
      endDate: '2027-08-05',
    }),
  });
  const created = (await createResponse.json()) as { id: string };

  const response = await fetch(`${baseUrl}/api/trips/${created.id}/itinerary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ day: 'Day 1', title: 'Arrive, check in' }]),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as { id: string; day: string; title: string; note: string | null }[];
  assert.equal(body.length, 1);
  assert.equal(body[0].day, 'Day 1');
  assert.equal(body[0].title, 'Arrive, check in');
  assert.equal(body[0].note, null);
  assert.ok(body[0].id);
});

test('PUT /api/trips/:code/itinerary overwrites the previous itinerary and preserves submission order', async () => {
  const createResponse = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Reorder Trip',
      destinationId: destination.id,
      startDate: '2027-08-01',
      endDate: '2027-08-05',
    }),
  });
  const created = (await createResponse.json()) as { id: string };

  await fetch(`${baseUrl}/api/trips/${created.id}/itinerary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ day: 'Day 1', title: 'First' }]),
  });

  const response = await fetch(`${baseUrl}/api/trips/${created.id}/itinerary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { day: 'Day 1', title: 'Arrive' },
      { day: 'Day 2', title: 'Explore' },
      { day: 'Day 3', title: 'Depart', note: 'Early flight' },
    ]),
  });

  assert.equal(response.status, 200);
  const body = (await response.json()) as { day: string; title: string; note: string | null }[];
  assert.equal(body.length, 3);
  assert.deepEqual(
    body.map((item) => item.title),
    ['Arrive', 'Explore', 'Depart'],
  );
  assert.equal(body[2].note, 'Early flight');

  const getResponse = await fetch(`${baseUrl}/api/trips/${created.id}`);
  const trip = (await getResponse.json()) as { itineraryItems: { title: string }[] };
  assert.deepEqual(
    trip.itineraryItems.map((item) => item.title),
    ['Arrive', 'Explore', 'Depart'],
  );
});

test('PUT /api/trips/:code/itinerary can overwrite down to an empty array (removing the last line)', async () => {
  const createResponse = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Clearable Trip',
      destinationId: destination.id,
      startDate: '2027-08-01',
      endDate: '2027-08-05',
    }),
  });
  const created = (await createResponse.json()) as { id: string };

  await fetch(`${baseUrl}/api/trips/${created.id}/itinerary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ day: 'Day 1', title: 'Only line' }]),
  });

  const response = await fetch(`${baseUrl}/api/trips/${created.id}/itinerary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([]),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);

  const getResponse = await fetch(`${baseUrl}/api/trips/${created.id}`);
  const trip = (await getResponse.json()) as { itineraryItems: unknown[] };
  assert.equal(trip.itineraryItems.length, 0);
});

test('PUT /api/trips/:code/itinerary returns 404 NOT_FOUND for an unknown code', async () => {
  const response = await fetch(`${baseUrl}/api/trips/not-a-real-code/itinerary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{ day: 'Day 1', title: 'Arrive' }]),
  });

  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');
});

test('PUT /api/trips/:code/itinerary returns 400 VALIDATION_ERROR when a line has an empty title', async () => {
  const createResponse = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bad Line Trip',
      destinationId: destination.id,
      startDate: '2027-08-01',
      endDate: '2027-08-05',
    }),
  });
  const created = (await createResponse.json()) as { id: string };

  const response = await fetch(`${baseUrl}/api/trips/${created.id}/itinerary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      { day: 'Day 1', title: 'Arrive' },
      { day: 'Day 2', title: '' },
    ]),
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');

  // The whole overwrite must be rejected, not just the bad line — the
  // previously-saved itinerary should be untouched.
  const getResponse = await fetch(`${baseUrl}/api/trips/${created.id}`);
  const trip = (await getResponse.json()) as { itineraryItems: unknown[] };
  assert.equal(trip.itineraryItems.length, 0);
});

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
