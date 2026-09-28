import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPendingBuddyRequests, acceptBuddyRequest, declineBuddyRequest, type PendingBuddyRequest } from './api';
import { useAnnounce } from '../../shared/LiveRegion';

const queryKeyFor = (code: string) => ['trip', code, 'buddy-requests'];

export function usePendingBuddyRequests(code: string) {
  return useQuery({
    queryKey: queryKeyFor(code),
    queryFn: () => fetchPendingBuddyRequests(code),
    retry: false,
  });
}

/**
 * On success, removes the handled request from the local list directly
 * (no refetch — matches the AC's "updates the pending-requests list in
 * place") and announces the result via the shared live region, since a
 * visual disappearance alone doesn't satisfy that requirement.
 */
export function useHandleBuddyRequest(code: string) {
  const queryClient = useQueryClient();
  const announce = useAnnounce();

  const removeFromList = (requestId: string) => {
    queryClient.setQueryData(queryKeyFor(code), (requests: PendingBuddyRequest[] | undefined) =>
      requests ? requests.filter((request) => request.id !== requestId) : requests,
    );
  };

  const accept = useMutation({
    mutationFn: (request: PendingBuddyRequest) => acceptBuddyRequest(code, request.id),
    onSuccess: (_member, request) => {
      removeFromList(request.id);
      announce(`Accepted ${request.requesterName}.`);
    },
    onError: () => announce("Didn't save. Try again."),
  });

  const decline = useMutation({
    mutationFn: (request: PendingBuddyRequest) => declineBuddyRequest(code, request.id),
    onSuccess: (_void, request) => {
      removeFromList(request.id);
      announce(`Declined ${request.requesterName}.`);
    },
    onError: () => announce("Didn't save. Try again."),
  });

  return { accept, decline };
}
