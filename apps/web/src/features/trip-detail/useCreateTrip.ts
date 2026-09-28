import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTrip } from './api';
import { addTripToIndex } from '../../shared/myTripsIndex';
import { navigate } from '../../shared/router';

/**
 * On success: seeds the `['trip', id]` cache from the create response (so
 * Trip Detail renders immediately without a redundant fetch), records the
 * new Trip Code in the local "My Trips" index (AD-13), then navigates to
 * `/trip/:code`.
 */
export function useCreateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTrip,
    onSuccess: (trip) => {
      queryClient.setQueryData(['trip', trip.id], trip);
      addTripToIndex(trip.id);
      navigate(`/trip/${trip.id}`);
    },
  });
}
