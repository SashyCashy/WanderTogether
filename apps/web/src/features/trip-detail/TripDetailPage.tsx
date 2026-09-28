import { useEffect, useRef, useState } from 'react';
import { EmptyState } from '../../shared/components/EmptyState';
import { useAnnounce } from '../../shared/LiveRegion';
import { useTrip } from './useTrip';
import { useJoinTrip } from './useJoinTrip';
import { ApiError } from './api';
import { addTripToIndex, hasTripInIndex } from '../../shared/myTripsIndex';
import './TripDetailPage.css';

function formatDateRange(startDate: string | null, endDate: string | null): string | null {
  if (!startDate || !endDate) return null;
  const format = (value: string) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${format(startDate)} – ${format(endDate)}`;
}

/**
 * AD-13's gate: a browser that already has `code` in its local index (the
 * creator, from Story 1.3, or a prior joiner) skips straight to the
 * header; any other browser sees this prompt first. Only a successful
 * submission calls `addMember`/`addTripToIndex` — merely viewing never
 * does (spec-1-4's Boundaries).
 */
function TravelerProfilePrompt({
  code,
  tripName,
  onJoined,
}: {
  code: string;
  tripName: string;
  onJoined: (displayName: string) => void;
}) {
  const [displayName, setDisplayName] = useState('');
  const mutation = useJoinTrip(code);
  const announce = useAnnounce();

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'Something went wrong joining this trip.'
        : null;

  useEffect(() => {
    if (errorMessage) announce(errorMessage);
  }, [errorMessage, announce]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    // Pass the *server's* trimmed displayName back, not the raw local
    // value — the server trims via zod, and the local index must match
    // what's actually persisted.
    mutation.mutate(displayName, { onSuccess: (member) => onJoined(member.displayName) });
  };

  return (
    <div className="trip-detail-page__profile-prompt">
      <p className="trip-detail-page__eyebrow">Joining</p>
      <h1 className="trip-detail-page__name">{tripName}</h1>
      <p className="trip-detail-page__profile-intro">Set a display name so your group knows who's planning with them.</p>

      <form onSubmit={handleSubmit} className="trip-detail-page__profile-form">
        <label className="trip-detail-page__profile-label" htmlFor="traveler-display-name">
          Display name
        </label>
        <input
          id="traveler-display-name"
          className="trip-detail-page__profile-input"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          maxLength={100}
          required
        />

        {errorMessage ? (
          <p className="trip-detail-page__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" className="trip-detail-page__profile-submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Joining…' : 'Continue'}
        </button>
      </form>
    </div>
  );
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
  const [hasProfile, setHasProfile] = useState(() => hasTripInIndex(code));
  const announce = useAnnounce();
  const copyResetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimeout.current) clearTimeout(copyResetTimeout.current);
    };
  }, []);

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

  if (!hasProfile) {
    return (
      <main className="trip-detail-page">
        <TravelerProfilePrompt
          code={code}
          tripName={trip.name}
          onJoined={(displayName) => {
            addTripToIndex(code, displayName);
            setHasProfile(true);
          }}
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
      if (copyResetTimeout.current) clearTimeout(copyResetTimeout.current);
      copyResetTimeout.current = setTimeout(() => setCopyLabel('Copy link'), 2000);
    } catch {
      // Clipboard API can be unavailable/denied — the code is still
      // visible in the chip for manual copying.
      announce("Couldn't copy the link. You can copy the code from the chip instead.");
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
