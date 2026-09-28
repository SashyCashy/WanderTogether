export interface Destination {
  id: string;
  name: string;
  country: string;
  region: string;
  tripType: string;
  description: string;
  photoUrl: string;
}

/**
 * One unfiltered fetch of the full catalog — filtering happens
 * client-side (spec-1-2's Boundaries & Constraints) against whatever this
 * returns, so there's no query-string surface here.
 */
export async function fetchDestinations(): Promise<Destination[]> {
  const response = await fetch('/api/destinations');
  if (!response.ok) {
    throw new Error(`Failed to fetch destinations: ${response.status}`);
  }
  return response.json() as Promise<Destination[]>;
}
