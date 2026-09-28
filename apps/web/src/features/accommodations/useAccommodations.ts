import { useQuery } from '@tanstack/react-query';
import { fetchAccommodations } from './api';

export function useAccommodations(destinationId: string) {
  return useQuery({
    queryKey: ['accommodations', destinationId],
    queryFn: () => fetchAccommodations(destinationId),
    retry: false,
  });
}
