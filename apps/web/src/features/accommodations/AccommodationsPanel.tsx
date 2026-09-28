import { useEffect } from 'react';
import { Row } from '../../shared/components/Row';
import { RowSkeleton } from '../../shared/components/RowSkeleton';
import { EmptyState } from '../../shared/components/EmptyState';
import { useAnnounce } from '../../shared/LiveRegion';
import { useAccommodations } from './useAccommodations';
import './AccommodationsPanel.css';

/**
 * Lives inside Trip Detail only (epic-4-context.md's UX pattern) — no
 * standalone route. Rows are inert this story: no `href`/`onClick` yet,
 * since attaching a listing is Story 4.2's concern.
 */
export function AccommodationsPanel({ destinationId }: { destinationId: string }) {
  const { data: listings, isLoading, isError, refetch } = useAccommodations(destinationId);
  const announce = useAnnounce();

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
        <div className="accommodations-panel__list">
          {listings!.map((listing) => (
            <Row
              key={listing.id}
              headline={listing.name}
              description={`${listing.type} · $${listing.pricePerNightUSD}/night`}
              metadata={`★ ${listing.rating}`}
              thumbnail={{ src: listing.photoUrl, alt: listing.name }}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
