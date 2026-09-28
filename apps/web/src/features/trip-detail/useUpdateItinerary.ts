import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateItinerary, type ItineraryItemInput, type TripDetail } from './api';

/**
 * On success, merges the server's response straight into the `['trip',
 * code]` cache instead of refetching — a save shouldn't flash the whole
 * page back to a loading state.
 */
export function useUpdateItinerary(code: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: ItineraryItemInput[]) => updateItinerary(code, items),
    onSuccess: (itineraryItems) => {
      queryClient.setQueryData(['trip', code], (trip: TripDetail | undefined) => (trip ? { ...trip, itineraryItems } : trip));
    },
  });
}
