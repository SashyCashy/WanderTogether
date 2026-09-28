import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import Database from 'better-sqlite3';

/**
 * Covers spec-3-1's and spec-3-2's I/O & Edge-Case Matrices for the
 * write-ups slice:
 *   - POST /api/write-ups: with/without a Destination link, no photo
 *     provided, an oversized photo, a disallowed file type, unknown
 *     destinationId — each verified not to leak an orphaned uploaded file
 *     on rejection.
 *   - GET /api/write-ups: unfiltered, Destination-filtered (including a
 *     Destination with zero matches), and a page past the last one.
 *   - GET /api/write-ups/:id: a real id and an unknown one.
 *
 * Same isolation pattern as the other slices' routes.test.ts: its own
 * throwaway SQLite file, migrated by replaying every folder under
 * prisma/migrations in order, never touching the shared dev.db.
 */

const tempDir = mkdtempSync(join(tmpdir(), 'wandertogether-write-ups-routes-test-'));
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
const uploadsDir = join(import.meta.dirname, '../../../uploads');
const filesBeforeAllTests = new Set(readdirSync(uploadsDir));

after(async () => {
  server.close();
  await prisma.$disconnect();
  rmSync(tempDir, { recursive: true, force: true });
});

await seedDatabase();
const destination = await prisma.destination.findFirstOrThrow();

function tinyPngBlob(): Blob {
  // A minimal valid 1x1 transparent PNG.
  const base64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  return new Blob([Buffer.from(base64, 'base64')], { type: 'image/png' });
}

/** Every file currently in uploads/ that wasn't there before this test file ran. */
function newUploadedFiles(): string[] {
  return readdirSync(uploadsDir).filter((name) => !filesBeforeAllTests.has(name));
}

async function publishWriteup(overrides: { title: string; destinationId?: string }): Promise<{ id: string }> {
  const form = new FormData();
  form.set('title', overrides.title);
  form.set('body', `Body for ${overrides.title}.`);
  if (overrides.destinationId) form.set('destinationId', overrides.destinationId);
  form.set('photos', tinyPngBlob(), 'photo.png');

  const response = await fetch(`${baseUrl}/api/write-ups`, { method: 'POST', body: form });
  const body = (await response.json()) as { id: string };
  assert.equal(response.status, 201, `publishWriteup helper's own POST must succeed, got ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

test('POST /api/write-ups publishes with a Destination link and writes the photo to uploads/', async () => {
  const form = new FormData();
  form.set('title', 'Three Days in Lisbon');
  form.set('body', 'We wandered the Alfama and ate too many pastéis de nata.');
  form.set('destinationId', destination.id);
  form.set('photos', tinyPngBlob(), 'lisbon.png');

  const response = await fetch(`${baseUrl}/api/write-ups`, { method: 'POST', body: form });
  assert.equal(response.status, 201);
  const body = (await response.json()) as { id: string; photoUrls: string[]; destinationId: string | null };
  assert.equal(body.destinationId, destination.id);
  assert.equal(body.photoUrls.length, 1);
  assert.match(body.photoUrls[0], /^\/uploads\/.+\.png$/);

  const filename = body.photoUrls[0].replace('/uploads/', '');
  assert.ok(existsSync(join(uploadsDir, filename)), 'uploaded file should exist on disk');

  const photoResponse = await fetch(`${baseUrl}${body.photoUrls[0]}`);
  assert.equal(photoResponse.status, 200, 'the static /uploads mount should serve the file the API just referenced');
});

test('POST /api/write-ups publishes without a Destination link', async () => {
  const form = new FormData();
  form.set('title', 'A Trip With No Destination Link');
  form.set('body', 'Sometimes you just want to write about it.');
  form.set('photos', tinyPngBlob(), 'photo.png');

  const response = await fetch(`${baseUrl}/api/write-ups`, { method: 'POST', body: form });
  assert.equal(response.status, 201);
  const body = (await response.json()) as { destinationId: string | null };
  assert.equal(body.destinationId, null);
});

test('POST /api/write-ups returns 400 VALIDATION_ERROR when no photo is provided, with no orphaned file', async () => {
  const before = newUploadedFiles().length;
  const form = new FormData();
  form.set('title', 'No Photo Write-up');
  form.set('body', 'This should be rejected.');

  const response = await fetch(`${baseUrl}/api/write-ups`, { method: 'POST', body: form });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
  assert.equal(newUploadedFiles().length, before);
});

test('POST /api/write-ups returns 400 VALIDATION_ERROR for a disallowed file type, with no orphaned file', async () => {
  const before = newUploadedFiles().length;
  const form = new FormData();
  form.set('title', 'Wrong File Type');
  form.set('body', 'This should be rejected.');
  form.set('photos', new Blob([Buffer.from('not-an-image')], { type: 'application/pdf' }), 'notes.pdf');

  const response = await fetch(`${baseUrl}/api/write-ups`, { method: 'POST', body: form });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
  assert.equal(newUploadedFiles().length, before, 'a rejected file type must not be written to disk');
});

test('POST /api/write-ups returns 400 VALIDATION_ERROR for an unknown destinationId, with no orphaned file', async () => {
  const before = newUploadedFiles().length;
  const form = new FormData();
  form.set('title', 'Unknown Destination Write-up');
  form.set('body', 'This should be rejected.');
  form.set('destinationId', 'not-a-real-destination');
  form.set('photos', tinyPngBlob(), 'photo.png');

  const response = await fetch(`${baseUrl}/api/write-ups`, { method: 'POST', body: form });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
  assert.equal(newUploadedFiles().length, before, 'a photo uploaded before a later validation failure must be cleaned up');
});

test('POST /api/write-ups returns 400 VALIDATION_ERROR when title is missing, with no orphaned file', async () => {
  const before = newUploadedFiles().length;
  const form = new FormData();
  form.set('body', 'Missing a title.');
  form.set('photos', tinyPngBlob(), 'photo.png');

  const response = await fetch(`${baseUrl}/api/write-ups`, { method: 'POST', body: form });
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'VALIDATION_ERROR');
  assert.equal(newUploadedFiles().length, before);
});

test('POST /api/write-ups returns 413 FILE_TOO_LARGE for a photo over the 5MB limit, with no orphaned file', async () => {
  const before = newUploadedFiles().length;
  const form = new FormData();
  form.set('title', 'Oversized Photo Write-up');
  form.set('body', 'This should be rejected.');
  const oversized = new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'image/png' });
  form.set('photos', oversized, 'huge.png');

  const response = await fetch(`${baseUrl}/api/write-ups`, { method: 'POST', body: form });
  assert.equal(response.status, 413);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'FILE_TOO_LARGE');
  assert.equal(newUploadedFiles().length, before, 'an oversized upload must not leave a file behind');
});

test('POST /api/write-ups returns 400 VALIDATION_ERROR for more than 6 photos, with no orphaned files', async () => {
  const before = newUploadedFiles().length;
  const form = new FormData();
  form.set('title', 'Too Many Photos');
  form.set('body', 'This should be rejected.');
  for (let i = 0; i < 7; i += 1) {
    form.append('photos', tinyPngBlob(), `photo-${i}.png`);
  }

  const response = await fetch(`${baseUrl}/api/write-ups`, { method: 'POST', body: form });
  assert.equal(response.status, 400);
  assert.equal(
    newUploadedFiles().length,
    before,
    'files already written before multer rejects the 7th one must be cleaned up, not left as orphans',
  );
});

test('GET /api/write-ups lists write-ups newest-first and honors the Destination filter', async () => {
  const otherDestination = await prisma.destination.findFirstOrThrow({ where: { id: { not: destination.id } } });

  const linked = await publishWriteup({ title: 'Filter Target Write-up', destinationId: destination.id });
  const unlinked = await publishWriteup({ title: 'Unlinked Write-up' });

  const unfiltered = await fetch(`${baseUrl}/api/write-ups?page=1&pageSize=50`);
  assert.equal(unfiltered.status, 200);
  const unfilteredBody = (await unfiltered.json()) as { items: { id: string }[]; totalCount: number };
  const unfilteredIds = unfilteredBody.items.map((item) => item.id);
  assert.ok(unfilteredIds.includes(linked.id), 'the Destination-linked write-up appears in the unfiltered listing');
  assert.ok(unfilteredIds.includes(unlinked.id), 'the write-up with no Destination link still appears in the unfiltered listing');
  assert.equal(unfilteredBody.items[0].id, unlinked.id, 'newest write-up (published last) should sort first');

  const filtered = await fetch(`${baseUrl}/api/write-ups?destinationId=${encodeURIComponent(destination.id)}&page=1&pageSize=50`);
  assert.equal(filtered.status, 200);
  const filteredBody = (await filtered.json()) as { items: { id: string }[] };
  const filteredIds = filteredBody.items.map((item) => item.id);
  assert.ok(filteredIds.includes(linked.id), 'the linked write-up appears in its Destination-filtered listing');
  assert.ok(!filteredIds.includes(unlinked.id), 'a write-up with no Destination link is excluded from a Destination-filtered view');

  const zeroMatches = await fetch(`${baseUrl}/api/write-ups?destinationId=${encodeURIComponent(otherDestination.id)}&page=1`);
  assert.equal(zeroMatches.status, 200);
  const zeroMatchesBody = (await zeroMatches.json()) as { items: unknown[]; totalCount: number };
  assert.deepEqual(zeroMatchesBody.items, []);
  assert.equal(zeroMatchesBody.totalCount, 0);
});

test('GET /api/write-ups returns an empty page (not a 400) past the last page', async () => {
  const response = await fetch(`${baseUrl}/api/write-ups?page=9999&pageSize=10`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as { items: unknown[] };
  assert.deepEqual(body.items, []);
});

test('GET /api/write-ups/:id returns the full write-up, including its Destination', async () => {
  const created = await publishWriteup({ title: 'Detail View Write-up', destinationId: destination.id });

  const response = await fetch(`${baseUrl}/api/write-ups/${created.id}`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as { id: string; title: string; destination: { name: string; country: string } | null };
  assert.equal(body.id, created.id);
  assert.equal(body.title, 'Detail View Write-up');
  assert.deepEqual(body.destination, { name: destination.name, country: destination.country });
});

test('GET /api/write-ups/:id returns 404 NOT_FOUND for an unknown id', async () => {
  const response = await fetch(`${baseUrl}/api/write-ups/not-a-real-id`);
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal((body as { error: { code: string } }).error.code, 'NOT_FOUND');
});

test('GET /api/write-ups returns 400 VALIDATION_ERROR for out-of-range pagination params', async () => {
  const zeroPage = await fetch(`${baseUrl}/api/write-ups?page=0`);
  assert.equal(zeroPage.status, 400);

  const negativePage = await fetch(`${baseUrl}/api/write-ups?page=-1`);
  assert.equal(negativePage.status, 400);

  const oversizedPageSize = await fetch(`${baseUrl}/api/write-ups?pageSize=51`);
  assert.equal(oversizedPageSize.status, 400);

  const nonNumericPage = await fetch(`${baseUrl}/api/write-ups?page=not-a-number`);
  assert.equal(nonNumericPage.status, 400);
});

test('GET /api/write-ups pages correctly across a boundary, preserving newest-first order', async () => {
  const isolationDestination = await prisma.destination.create({
    data: { id: `pagination-test-${Date.now()}`, slug: `pagination-test-${Date.now()}`, name: 'Pagination Test Destination', country: 'Testland', region: 'Test', tripType: 'Test', description: 'x', photoUrl: '/x.jpg' },
  });

  const created: string[] = [];
  for (let i = 0; i < 12; i += 1) {
    const writeup = await publishWriteup({ title: `Pagination Write-up ${i}`, destinationId: isolationDestination.id });
    created.push(writeup.id);
  }
  // Published in order 0..11, so newest-first means id[11] is first.
  const expectedNewestFirst = [...created].reverse();

  const page1 = await fetch(`${baseUrl}/api/write-ups?destinationId=${isolationDestination.id}&page=1&pageSize=10`);
  const page1Body = (await page1.json()) as { items: { id: string }[] };
  const page2 = await fetch(`${baseUrl}/api/write-ups?destinationId=${isolationDestination.id}&page=2&pageSize=10`);
  const page2Body = (await page2.json()) as { items: { id: string }[] };

  assert.equal(page1Body.items.length, 10);
  assert.equal(page2Body.items.length, 2);
  assert.deepEqual(
    page1Body.items.map((item) => item.id),
    expectedNewestFirst.slice(0, 10),
  );
  assert.deepEqual(
    page2Body.items.map((item) => item.id),
    expectedNewestFirst.slice(10, 12),
  );
  const overlap = page1Body.items.filter((item) => page2Body.items.some((other) => other.id === item.id));
  assert.deepEqual(overlap, [], 'page 1 and page 2 must not overlap');
});
