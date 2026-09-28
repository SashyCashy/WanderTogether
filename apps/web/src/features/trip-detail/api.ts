export interface TripDetail {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  destination: {
    id: string;
    name: string;
    country: string;
  };
}

export interface CreateTripInput {
  name: string;
  destinationId: string;
  startDate: string;
  endDate: string;
}

/** Thrown by `fetchTrip`/`createTrip` so callers can branch on `status`/`code` (e.g. a 404 vs. a generic failure). */
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

async function throwForResponse(response: Response): Promise<never> {
  const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  throw new ApiError(response.status, body?.error?.message ?? `Request failed with status ${response.status}`, body?.error?.code);
}

export async function fetchTrip(code: string): Promise<TripDetail> {
  const response = await fetch(`/api/trips/${encodeURIComponent(code)}`);
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<TripDetail>;
}

export async function createTrip(input: CreateTripInput): Promise<TripDetail> {
  const response = await fetch('/api/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<TripDetail>;
}

export interface TripMember {
  id: string;
  displayName: string;
  joinedAt: string;
}

export async function joinTrip(code: string, displayName: string): Promise<TripMember> {
  const response = await fetch(`/api/trips/${encodeURIComponent(code)}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName }),
  });
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<TripMember>;
}
