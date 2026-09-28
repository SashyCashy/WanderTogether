import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../shared/components/EmptyState';
import { useAnnounce } from '../../shared/LiveRegion';
import { fetchWriteup, ApiError } from './api';
import './WriteupDetailPage.css';

export function WriteupDetailPage({ writeupId }: { writeupId: string }) {
  const { data: writeup, isLoading, isError, error } = useQuery({
    queryKey: ['write-up', writeupId],
    queryFn: () => fetchWriteup(writeupId),
    retry: false,
  });
  const announce = useAnnounce();

  const isNotFound = error instanceof ApiError && error.status === 404;

  useEffect(() => {
    if (isLoading) return;
    if (isNotFound) announce("Couldn't find this write-up.");
    else if (isError) announce("Couldn't load this write-up.");
  }, [isLoading, isError, isNotFound, announce]);

  if (isLoading) {
    return (
      <main className="writeup-detail-page">
        <p className="writeup-detail-page__loading">Loading…</p>
      </main>
    );
  }

  if (isError || !writeup) {
    return (
      <main className="writeup-detail-page">
        <EmptyState
          headline={isNotFound ? "Couldn't find this write-up." : "Couldn't load this."}
          body={isNotFound ? 'It may have been removed.' : 'Something went wrong loading this write-up.'}
          primaryAction={{ label: 'Back to Write-ups', href: '/write-ups' }}
        />
      </main>
    );
  }

  return (
    <main className="writeup-detail-page">
      <a className="writeup-detail-page__back-link" href="/write-ups">
        Back to Write-ups
      </a>
      {writeup.destination ? (
        <p className="writeup-detail-page__eyebrow">
          {writeup.destination.name}, {writeup.destination.country}
        </p>
      ) : null}
      <h1 className="writeup-detail-page__title">{writeup.title}</h1>
      {writeup.authorName ? <p className="writeup-detail-page__author">By {writeup.authorName}</p> : null}

      {writeup.photoUrls.length > 0 ? (
        <div className="writeup-detail-page__photos">
          {writeup.photoUrls.map((url, index) => (
            <img key={url} className="writeup-detail-page__photo" src={url} alt={`Photo ${index + 1} from ${writeup.title}`} />
          ))}
        </div>
      ) : null}

      <p className="writeup-detail-page__body">{writeup.body}</p>
    </main>
  );
}
