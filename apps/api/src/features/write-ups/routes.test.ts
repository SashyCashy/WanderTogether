import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { AddressInfo } from 'node:net';
import { after, test } from 'node:test';
import Database from 'better-sqlite3';

/**
 * Covers spec-3-1's I/O & Edge-Case Matrix for the write-ups slice:
 *   - POST /api/write-ups: with/without a Destination link, no photo
 *     provided, an oversized photo, a disallowed file type, unknown
 *     destinationId — each verified not to leak an orphaned uploaded file
 *     on rejection.
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
