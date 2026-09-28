export interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  tripType: string;
  description: string;
  photoUrl: string;
}

/** Thrown by `fetchDestinations` so callers can branch on the shared error envelope's `status`/`code`. */
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

/**
 * One unfiltered fetch of the full catalog — filtering happens
 * client-side (spec-1-2's Boundaries & Constraints) against whatever this
 * returns, so there's no query-string surface here.
 */
export async function fetchDestinations(): Promise<Destination[]> {
  const response = await fetch('/api/destinations');
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(response.status, body?.error?.message ?? `Request failed with status ${response.status}`, body?.error?.code);
  }
  return response.json() as Promise<Destination[]>;
}
