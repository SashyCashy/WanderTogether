import { useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Row } from '../../shared/components/Row';
import { RowSkeleton } from '../../shared/components/RowSkeleton';
import { EmptyState } from '../../shared/components/EmptyState';
import { useAnnounce } from '../../shared/LiveRegion';
import { getMyTripsIndex } from '../../shared/myTripsIndex';
import { fetchTrip } from '../trip-detail/api';
import { formatDateRange } from '../../shared/formatDateRange';
import './MyTripsPage.css';

/**
 * Reads the local "My Trips" index (AD-13) and resolves each stored Trip
 * Code via the same `['trip', code]` query `TripDetailPage` uses — no new
 * backend endpoint (spec-1-6's Always constraint: "looked up via the
 * normal per-Trip GET"). A code that fails to resolve is silently
 * omitted, not shown as a broken row.
 */
export function MyTripsPage() {
  const codes = Object.keys(getMyTripsIndex());
  const announce = useAnnounce();

  const results = useQueries({
    queries: codes.map((code) => ({
      queryKey: ['trip', code],
      queryFn: () => fetchTrip(code),
      retry: false,
    })),
  });

  // Wait for every query to settle (success or error) before deciding
  // anything — evaluating "all failed" or rendering a partial list the
  // moment the *first* query settles would flash a wrong state (e.g. one
  // fast 404 among several still-pending codes incorrectly reading as
  // "everything failed").
  const stillLoading = results.some((result) => result.isLoading);
  const trips = results.filter((result) => result.isSuccess).map((result) => result.data!);
  const allFailed = codes.length > 0 && !stillLoading && trips.length === 0;

  const retryAll = () => {
    for (const result of results) result.refetch();
  };

  useEffect(() => {
    if (codes.length === 0 || stillLoading) return;
    if (allFailed) announce("Couldn't load your trips.");
    else announce(`${trips.length} trip${trips.length === 1 ? '' : 's'} loaded.`);
  }, [codes.length, stillLoading, allFailed, trips.length, announce]);

  return (
    <main className="my-trips-page">
      <h1>My Trips</h1>
      <p className="my-trips-page__intro">Trips this browser has created or joined.</p>

      {codes.length === 0 ? (
        <EmptyState
          headline="No trips yet."
          body="Start one from Discover, or enter a Trip Code."
          primaryAction={{ label: 'Start a Trip', href: '/trips/new' }}
          secondaryAction={{ label: 'Enter a Trip Code', href: '/join' }}
        />
      ) : stillLoading ? (
        <RowSkeleton count={Math.min(codes.length, 6)} />
      ) : allFailed ? (
        <EmptyState headline="Couldn't load this." body="Something went wrong loading your trips." primaryAction={{ label: 'Retry', onClick: retryAll }} />
      ) : (
        <div className="my-trips-page__list">
          {trips.map((trip) => (
            <Row
              key={trip.id}
              headline={trip.name}
              description={`${trip.destination.name}, ${trip.destination.country}`}
              metadata={formatDateRange(trip.startDate, trip.endDate) ?? undefined}
              href={`/trip/${trip.id}`}
            />
          ))}
        </div>
      )}
    </main>
  );
}
