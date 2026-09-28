import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import Database from 'better-sqlite3';

/**
 * Covers spec-2-3's I/O & Edge-Case Matrix for the buddy-request routes
 * mounted on the trips slice: `GET /api/trips/:code/buddy-requests`,
 * `POST .../accept`, `POST .../decline` — including the concurrent-accept
 * race-condition regression test (spec-2-3's standout finding).
 *
 * Split out of a single trips/routes.test.ts per epic-2-retro-2026-09-28.md's
 * action item — see trips-crud.routes.test.ts's header comment for the
 * full rationale. Same isolation pattern as every other slice's
 * routes.test.ts.
 */

const tempDir = mkdtempSync(join(tmpdir(), 'wandertogether-trips-buddy-requests-routes-test-'));
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

/** Opens `tripId` to buddies and submits one request against it, returning the new request's id. */
async function submitRequestToTrip(tripId: string, requesterName: string): Promise<string> {
  await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openToBuddies: true }),
  });

  const listings = (await (await fetch(`${baseUrl}/api/buddies`)).json()) as { buddyListingId: string; name: string }[];
  const trip = (await (await fetch(`${baseUrl}/api/trips/${tripId}`)).json()) as { name: string };
  const listing = listings.find((item) => item.name === trip.name);
  if (!listing) throw new Error('Listing not found in GET /api/buddies response');

  const response = await fetch(`${baseUrl}/api/buddies/${listing.buddyListingId}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requesterName }),
  });
  const request = (await response.json()) as { id: string };
  return request.id;
}

test('GET /api/trips/:code/buddy-requests returns [] when nothing is pending', async () => {
  const tripId = await createTripForSettingsTest('No Requests Trip');

  const response = await fetch(`${baseUrl}/api/trips/${tripId}/buddy-requests`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test('GET /api/trips/:code/buddy-requests lists pending requests', async () => {
  const tripId = await createTripForSettingsTest('Pending Requests Trip');
  await submitRequestToTrip(tripId, 'Sofia');

  const response = await fetch(`${baseUrl}/api/trips/${tripId}/buddy-requests`);
  assert.equal(response.status, 200);
  const requests = (await response.json()) as { requesterName: string; id: string }[];
  assert.equal(requests.length, 1);
  assert.equal(requests[0].requesterName, 'Sofia');
});

test('GET /api/trips/:code/buddy-requests returns 404 NOT_FOUND for an unknown Trip Code', async () => {
  const response = await fetch(`${baseUrl}/api/trips/not-a-real-code/buddy-requests`);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');
});

test('POST /api/trips/:code/buddy-requests/:requestId/accept adds a TripMember via the shared addMember path and marks the request accepted', async () => {
  const tripId = await createTripForSettingsTest('Accept Trip');
  const requestId = await submitRequestToTrip(tripId, 'Marcus');

  const response = await fetch(`${baseUrl}/api/trips/${tripId}/buddy-requests/${requestId}/accept`, { method: 'POST' });
  assert.equal(response.status, 201);
  const member = (await response.json()) as { displayName: string };
  assert.equal(member.displayName, 'Marcus');

  const pendingResponse = await fetch(`${baseUrl}/api/trips/${tripId}/buddy-requests`);
  assert.deepEqual(await pendingResponse.json(), []);
});

test('POST /api/trips/:code/buddy-requests/:requestId/decline creates no TripMember and marks the request declined', async () => {
  const tripId = await createTripForSettingsTest('Decline Trip');
  const requestId = await submitRequestToTrip(tripId, 'Sofia');
  const membersBefore = await prisma.tripMember.count({ where: { tripId } });

  const response = await fetch(`${baseUrl}/api/trips/${tripId}/buddy-requests/${requestId}/decline`, { method: 'POST' });
  assert.equal(response.status, 200);

  const membersAfter = await prisma.tripMember.count({ where: { tripId } });
  assert.equal(membersAfter, membersBefore, 'decline must not create a TripMember');

  const pendingResponse = await fetch(`${baseUrl}/api/trips/${tripId}/buddy-requests`);
  assert.deepEqual(await pendingResponse.json(), []);
});

test('POST accept on an already-declined request returns 409 CONFLICT', async () => {
  const tripId = await createTripForSettingsTest('Double Handle Trip');
  const requestId = await submitRequestToTrip(tripId, 'Priya');

  await fetch(`${baseUrl}/api/trips/${tripId}/buddy-requests/${requestId}/decline`, { method: 'POST' });
  const response = await fetch(`${baseUrl}/api/trips/${tripId}/buddy-requests/${requestId}/accept`, { method: 'POST' });

  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'CONFLICT');
});

test('POST accept with a requestId that belongs to a different Trip returns 404 NOT_FOUND', async () => {
  const tripAId = await createTripForSettingsTest('Trip A');
  const tripBId = await createTripForSettingsTest('Trip B');
  const requestId = await submitRequestToTrip(tripAId, 'Cross Trip Requester');

  const response = await fetch(`${baseUrl}/api/trips/${tripBId}/buddy-requests/${requestId}/accept`, { method: 'POST' });
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');
});

test('POST decline with a requestId that belongs to a different Trip returns 404 NOT_FOUND', async () => {
  const tripAId = await createTripForSettingsTest('Trip C');
  const tripBId = await createTripForSettingsTest('Trip D');
  const requestId = await submitRequestToTrip(tripAId, 'Another Cross Trip Requester');

  const response = await fetch(`${baseUrl}/api/trips/${tripBId}/buddy-requests/${requestId}/decline`, { method: 'POST' });
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');

  // The request itself must be untouched by the failed cross-trip attempt.
  const requestsOnTripA = await fetch(`${baseUrl}/api/trips/${tripAId}/buddy-requests`).then((r) => r.json() as Promise<unknown[]>);
  assert.equal(requestsOnTripA.length, 1);
});

test('POST accept: two concurrent requests for the same pending request only create one TripMember', async () => {
  const tripId = await createTripForSettingsTest('Concurrent Accept Trip');
  const requestId = await submitRequestToTrip(tripId, 'Race Condition Requester');

  const [first, second] = await Promise.all([
    fetch(`${baseUrl}/api/trips/${tripId}/buddy-requests/${requestId}/accept`, { method: 'POST' }),
    fetch(`${baseUrl}/api/trips/${tripId}/buddy-requests/${requestId}/accept`, { method: 'POST' }),
  ]);

  const statuses = [first.status, second.status].sort();
  assert.deepEqual(statuses, [201, 409], 'exactly one concurrent accept should win, the other should conflict');

  const members = await prisma.tripMember.findMany({ where: { tripId, displayName: 'Race Condition Requester' } });
  assert.equal(members.length, 1, 'a race between two concurrent accepts must not create two TripMember rows');
});
