import { useEffect, useMemo, useState } from 'react';
import { Row } from '../../shared/components/Row';
import { RowSkeleton } from '../../shared/components/RowSkeleton';
import { EmptyState } from '../../shared/components/EmptyState';
import { useAnnounce } from '../../shared/LiveRegion';
import { useDestinations } from './useDestinations';
import './DiscoverPage.css';

const ALL_REGIONS = 'all';
const ALL_TRIP_TYPES = 'all';

/**
 * DESIGN.md/EXPERIENCE.md's Discover screen: the app's entry point and
 * default landing surface (FR-1). Renders the seeded Destination catalog
 * as `Row`s with client-side region/trip-type filtering — one unfiltered
 * fetch (`useDestinations`), no network request or page reload on filter
 * change (spec-1-2's Boundaries & Constraints).
 */
export function DiscoverPage() {
  const { data: destinations, isLoading, isError, refetch } = useDestinations();
  const announce = useAnnounce();
  const [region, setRegion] = useState(ALL_REGIONS);
  const [tripType, setTripType] = useState(ALL_TRIP_TYPES);

  const regions = useMemo(
    () => Array.from(new Set((destinations ?? []).map((destination) => destination.region))).sort(),
    [destinations],
  );
  const tripTypes = useMemo(
    () => Array.from(new Set((destinations ?? []).map((destination) => destination.tripType))).sort(),
    [destinations],
  );

  const filteredDestinations = useMemo(() => {
    return (destinations ?? []).filter((destination) => {
      if (region !== ALL_REGIONS && destination.region !== region) return false;
      if (tripType !== ALL_TRIP_TYPES && destination.tripType !== tripType) return false;
      return true;
    });
  }, [destinations, region, tripType]);

  const hasCatalog = !!destinations && destinations.length > 0;
  // A failed background refetch (e.g. on window refocus) sets isError while
  // `destinations` still holds the last good, cached catalog — that stale
  // data stays on screen rather than being replaced by the load-failed
  // state, which is reserved for when there's no data to fall back on.
  const viewState: 'loading' | 'error' | 'empty' | 'results' = isLoading
    ? 'loading'
    : isError && !destinations
      ? 'error'
      : filteredDestinations.length === 0
        ? 'empty'
        : 'results';

  useEffect(() => {
    if (viewState === 'error') {
      announce("Couldn't load destinations.");
    } else if (viewState === 'empty') {
      announce(hasCatalog ? 'No destinations match these filters.' : 'No destinations yet.');
    } else if (viewState === 'results') {
      announce(`${filteredDestinations.length} destination${filteredDestinations.length === 1 ? '' : 's'} found.`);
    }
  }, [viewState, hasCatalog, filteredDestinations.length, announce]);

  return (
    <main className="discover-page">
      <div className="discover-page__header">
        <div>
          <h1>Discover</h1>
          <p className="discover-page__intro">Browse destinations and start planning — no account needed.</p>
        </div>
        <a className="discover-page__start-trip" href="/trips/new">
          Start a Trip
        </a>
      </div>

      <div className="discover-page__filters">
        <div className="discover-page__filter-field">
          <label className="discover-page__filter-label" htmlFor="discover-region-filter">
            Region
          </label>
          <select
            id="discover-region-filter"
            className="discover-page__filter-select"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            disabled={!hasCatalog}
          >
            <option value={ALL_REGIONS}>All regions</option>
            {regions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="discover-page__filter-field">
          <label className="discover-page__filter-label" htmlFor="discover-trip-type-filter">
            Trip type
          </label>
          <select
            id="discover-trip-type-filter"
            className="discover-page__filter-select"
            value={tripType}
            onChange={(event) => setTripType(event.target.value)}
            disabled={!hasCatalog}
          >
            <option value={ALL_TRIP_TYPES}>All trip types</option>
            {tripTypes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {viewState === 'loading' ? <RowSkeleton count={4} /> : null}

      {viewState === 'error' ? (
        <EmptyState
          headline="Couldn't load this."
          body="Something went wrong loading destinations."
          primaryAction={{ label: 'Retry', onClick: () => refetch() }}
        />
      ) : null}

      {viewState === 'empty' ? (
        hasCatalog ? (
          <EmptyState headline="No destinations match these filters." body="Try a different region or trip type." />
        ) : (
          <EmptyState headline="No destinations yet." body="Check back soon." />
        )
      ) : null}

      {viewState === 'results' ? (
        <div className="discover-page__list">
          {filteredDestinations.map((destination) => (
            <Row
              key={destination.id}
              headline={destination.name}
              description={destination.description}
              eyebrow={destination.region}
              thumbnail={{ src: destination.photoUrl, alt: destination.name }}
              metadata={destination.country}
              href={`/trips/new?destinationId=${destination.id}`}
            />
          ))}
        </div>
      ) : null}
    </main>
  );
}
