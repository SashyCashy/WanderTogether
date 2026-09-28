import { afterEach, describe, expect, test, vi } from 'vitest';
import { ApiError, throwForResponse } from './api';

describe('ApiError', () => {
  test('carries status and code', () => {
    const error = new ApiError(404, 'No Trip matches this code.', 'NOT_FOUND');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.status).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('No Trip matches this code.');
  });

  test('code is optional', () => {
    const error = new ApiError(500, 'Something went wrong.');
    expect(error.code).toBeUndefined();
  });
});

describe('throwForResponse', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('parses the shared error envelope into an ApiError', async () => {
    const response = new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'title is required.' } }), {
      status: 400,
    });

    await expect(throwForResponse(response)).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'title is required.',
    });
  });

  test('falls back to a generic message when the response body is not the shared envelope', async () => {
    const response = new Response('not json', { status: 500 });

    await expect(throwForResponse(response)).rejects.toMatchObject({
      status: 500,
      code: undefined,
      message: 'Request failed with status 500',
    });
  });

  test('falls back to a generic message when the envelope has no message', async () => {
    const response = new Response(JSON.stringify({ error: {} }), { status: 404 });

    await expect(throwForResponse(response)).rejects.toMatchObject({
      status: 404,
      message: 'Request failed with status 404',
    });
  });
});
