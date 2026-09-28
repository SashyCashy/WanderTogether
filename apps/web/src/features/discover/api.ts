import { ApiError, throwForResponse } from '../../shared/api';

export interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  tripType: string;
  description: string;
  photoUrl: string;
}

export { ApiError };

/**
 * One unfiltered fetch of the full catalog — filtering happens
 * client-side (spec-1-2's Boundaries & Constraints) against whatever this
 * returns, so there's no query-string surface here.
 */
export async function fetchDestinations(): Promise<Destination[]> {
  const response = await fetch('/api/destinations');
  if (!response.ok) return throwForResponse(response);
  return response.json() as Promise<Destination[]>;
}
