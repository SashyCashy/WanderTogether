import { useQuery } from '@tanstack/react-query';
import { fetchDestinations } from './api';

/**
 * Query-key convention for this entity family: `['destinations']`,
 * parallel to AD-10's `['trip', tripCode]` convention for Trips.
 */
export function useDestinations() {
  return useQuery({
    queryKey: ['destinations'],
    queryFn: fetchDestinations,
    // No retry: the default (3 retries with backoff) would delay the
    // "Couldn't load this" / Retry UI by several seconds past a genuine
    // failure. Explicit retry is a manual action via that button instead.
    retry: false,
  });
}
