import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import Database from 'better-sqlite3';

/**
 * Covers spec-1-3's I/O & Edge-Case Matrix for the trips slice:
 *   - POST /api/trips: create from a Destination, unknown destinationId,
 *     endDate before startDate
 *   - GET /api/trips/:code: happy path, unknown code
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
  const body = (await response.json()) as { id: string; name: string; destination: { id: string } };
  assert.equal(body.name, 'Lisbon Friends Trip');
  assert.equal(body.destination.id, destination.id);
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
