export interface AccommodationListing {
  id: string;
  name: string;
  type: string;
  pricePerNightUSD: number;
  rating: number;
  photoUrl: string;
  description: string;
}

/** Thrown by `fetchAccommodations` so callers can branch on the shared error envelope's `status`/`code`. */
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
 * Server-side filtered to one destination — never the full catalog
 * (spec-4-1's Boundaries & Constraints), unlike `fetchDestinations`'s
 * unfiltered single fetch.
 */
export async function fetchAccommodations(destinationId: string): Promise<AccommodationListing[]> {
  const response = await fetch(`/api/accommodations?destinationId=${encodeURIComponent(destinationId)}`);
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(response.status, body?.error?.message ?? `Request failed with status ${response.status}`, body?.error?.code);
  }
  return response.json() as Promise<AccommodationListing[]>;
}
