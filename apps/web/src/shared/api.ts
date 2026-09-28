/**
 * Shared across every feature slice's `api.ts` — thrown so callers can
 * branch on the shared error envelope's `status`/`code` (e.g. a 404 vs.
 * a generic failure). Previously duplicated verbatim in all 5 slices
 * (discover, trip-detail, buddies, write-ups, accommodations); extracted
 * per epic-1-retro-2026-09-28.md's action item once the 5th copy landed.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Parses the shared `{ error: { code, message } }` envelope and throws an `ApiError` from it. */
export async function throwForResponse(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  throw new ApiError(response.status, body?.error?.message ?? `Request failed with status ${response.status}`, body?.error?.code);
}
