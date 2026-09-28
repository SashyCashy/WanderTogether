import { usePendingBuddyRequests, useHandleBuddyRequest } from './usePendingBuddyRequests';
import './PendingBuddyRequests.css';

/**
 * Trip-member-facing pending list (spec-2-3) — distinct from the
 * requester-facing "Request sent" state Story 2.2 built. Renders nothing
 * while there's genuinely nothing pending (the common case), but loading
 * and error states are each their own branch — neither collapses into
 * the same "render nothing" as an empty list, which would otherwise be
 * indistinguishable from "no requests" to the Trip owner.
 */
export function PendingBuddyRequests({ tripCode }: { tripCode: string }) {
  const { data: requests, isLoading, isError } = usePendingBuddyRequests(tripCode);
  const { accept, decline } = useHandleBuddyRequest(tripCode);

  if (isLoading) return null;
  if (isError) {
    return (
      <section className="pending-buddy-requests">
        <p className="pending-buddy-requests__error" role="alert">
          Couldn't load buddy requests.
        </p>
      </section>
    );
  }
  if (!requests || requests.length === 0) return null;

  return (
    <section className="pending-buddy-requests">
      <h2 className="pending-buddy-requests__heading">Buddy requests</h2>
      <ul className="pending-buddy-requests__list">
        {requests.map((request) => {
          const isHandling = (accept.isPending && accept.variables?.id === request.id) || (decline.isPending && decline.variables?.id === request.id);
          return (
            <li key={request.id} className="pending-buddy-requests__row">
              <div className="pending-buddy-requests__body">
                <p className="pending-buddy-requests__name">{request.requesterName}</p>
                {request.message ? <p className="pending-buddy-requests__message">{request.message}</p> : null}
              </div>
              <div className="pending-buddy-requests__actions">
                <button
                  type="button"
                  className="pending-buddy-requests__button"
                  aria-label={`Decline request from ${request.requesterName}`}
                  onClick={() => {
                    if (isHandling) return;
                    decline.mutate(request);
                  }}
                  disabled={isHandling}
                >
                  Decline
                </button>
                <button
                  type="button"
                  className="pending-buddy-requests__button pending-buddy-requests__button--primary"
                  aria-label={`Accept request from ${request.requesterName}`}
                  onClick={() => {
                    if (isHandling) return;
                    accept.mutate(request);
                  }}
                  disabled={isHandling}
                >
                  Accept
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
