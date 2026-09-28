import { useMutation } from '@tanstack/react-query';
import { joinTrip } from './api';

/**
 * Wraps `POST /api/trips/:code/members`. Callers (TripDetailPage's
 * profile prompt) own writing the local "My Trips" index on success —
 * merely resolving/joining here has no side effect of its own beyond the
 * server-side `TripMember` row.
 */
export function useJoinTrip(code: string) {
  return useMutation({
    mutationFn: (displayName: string) => joinTrip(code, displayName),
  });
}
