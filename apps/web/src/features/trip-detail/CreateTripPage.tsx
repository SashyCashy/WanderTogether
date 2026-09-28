import { useEffect, useState } from 'react';
import { useDestinations } from '../discover/useDestinations';
import { useCreateTrip } from './useCreateTrip';
import { ApiError } from './api';
import { useAnnounce } from '../../shared/LiveRegion';
import './CreateTripPage.css';

/**
 * Reachable two ways (spec-1-3's Code Map): from a Destination row (via
 * `?destinationId=`, locking the field) or from Discover's standalone
 * "Start a Trip" entry point (destination picked from the dropdown).
 */
export function CreateTripPage() {
  const params = new URLSearchParams(window.location.search);
  const prefilledDestinationId = params.get('destinationId') ?? '';

  const { data: destinations, isLoading: destinationsLoading, isError: destinationsError } = useDestinations();
  const [name, setName] = useState('');
  const [destinationId, setDestinationId] = useState(prefilledDestinationId);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const mutation = useCreateTrip();
  const announce = useAnnounce();

  const prefilledDestination = (destinations ?? []).find((destination) => destination.id === prefilledDestinationId);

  // A `?destinationId=` that doesn't match any loaded destination (stale
  // link, typo) must not silently sit in `destinationId` state — that
  // would let a bad id slip past the dropdown's own `required` guard.
  useEffect(() => {
    if (!destinations || !prefilledDestinationId || prefilledDestination) return;
    setDestinationId('');
  }, [destinations, prefilledDestinationId, prefilledDestination]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    if (endDate < startDate) {
      setDateRangeError('End date must be on or after the start date.');
      return;
    }
    setDateRangeError(null);
    mutation.mutate({ name, destinationId, startDate, endDate });
  };

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'Something went wrong creating the trip.'
        : null;

  useEffect(() => {
    if (errorMessage) announce(errorMessage);
  }, [errorMessage, announce]);

  useEffect(() => {
    if (dateRangeError) announce(dateRangeError);
  }, [dateRangeError, announce]);

  return (
    <main className="create-trip-page">
      <h1>Start a Trip</h1>
      <p className="create-trip-page__intro">No account needed — start a Trip and share the link.</p>

      <form className="create-trip-page__form" onSubmit={handleSubmit}>
        <div className="create-trip-page__field">
          <label className="create-trip-page__label" htmlFor="trip-name">
            Trip name
          </label>
          <input
            id="trip-name"
            className="create-trip-page__input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={200}
            required
          />
        </div>

        <div className="create-trip-page__field">
          <label className="create-trip-page__label" htmlFor="trip-destination">
            Destination
          </label>
          {prefilledDestination ? (
            <input
              id="trip-destination"
              className="create-trip-page__input"
              type="text"
              value={`${prefilledDestination.name}, ${prefilledDestination.country}`}
              readOnly
            />
          ) : destinationsError ? (
            <p className="create-trip-page__field-error" role="alert">
              Couldn't load destinations. Refresh and try again.
            </p>
          ) : (
            <select
              id="trip-destination"
              className="create-trip-page__input"
              value={destinationId}
              onChange={(event) => setDestinationId(event.target.value)}
              disabled={destinationsLoading}
              required
            >
              <option value="" disabled>
                {destinationsLoading ? 'Loading destinations…' : 'Choose a destination'}
              </option>
              {(destinations ?? []).map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name}, {destination.country}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="create-trip-page__dates">
          <div className="create-trip-page__field">
            <label className="create-trip-page__label" htmlFor="trip-start-date">
              Start date
            </label>
            <input
              id="trip-start-date"
              className="create-trip-page__input"
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setDateRangeError(null);
              }}
              required
            />
          </div>
          <div className="create-trip-page__field">
            <label className="create-trip-page__label" htmlFor="trip-end-date">
              End date
            </label>
            <input
              id="trip-end-date"
              className="create-trip-page__input"
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setDateRangeError(null);
              }}
              aria-describedby={dateRangeError ? 'trip-date-range-error' : undefined}
              aria-invalid={dateRangeError ? true : undefined}
              required
            />
          </div>
        </div>

        {dateRangeError ? (
          <p id="trip-date-range-error" className="create-trip-page__field-error" role="alert">
            {dateRangeError}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="create-trip-page__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" className="create-trip-page__submit" disabled={mutation.isPending || destinationsError}>
          {mutation.isPending ? 'Creating…' : 'Create Trip'}
        </button>
      </form>
    </main>
  );
}
