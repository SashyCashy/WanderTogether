import { useEffect, useState } from 'react';
import { EmptyState } from '../../shared/components/EmptyState';
import { useAnnounce } from '../../shared/LiveRegion';
import { useTrip } from './useTrip';
import { ApiError } from './api';
import './TripDetailPage.css';

function formatDateRange(startDate: string | null, endDate: string | null): string | null {
  if (!startDate || !endDate) return null;
  const format = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${format(startDate)} – ${format(endDate)}`;
}

/**
 * Header-only Trip Detail (spec-1-3's Never list) — itinerary/buddies/
 * accommodation sections land in later stories. This is also the screen a
 * pasted Trip Code/Link opens fresh, so `useTrip` (not passed-in state) is
 * the only data source.
 */
export function TripDetailPage({ code }: { code: string }) {
  const { data: trip, isLoading, isError, error } = useTrip(code);
  const [copyLabel, setCopyLabel] = useState('Copy link');
  const announce = useAnnounce();

  const isNotFound = error instanceof ApiError && error.status === 404;

  useEffect(() => {
    if (isLoading) return;
    if (isNotFound) {
      announce("This code doesn't match a trip.");
    } else if (isError) {
      announce("Couldn't load this trip.");
    } else if (trip) {
      announce(`${trip.name} loaded.`);
    }
  }, [isLoading, isError, isNotFound, trip, announce]);

  if (isLoading) {
    return (
      <main className="trip-detail-page">
        <p className="trip-detail-page__loading">Loading…</p>
      </main>
    );
  }

  if (isError || !trip) {
    return (
      <main className="trip-detail-page">
        <EmptyState
          headline={isNotFound ? "This code doesn't match a trip." : "Couldn't load this."}
          body={isNotFound ? 'Check it and try again.' : 'Something went wrong loading this trip.'}
          primaryAction={{ label: 'Back to Discover', href: '/' }}
        />
      </main>
    );
  }

  const dateRange = formatDateRange(trip.startDate, trip.endDate);
  const tripUrl = `${window.location.origin}/trip/${trip.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tripUrl);
      setCopyLabel('Copied');
      announce('Trip link copied.');
      setTimeout(() => setCopyLabel('Copy link'), 2000);
    } catch {
      // Clipboard API can be unavailable/denied — the code is still
      // visible in the chip for manual copying.
    }
  };

  return (
    <main className="trip-detail-page">
      <p className="trip-detail-page__eyebrow">Trip</p>
      <h1 className="trip-detail-page__name">{trip.name}</h1>
      <div className="trip-detail-page__meta">
        {dateRange ? <span>{dateRange}</span> : null}
        <span>
          {trip.destination.name}, {trip.destination.country}
        </span>
        <span className="trip-detail-page__code-chip">
          Trip Code: <b>{trip.id}</b>
        </span>
        <button type="button" className="trip-detail-page__copy" onClick={handleCopy}>
          {copyLabel}
        </button>
      </div>
    </main>
  );
}
