import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTripSettings, type TripSettingsPatch, type TripDetail } from './api';

/** On success, merges the response into the `['trip', code]` cache instead of refetching. */
export function useUpdateTripSettings(code: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: TripSettingsPatch) => updateTripSettings(code, patch),
    onSuccess: (trip) => {
      queryClient.setQueryData(['trip', code], (existing: TripDetail | undefined) => (existing ? { ...existing, ...trip } : trip));
    },
  });
}
