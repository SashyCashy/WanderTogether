import { useMutation } from '@tanstack/react-query';
import { createWriteup } from './api';

/**
 * spec-3-1's frozen "Never" constraint: success shows a calm inline
 * confirmation with a "Publish another" reset, never a redirect — Story
 * 3.2 owns the browse/detail screens a redirect would otherwise need to
 * land on, and none exist yet.
 */
export function useCreateWriteup() {
  return useMutation({
    mutationFn: createWriteup,
  });
}
