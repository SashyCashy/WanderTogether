import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import Database from 'better-sqlite3';

/**
 * Covers spec-1-5's I/O & Edge-Case Matrix for `PUT /api/trips/:code/itinerary`:
 * save-from-empty, overwrite preserves order, overwrite down to empty,
 * unknown code, empty-title rejection.
 *
 * Split out of a single trips/routes.test.ts per epic-2-retro-2026-09-28.md's
 * action item — see trips-crud.routes.test.ts's header comment for the
 * full rationale. Same isolation pattern as every other slice's
 * routes.test.ts.
 */

const tempDir = mkdtempSync(join(tmpdir(), 'wandertogether-trips-itinerary-routes-test-'));
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
