export interface BuddyListing {
  buddyListingId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  buddyNote: string | null;
  destination: {
    name: string;
    country: string;
  };
}

export interface SubmitBuddyRequestInput {
  requesterName: string;
  message?: string;
}

export interface BuddyRequestSummary {
  id: string;
  status: string;
}

export interface BuddyRequestStatus {
  status: string;
  /** Only present once `status === 'accepted'` — the real Trip Code, safe here since the caller already holds a private `requestId`. */
  tripCode?: string;
}

/** Thrown by every fetch below so callers can branch on `status`/`code` (e.g. a 404 vs. a generic failure). */
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

export async function fetchBuddyListings(): Promise<BuddyListing[]> {
  const response = await fetch('/api/buddies');
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<BuddyListing[]>;
}

export async function fetchBuddyListing(buddyListingId: string): Promise<BuddyListing> {
  const response = await fetch(`/api/buddies/${encodeURIComponent(buddyListingId)}`);
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<BuddyListing>;
}

export async function submitBuddyRequest(buddyListingId: string, input: SubmitBuddyRequestInput): Promise<BuddyRequestSummary> {
  const response = await fetch(`/api/buddies/${encodeURIComponent(buddyListingId)}/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<BuddyRequestSummary>;
}

export async function fetchBuddyRequestStatus(requestId: string): Promise<BuddyRequestStatus> {
  const response = await fetch(`/api/buddies/requests/${encodeURIComponent(requestId)}`);
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<BuddyRequestStatus>;
}
