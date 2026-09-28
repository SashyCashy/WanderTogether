import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import Database from 'better-sqlite3';

/**
 * Covers spec-2-2's I/O & Edge-Case Matrix for the buddies slice:
 *   - GET /api/buddies: listing (empty + populated), never includes `id`
 *   - GET /api/buddies/:buddyListingId: happy path, unknown/closed listing
 *   - POST /api/buddies/:buddyListingId/requests: happy path, unknown
 *     listing, missing requesterName
 *   - GET /api/buddies/requests/:requestId: pending status, unknown id
 *
 * Same isolation pattern as trips'/discovery's routes.test.ts: its own
 * throwaway SQLite file, migrated by replaying every folder under
 * prisma/migrations in order, never touching the shared dev.db.
 */

const tempDir = mkdtempSync(join(tmpdir(), 'wandertogether-buddies-routes-test-'));
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

async function createOpenTrip(name: string, buddyNote: string | null = null): Promise<string> {
  const createResponse = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      destinationId: destination.id,
      startDate: '2027-11-01',
      endDate: '2027-11-05',
    }),
  });
  const trip = (await createResponse.json()) as { id: string };

  await fetch(`${baseUrl}/api/trips/${trip.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openToBuddies: true, ...(buddyNote ? { buddyNote } : {}) }),
  });

  return trip.id;
}

async function getBuddyListingId(tripId: string): Promise<string> {
  const listings = (await (await fetch(`${baseUrl}/api/buddies`)).json()) as { name: string; buddyListingId: string }[];
  const trip = await fetch(`${baseUrl}/api/trips/${tripId}`).then((r) => r.json() as Promise<{ name: string }>);
  const listing = listings.find((item) => item.name === trip.name);
  if (!listing) throw new Error('Listing not found in GET /api/buddies response');
  return listing.buddyListingId;
}

test('GET /api/buddies lists open Trips and never includes a Trip Code/id field', async () => {
  const tripId = await createOpenTrip('Open Listing Trip', '2 spots, chill about hostels');

  const response = await fetch(`${baseUrl}/api/buddies`);
  assert.equal(response.status, 200);
  const listings = (await response.json()) as Record<string, unknown>[];

  const listing = listings.find((item) => item.name === 'Open Listing Trip');
  assert.ok(listing, 'expected the open trip to appear in the listing');
  assert.equal(listing!.buddyNote, '2 spots, chill about hostels');
  assert.ok(!('id' in listing!), 'response must never include the raw Trip id/code');
  assert.ok(!('code' in listing!), 'response must never include a code field');
  assert.notEqual(listing!.buddyListingId, tripId, 'buddyListingId must differ from the real Trip Code');
});

test('GET /api/buddies does not list a Trip that is not open to buddies', async () => {
  const createResponse = await fetch(`${baseUrl}/api/trips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Closed Trip',
      destinationId: destination.id,
      startDate: '2027-11-01',
      endDate: '2027-11-05',
    }),
  });
  const trip = (await createResponse.json()) as { id: string };

  const response = await fetch(`${baseUrl}/api/buddies`);
  const listings = (await response.json()) as { name: string }[];
  assert.ok(!listings.some((item) => item.name === 'Closed Trip'));
  void trip;
});

test('GET /api/buddies/:buddyListingId returns the single listing', async () => {
  const tripId = await createOpenTrip('Single Listing Trip');
  const buddyListingId = await getBuddyListingId(tripId);

  const response = await fetch(`${baseUrl}/api/buddies/${buddyListingId}`);
  assert.equal(response.status, 200);
  const listing = (await response.json()) as { name: string };
  assert.equal(listing.name, 'Single Listing Trip');
});

test('GET /api/buddies/:buddyListingId returns 404 NOT_FOUND for an unknown listing', async () => {
  const response = await fetch(`${baseUrl}/api/buddies/not-a-real-listing-id`);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');
});

test('POST /api/buddies/:buddyListingId/requests creates a pending request and no TripMember', async () => {
  const tripId = await createOpenTrip('Request Target Trip');
  const buddyListingId = await getBuddyListingId(tripId);
  const membersBefore = await prisma.tripMember.count({ where: { tripId } });

  const response = await fetch(`${baseUrl}/api/buddies/${buddyListingId}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requesterName: 'Sofia', message: "I'm flexible on dates!" }),
  });

  assert.equal(response.status, 201);
  const body = (await response.json()) as { id: string; status: string };
  assert.equal(body.status, 'pending');
  assert.ok(body.id);

  const membersAfter = await prisma.tripMember.count({ where: { tripId } });
  assert.equal(membersAfter, membersBefore, 'submitting a request must not create a TripMember');
});

test('POST /api/buddies/:buddyListingId/requests returns 404 NOT_FOUND for an unknown listing', async () => {
  const response = await fetch(`${baseUrl}/api/buddies/not-a-real-listing-id/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requesterName: 'Sofia' }),
  });

  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');
});

test('POST /api/buddies/:buddyListingId/requests returns 400 VALIDATION_ERROR when requesterName is missing', async () => {
  const tripId = await createOpenTrip('Missing Name Trip');
  const buddyListingId = await getBuddyListingId(tripId);

  const response = await fetch(`${baseUrl}/api/buddies/${buddyListingId}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hi!' }),
  });

  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
});

test('GET /api/buddies/requests/:requestId returns pending status with no tripCode field', async () => {
  const tripId = await createOpenTrip('Status Check Trip');
  const buddyListingId = await getBuddyListingId(tripId);

  const submitResponse = await fetch(`${baseUrl}/api/buddies/${buddyListingId}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requesterName: 'Marcus' }),
  });
  const submitted = (await submitResponse.json()) as { id: string };

  const response = await fetch(`${baseUrl}/api/buddies/requests/${submitted.id}`);
  assert.equal(response.status, 200);
  const status = (await response.json()) as Record<string, unknown>;
  assert.equal(status.status, 'pending');
  assert.ok(!('tripCode' in status), 'tripCode must only appear once accepted');
});

test('GET /api/buddies/requests/:requestId returns 404 NOT_FOUND for an unknown request', async () => {
  const response = await fetch(`${baseUrl}/api/buddies/requests/not-a-real-request-id`);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');
});

test('GET /api/buddies/:buddyListingId returns 404 NOT_FOUND for a listing that was open and is now closed', async () => {
  const tripId = await createOpenTrip('Later Closed Trip (GET)');
  const buddyListingId = await getBuddyListingId(tripId);

  await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openToBuddies: false }),
  });

  const response = await fetch(`${baseUrl}/api/buddies/${buddyListingId}`);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');
});

test('POST /api/buddies/:buddyListingId/requests returns 404 NOT_FOUND for a listing that was open and is now closed', async () => {
  const tripId = await createOpenTrip('Later Closed Trip (POST)');
  const buddyListingId = await getBuddyListingId(tripId);

  await fetch(`${baseUrl}/api/trips/${tripId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openToBuddies: false }),
  });

  const requestsBefore = await prisma.travelBuddyRequest.count({ where: { tripId } });

  const response = await fetch(`${baseUrl}/api/buddies/${buddyListingId}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requesterName: 'Late Sofia' }),
  });
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');

  const requestsAfter = await prisma.travelBuddyRequest.count({ where: { tripId } });
  assert.equal(requestsAfter, requestsBefore, 'no TravelBuddyRequest should be created against a closed Trip');
});
