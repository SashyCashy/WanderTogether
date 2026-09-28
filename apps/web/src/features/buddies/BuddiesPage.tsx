import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Row } from '../../shared/components/Row';
import { RowSkeleton } from '../../shared/components/RowSkeleton';
import { EmptyState } from '../../shared/components/EmptyState';
import { useAnnounce } from '../../shared/LiveRegion';
import { fetchBuddyListings } from './api';
import { formatDateRange } from '../../shared/formatDateRange';
import './BuddiesPage.css';

/** Story 2.2: browse Trips open to buddies. Never renders a Trip Code anywhere (AD-7) — the API response itself never includes one. */
export function BuddiesPage() {
  const { data: listings, isLoading, isError, refetch } = useQuery({
    queryKey: ['buddies'],
    queryFn: fetchBuddyListings,
    retry: false,
  });
  const announce = useAnnounce();

  const hasListings = !!listings && listings.length > 0;
  const viewState: 'loading' | 'error' | 'empty' | 'results' = isLoading ? 'loading' : isError && !listings ? 'error' : hasListings ? 'results' : 'empty';

  useEffect(() => {
    if (viewState === 'error') announce("Couldn't load open trips.");
    else if (viewState === 'empty') announce('No open trips right now.');
    else if (viewState === 'results') announce(`${listings!.length} open trip${listings!.length === 1 ? '' : 's'} found.`);
  }, [viewState, listings, announce]);

  return (
    <main className="buddies-page">
      <h1>Buddies</h1>
      <p className="buddies-page__intro">Trips looking for travel buddies.</p>

      {viewState === 'loading' ? <RowSkeleton count={4} /> : null}

      {viewState === 'error' ? (
        <EmptyState
          headline="Couldn't load this."
          body="Something went wrong loading open trips."
          primaryAction={{ label: 'Retry', onClick: () => refetch() }}
        />
      ) : null}

      {viewState === 'empty' ? <EmptyState headline="No open trips right now." body="Check back soon." /> : null}

      {viewState === 'results' ? (
        <div className="buddies-page__list">
          {listings!.map((listing) => (
            <Row
              key={listing.buddyListingId}
              headline={listing.name}
              description={listing.buddyNote ?? undefined}
              eyebrow={`${listing.destination.name}, ${listing.destination.country}`}
              metadata={formatDateRange(listing.startDate, listing.endDate) ?? undefined}
              href={`/buddies/${listing.buddyListingId}`}
            />
          ))}
        </div>
      ) : null}
    </main>
  );
}
