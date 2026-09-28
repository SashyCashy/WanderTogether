import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Row } from '../../shared/components/Row';
import { RowSkeleton } from '../../shared/components/RowSkeleton';
import { EmptyState } from '../../shared/components/EmptyState';
import { useAnnounce } from '../../shared/LiveRegion';
import { useDestinations } from '../discover/useDestinations';
import { fetchWriteups } from './api';
import './WriteupsPage.css';

const PAGE_SIZE = 10;
const BODY_PREVIEW_LENGTH = 140;

function bodyPreview(body: string): string {
  if (body.length <= BODY_PREVIEW_LENGTH) return body;
  return `${body.slice(0, BODY_PREVIEW_LENGTH).trimEnd()}…`;
}

/**
 * spec-3-2: server-side pagination (`page`/`pageSize`) and a server-side
 * Destination filter — unlike Discover's client-side region/trip-type
 * filters, there's no unfiltered full-catalog fetch here to filter
 * against once the listing is paginated.
 */
export function WriteupsPage() {
  const [page, setPage] = useState(1);
  const [destinationId, setDestinationId] = useState('');
  const { data: destinations, isError: destinationsError } = useDestinations();
  const announce = useAnnounce();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['write-ups', { page, destinationId }],
    queryFn: () => fetchWriteups({ page, pageSize: PAGE_SIZE, destinationId: destinationId || undefined }),
    retry: false,
    // Keeps the current page's rows on screen while the next page/filter
    // loads instead of flashing the full RowSkeleton on every click — a
    // page or filter change is a small delta, not a cold load.
    placeholderData: keepPreviousData,
  });

  const hasResults = !!data && data.items.length > 0;
  const viewState: 'loading' | 'error' | 'empty' | 'results' = isLoading
    ? 'loading'
    : isError && !data
      ? 'error'
      : hasResults
        ? 'results'
        : 'empty';

  const totalPages = data ? Math.max(1, Math.ceil(data.totalCount / data.pageSize)) : 1;

  useEffect(() => {
    if (viewState === 'error') announce("Couldn't load write-ups.");
    else if (viewState === 'empty') announce(destinationId ? 'No write-ups match this filter.' : 'No write-ups yet.');
    else if (viewState === 'results') announce(`${data!.totalCount} write-up${data!.totalCount === 1 ? '' : 's'} found.`);
  }, [viewState, data, destinationId, announce]);

  return (
    <main className="writeups-page">
      <div className="writeups-page__header">
        <div>
          <h1>Trip Write-ups</h1>
          <p className="writeups-page__intro">Stories from trips people have taken — no account needed to read them.</p>
        </div>
        <a className="writeups-page__new-link" href="/write-ups/new">
          Write a Trip Write-up
        </a>
      </div>

      <div className="writeups-page__field">
        <label className="writeups-page__label" htmlFor="writeups-destination-filter">
          Destination
        </label>
        <select
          id="writeups-destination-filter"
          className="writeups-page__input"
          value={destinationId}
          onChange={(event) => {
            setDestinationId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All destinations</option>
          {(destinations ?? []).map((destination) => (
            <option key={destination.id} value={destination.id}>
              {destination.name}, {destination.country}
            </option>
          ))}
        </select>
        {destinationsError ? <p className="writeups-page__field-note">Couldn't load destinations to filter by — showing all write-ups.</p> : null}
      </div>

      {viewState === 'loading' ? <RowSkeleton count={4} /> : null}

      {viewState === 'error' ? (
        <EmptyState headline="Couldn't load this." body="Something went wrong loading write-ups." primaryAction={{ label: 'Retry', onClick: () => refetch() }} />
      ) : null}

      {viewState === 'empty' ? (
        <EmptyState
          headline={destinationId ? 'No write-ups match this filter.' : 'No write-ups yet.'}
          body={destinationId ? 'Try a different destination, or clear the filter.' : 'Check back soon, or be the first to publish one.'}
        />
      ) : null}

      {viewState === 'results' ? (
        <>
          <div className="writeups-page__list">
            {data!.items.map((writeup) => (
              <Row
                key={writeup.id}
                headline={writeup.title}
                description={bodyPreview(writeup.body)}
                eyebrow={writeup.destination ? `${writeup.destination.name}, ${writeup.destination.country}` : undefined}
                thumbnail={writeup.photoUrls[0] ? { src: writeup.photoUrls[0], alt: writeup.title } : undefined}
                href={`/write-ups/${writeup.id}`}
              />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="writeups-page__pagination">
              <button type="button" className="writeups-page__page-button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </button>
              <span className="writeups-page__page-status">
                Page {page} of {totalPages}
              </span>
              <button type="button" className="writeups-page__page-button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
