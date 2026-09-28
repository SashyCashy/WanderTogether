import { useId, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { fetchTrip, ApiError } from './api';
import { navigate } from '../../shared/router';
import './JoinTripPage.css';

/**
 * "Have a code?" entry point (EXPERIENCE.md's Join a Trip IA row). Resolves
 * a bare Trip Code by reusing `fetchTrip` (the same `GET /api/trips/:code`
 * Trip Detail uses) — a valid code navigates on to `/trip/:code`, where the
 * Traveler Profile gate takes over; an invalid one shows an inline error
 * tied to the field and never navigates ("no redirect, no blank page").
 * Validates on submit only — no per-keystroke fetch, no flicker while typing.
 */
export function JoinTripPage() {
  const [code, setCode] = useState('');
  const errorId = useId();
  const mutation = useMutation({
    mutationFn: (submittedCode: string) => fetchTrip(submittedCode.trim()),
    onSuccess: (trip) => navigate(`/trip/${trip.id}`),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mutation.isPending) return;
    if (!code.trim()) return;
    mutation.mutate(code);
  };

  const errorMessage =
    mutation.error instanceof ApiError && mutation.error.status === 404
      ? "This code doesn't match a trip. Check it and try again."
      : mutation.error
        ? "Couldn't check that code. Try again."
        : null;

  return (
    <main className="join-trip-page">
      <h1>Have a code?</h1>
      <p className="join-trip-page__intro">Enter the Trip Code your friend shared with you.</p>

      <form className="join-trip-page__form" onSubmit={handleSubmit}>
        <label className="join-trip-page__label" htmlFor="join-trip-code">
          Trip Code
        </label>
        <input
          id="join-trip-code"
          className="join-trip-page__input"
          type="text"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          aria-describedby={errorMessage ? errorId : undefined}
          aria-invalid={errorMessage ? true : undefined}
          required
        />
        {errorMessage ? (
          <p id={errorId} className="join-trip-page__error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <button type="submit" className="join-trip-page__submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Checking…' : 'Go to Trip'}
        </button>
      </form>
    </main>
  );
}
