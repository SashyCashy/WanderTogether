import { useEffect, useState } from 'react';
import { Row } from '../../shared/components/Row';
import { RowSkeleton } from '../../shared/components/RowSkeleton';
import { EmptyState } from '../../shared/components/EmptyState';
import { useAnnounce } from '../../shared/LiveRegion';
import { useUpdateTripSettings } from '../trip-detail/useUpdateTripSettings';
import { useAccommodations } from './useAccommodations';
import type { AccommodationListing } from './api';
import './AccommodationsPanel.css';

/**
 * Lives inside Trip Detail only (epic-4-context.md's UX pattern) — no
 * standalone route. A dedicated `useUpdateTripSettings` instance, not
 * shared with `BuddyToggle`'s two — spec-2-1 already established that a
 * shared instance would couple independent controls' `isPending` state.
 */
export function AccommodationsPanel({
  tripCode,
  destinationId,
  attachedAccommodationId,
  attachedAccommodationName,
}: {
  tripCode: string;
  destinationId: string;
  attachedAccommodationId: string | null;
  attachedAccommodationName: string | null;
}) {
  const { data: listings, isLoading, isError, refetch } = useAccommodations(destinationId);
  const mutation = useUpdateTripSettings(tripCode);
  const announce = useAnnounce();
  const [pendingReplacement, setPendingReplacement] = useState<AccommodationListing | null>(null);

  const hasListings = !!listings && listings.length > 0;
  const viewState: 'loading' | 'error' | 'empty' | 'results' = isLoading
    ? 'loading'
    : isError && !listings
      ? 'error'
      : hasListings
        ? 'results'
        : 'empty';

  useEffect(() => {
    if (viewState === 'error') announce("Couldn't load accommodations.");
    else if (viewState === 'empty') announce('No accommodations listed yet.');
    else if (viewState === 'results') announce(`${listings!.length} accommodation${listings!.length === 1 ? '' : 's'} found.`);
  }, [viewState, listings, announce]);

  // The replace-confirm prompt is a same-page update with no navigation —
  // EXPERIENCE.md's Accessibility Floor requires it announced the same as
  // any other (a sighted user sees the banner appear; a screen-reader
  // user needs the equivalent).
  useEffect(() => {
    if (pendingReplacement) announce(`Replace ${attachedAccommodationName} with ${pendingReplacement.name}?`);
  }, [pendingReplacement, attachedAccommodationName, announce]);

  const attach = (accommodationId: string, name: string) => {
    mutation.mutate(
      { attachedAccommodationId: accommodationId },
      {
        onSuccess: () => announce(`${name} attached.`),
        onError: () => announce("Didn't save. Try again."),
      },
    );
  };

  const handleRowClick = (listing: AccommodationListing) => {
    if (mutation.isPending) return;
    if (listing.id === attachedAccommodationId) return;
    if (!attachedAccommodationId) {
      attach(listing.id, listing.name);
      return;
    }
    setPendingReplacement(listing);
  };

  const confirmReplacement = () => {
    if (!pendingReplacement || mutation.isPending) return;
    attach(pendingReplacement.id, pendingReplacement.name);
    setPendingReplacement(null);
  };

  return (
    <section className="accommodations-panel">
      <h2 className="accommodations-panel__heading">Accommodations</h2>

      {viewState === 'loading' ? <RowSkeleton count={4} /> : null}

      {viewState === 'error' ? (
        <EmptyState
          headline="Couldn't load this."
          body="Something went wrong loading accommodations."
          primaryAction={{ label: 'Retry', onClick: () => refetch() }}
        />
      ) : null}

      {viewState === 'empty' ? <EmptyState headline="No accommodations listed yet." body="Check back later." /> : null}

      {viewState === 'results' ? (
        <>
          {/* Not `role="alertdialog"` — that implies focus-trapping modal
              semantics this in-page banner doesn't provide (no other
              surface in this app uses a true modal; the live-region
              announce above is how this app signals same-page updates). */}
          {pendingReplacement ? (
            <div className="accommodations-panel__confirm" role="group" aria-label="Confirm replacing the attached accommodation">
              <p className="accommodations-panel__confirm-text">
                Replace {attachedAccommodationName} with {pendingReplacement.name}?
              </p>
              <div className="accommodations-panel__confirm-actions">
                <button type="button" className="accommodations-panel__confirm-button" onClick={confirmReplacement} disabled={mutation.isPending}>
                  Replace
                </button>
                <button
                  type="button"
                  className="accommodations-panel__cancel-button"
                  onClick={() => setPendingReplacement(null)}
                  disabled={mutation.isPending}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="accommodations-panel__list">
            {listings!.map((listing) => {
              const isAttached = listing.id === attachedAccommodationId;
              return (
                <Row
                  key={listing.id}
                  headline={listing.name}
                  description={`${listing.type} · $${listing.pricePerNightUSD}/night`}
                  metadata={isAttached ? `★ ${listing.rating} · Attached` : `★ ${listing.rating}`}
                  thumbnail={{ src: listing.photoUrl, alt: listing.name }}
                  onClick={() => handleRowClick(listing)}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
