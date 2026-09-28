import { useEffect, useRef, useState } from 'react';
import { useDestinations } from '../discover/useDestinations';
import { useCreateWriteup } from './useCreateWriteup';
import { ApiError } from './api';
import { useAnnounce } from '../../shared/LiveRegion';
import './WriteupComposerPage.css';

const MAX_PHOTOS = 6;

/**
 * spec-3-1: no Trip Code or membership required anywhere in this flow —
 * a write-up is never attached to a Trip, only optionally to a Destination.
 * A rejection (missing photo, oversized file, wrong type, unknown
 * destination) must be shown inline without clearing the form (Always
 * constraint) — form state below is never reset on a failed mutation.
 */
export function WriteupComposerPage() {
  const { data: destinations, isLoading: destinationsLoading, isError: destinationsError } = useDestinations();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoCountError, setPhotoCountError] = useState<string | null>(null);
  const mutation = useCreateWriteup();
  const announce = useAnnounce();
  const photosInputRef = useRef<HTMLInputElement>(null);

  const handlePhotosChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > MAX_PHOTOS) {
      setPhotoCountError(`Choose up to ${MAX_PHOTOS} photos.`);
      const truncated = files.slice(0, MAX_PHOTOS);
      setPhotos(truncated);
      // The native input's own file list still holds every file the
      // person picked, past what will actually be submitted — clearing it
      // keeps the displayed selection honest about the MAX_PHOTOS cap.
      event.target.value = '';
      return;
    }
    setPhotoCountError(null);
    setPhotos(files);
  };

  const resetForm = () => {
    setTitle('');
    setBody('');
    setAuthorName('');
    setDestinationId('');
    setPhotos([]);
    setPhotoCountError(null);
    if (photosInputRef.current) photosInputRef.current.value = '';
    mutation.reset();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    if (photos.length === 0) {
      setPhotoCountError('At least one photo is required.');
      return;
    }
    setPhotoCountError(null);
    mutation.mutate({
      title,
      body,
      authorName: authorName.trim() || undefined,
      destinationId: destinationId || undefined,
      photos,
    });
  };

  const errorMessage =
    mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error
        ? 'Something went wrong publishing this write-up.'
        : null;

  useEffect(() => {
    if (errorMessage) announce(errorMessage);
  }, [errorMessage, announce]);

  useEffect(() => {
    if (photoCountError) announce(photoCountError);
  }, [photoCountError, announce]);

  useEffect(() => {
    if (mutation.isSuccess) announce('Write-up published.');
  }, [mutation.isSuccess, announce]);

  if (mutation.isSuccess) {
    return (
      <main className="writeup-composer-page">
        <h1>Write a Trip Write-up</h1>
        <p className="writeup-composer-page__confirmation" role="status">
          Write-up published.
        </p>
        <button type="button" className="writeup-composer-page__submit" onClick={resetForm}>
          Publish another
        </button>
      </main>
    );
  }

  return (
    <main className="writeup-composer-page">
      <h1>Write a Trip Write-up</h1>
      <p className="writeup-composer-page__intro">No Trip or account needed — share a story from anywhere you've been.</p>

      <form className="writeup-composer-page__form" onSubmit={handleSubmit}>
        <div className="writeup-composer-page__field">
          <label className="writeup-composer-page__label" htmlFor="writeup-title">
            Title
          </label>
          <input
            id="writeup-title"
            className="writeup-composer-page__input"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            required
          />
        </div>

        <div className="writeup-composer-page__field">
          <label className="writeup-composer-page__label" htmlFor="writeup-body">
            Story
          </label>
          <textarea
            id="writeup-body"
            className="writeup-composer-page__textarea"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={5000}
            rows={10}
            required
          />
        </div>

        <div className="writeup-composer-page__field">
          <label className="writeup-composer-page__label" htmlFor="writeup-author">
            Your name (optional)
          </label>
          <input
            id="writeup-author"
            className="writeup-composer-page__input"
            type="text"
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            maxLength={100}
          />
        </div>

        <div className="writeup-composer-page__field">
          <label className="writeup-composer-page__label" htmlFor="writeup-destination">
            Destination (optional)
          </label>
          {destinationsError ? (
            <p className="writeup-composer-page__field-error" role="alert">
              Couldn't load destinations. You can still publish without linking one.
            </p>
          ) : (
            <select
              id="writeup-destination"
              className="writeup-composer-page__input"
              value={destinationId}
              onChange={(event) => setDestinationId(event.target.value)}
              disabled={destinationsLoading}
            >
              <option value="">{destinationsLoading ? 'Loading destinations…' : 'No destination'}</option>
              {(destinations ?? []).map((destination) => (
                <option key={destination.id} value={destination.id}>
                  {destination.name}, {destination.country}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="writeup-composer-page__field">
          <label className="writeup-composer-page__label" htmlFor="writeup-photos">
            Photos
          </label>
          <input
            id="writeup-photos"
            ref={photosInputRef}
            className="writeup-composer-page__input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handlePhotosChange}
            aria-describedby={photoCountError ? 'writeup-photo-count-error' : undefined}
            aria-invalid={photoCountError ? true : undefined}
            required
          />
          {photos.length > 0 ? (
            <p className="writeup-composer-page__photo-count">
              {photos.length} photo{photos.length === 1 ? '' : 's'} selected
            </p>
          ) : null}
        </div>

        {photoCountError ? (
          <p id="writeup-photo-count-error" className="writeup-composer-page__field-error" role="alert">
            {photoCountError}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="writeup-composer-page__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" className="writeup-composer-page__submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Publishing…' : 'Publish'}
        </button>
      </form>
    </main>
  );
}
