import { useQuery } from '@tanstack/react-query';
import { fetchTrip } from './api';

/** `['trip', code]` — the query-key convention every Trip read uses (per epic-1-context's Technical Decisions). */
export function useTrip(code: string) {
  return useQuery({
    queryKey: ['trip', code],
    queryFn: () => fetchTrip(code),
    // No retry, same rationale as useDestinations: a genuine 404/failure
    // should surface immediately, not after a multi-second backoff.
    retry: false,
  });
}
