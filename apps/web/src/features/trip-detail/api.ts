export interface ItineraryItem {
  id: string;
  day: string;
  title: string;
  note: string | null;
}

export interface AttachedAccommodation {
  id: string;
  name: string;
  type: string;
  pricePerNightUSD: number;
  rating: number;
  photoUrl: string;
}

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
  itineraryItems: ItineraryItem[];
  openToBuddies: boolean;
  buddyNote: string | null;
  attachedAccommodationId: string | null;
  attachedAccommodation: AttachedAccommodation | null;
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

export interface ItineraryItemInput {
  day: string;
  title: string;
  note?: string | null;
}

/** AD-8: full-resource overwrite — sends the *entire* itinerary, not a single line's diff. */
export async function updateItinerary(code: string, items: ItineraryItemInput[]): Promise<ItineraryItem[]> {
  const response = await fetch(`/api/trips/${encodeURIComponent(code)}/itinerary`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  });
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<ItineraryItem[]>;
}

export interface TripSettingsPatch {
  openToBuddies?: boolean;
  buddyNote?: string | null;
  attachedAccommodationId?: string | null;
}

/** AD-8: PATCH-partial-merge — the opposite rule from `updateItinerary`'s full overwrite. Only the fields present in `patch` change. */
export async function updateTripSettings(code: string, patch: TripSettingsPatch): Promise<TripDetail> {
  const response = await fetch(`/api/trips/${encodeURIComponent(code)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<TripDetail>;
}

export interface PendingBuddyRequest {
  id: string;
  requesterName: string;
  message: string | null;
  createdAt: string;
}

export async function fetchPendingBuddyRequests(code: string): Promise<PendingBuddyRequest[]> {
  const response = await fetch(`/api/trips/${encodeURIComponent(code)}/buddy-requests`);
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<PendingBuddyRequest[]>;
}

export async function acceptBuddyRequest(code: string, requestId: string): Promise<TripMember> {
  const response = await fetch(`/api/trips/${encodeURIComponent(code)}/buddy-requests/${encodeURIComponent(requestId)}/accept`, {
    method: 'POST',
  });
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<TripMember>;
}

export async function declineBuddyRequest(code: string, requestId: string): Promise<void> {
  const response = await fetch(`/api/trips/${encodeURIComponent(code)}/buddy-requests/${encodeURIComponent(requestId)}/decline`, {
    method: 'POST',
  });
  if (!response.ok) return throwForResponse(response);
}
