import { ApiError, throwForResponse } from '../../shared/api';

export { ApiError };

export interface AccommodationListing {
  id: string;
  name: string;
  type: string;
  pricePerNightUSD: number;
  rating: number;
  photoUrl: string;
  description: string;
}

/**
 * Server-side filtered to one destination — never the full catalog
 * (spec-4-1's Boundaries & Constraints), unlike `fetchDestinations`'s
 * unfiltered single fetch.
 */
export async function fetchAccommodations(destinationId: string): Promise<AccommodationListing[]> {
  const response = await fetch(`/api/accommodations?destinationId=${encodeURIComponent(destinationId)}`);
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<AccommodationListing[]>;
}
