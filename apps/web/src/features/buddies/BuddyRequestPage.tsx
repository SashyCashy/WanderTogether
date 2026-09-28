import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../shared/components/EmptyState';
import { useAnnounce } from '../../shared/LiveRegion';
import { fetchBuddyListing, fetchBuddyRequestStatus, submitBuddyRequest, ApiError } from './api';
import { getBuddyRequestId, recordBuddyRequest } from '../../shared/buddyRequestIndex';
import { formatDateRange } from '../../shared/formatDateRange';
import './BuddyRequestPage.css';

/**
 * Status view for a browser that already submitted a request to this
 * listing (AD-14's client-side dedup — the form never reappears).
 * `status` can only ever be `"pending"` through this story's own code
 * paths; `"declined"`/`"accepted"` are built per the AC but unreachable
 * end-to-end until Story 2.3 ships the accept/decline mutation.
 */
function RequestStatus({ requestId }: { requestId: string }) {
  const { data: status, isLoading } = useQuery({
    queryKey: ['buddy-request-status', requestId],
    queryFn: () => fetchBuddyRequestStatus(requestId),
    retry: false,
  });

  if (isLoading) return <p className="buddy-request-page__loading">Loading…</p>;
  if (!status) return null;

  if (status.status === 'declined') {
    return <EmptyState headline="This request was declined." body="You can browse other open trips from Buddies." primaryAction={{ label: 'Back to Buddies', href: '/buddies' }} />;
  }
  if (status.status === 'accepted') {
    // The backend always includes `tripCode` when status is 'accepted' —
    // this branch only exists so a type/contract mismatch fails visibly
    // as "something's wrong" instead of silently reading as "still waiting."
    return status.tripCode ? (
      <EmptyState headline="You're in!" body="The group accepted your request." primaryAction={{ label: 'Go to the Trip', href: `/trip/${status.tripCode}` }} />
    ) : (
      <EmptyState headline="You were accepted." body="Something went wrong showing your Trip link. Ask the group to resend it." />
    );
  }
  return <EmptyState headline="Request sent — waiting on the group." body="Check back later to see if you've been accepted." />;
}

export function BuddyRequestPage({ buddyListingId }: { buddyListingId: string }) {
  const { data: listing, isLoading, isError, error } = useQuery({
    queryKey: ['buddy-listing', buddyListingId],
    queryFn: () => fetchBuddyListing(buddyListingId),
    retry: false,
  });
  const announce = useAnnounce();
  const [requestId, setRequestId] = useState(() => getBuddyRequestId(buddyListingId));
  const [requesterName, setRequesterName] = useState('');
  const [message, setMessage] = useState('');
  const mutation = useMutation({
    mutationFn: () => submitBuddyRequest(buddyListingId, { requesterName, message: message.trim() || undefined }),
    onSuccess: (request) => {
      recordBuddyRequest(buddyListingId, request.id);
      setRequestId(request.id);
      announce('Request sent — waiting on the group.');
    },
  });

  const isNotFound = error instanceof ApiError && error.status === 404;

  useEffect(() => {
    if (isLoading) return;
    if (isNotFound) announce("This trip isn't open to buddies (anymore).");
    else if (isError) announce("Couldn't load this trip.");
  }, [isLoading, isError, isNotFound, announce]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    if (!requesterName.trim()) return;
    mutation.mutate();
  };

  if (isLoading) {
    return (
      <main className="buddy-request-page">
        <p className="buddy-request-page__loading">Loading…</p>
      </main>
    );
  }

  if (isError || !listing) {
    return (
      <main className="buddy-request-page">
        <EmptyState
          headline={isNotFound ? "This trip isn't open to buddies." : "Couldn't load this."}
          body={isNotFound ? 'It may have been closed. Check Buddies for other open trips.' : 'Something went wrong loading this trip.'}
          primaryAction={{ label: 'Back to Buddies', href: '/buddies' }}
        />
      </main>
    );
  }

  const dateRange = formatDateRange(listing.startDate, listing.endDate);
  const errorMessage = mutation.error instanceof ApiError ? mutation.error.message : mutation.error ? "Didn't send. Try again." : null;

  return (
    <main className="buddy-request-page">
      <p className="buddy-request-page__eyebrow">Trip</p>
      <h1 className="buddy-request-page__name">{listing.name}</h1>
      <p className="buddy-request-page__meta">
        {listing.destination.name}, {listing.destination.country}
        {dateRange ? ` · ${dateRange}` : ''}
      </p>
      {listing.buddyNote ? <p className="buddy-request-page__note">{listing.buddyNote}</p> : null}

      {requestId ? (
        <RequestStatus requestId={requestId} />
      ) : (
        <form className="buddy-request-page__form" onSubmit={handleSubmit}>
          <div className="buddy-request-page__field">
            <label className="buddy-request-page__label" htmlFor="requester-name">
              Your name
            </label>
            <input
              id="requester-name"
              className="buddy-request-page__input"
              type="text"
              value={requesterName}
              onChange={(event) => setRequesterName(event.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div className="buddy-request-page__field">
            <label className="buddy-request-page__label" htmlFor="requester-message">
              Message
            </label>
            <textarea
              id="requester-message"
              className="buddy-request-page__textarea"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={500}
              placeholder="Tell them a bit about you…"
            />
          </div>

          {errorMessage ? (
            <p className="buddy-request-page__error" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button type="submit" className="buddy-request-page__submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Sending…' : 'Send Request'}
          </button>
        </form>
      )}
    </main>
  );
}
