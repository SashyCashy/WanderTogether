import { useEffect, useId, useRef, useState } from 'react';
import { useAnnounce } from '../../shared/LiveRegion';
import { useUpdateTripSettings } from './useUpdateTripSettings';
import './BuddyToggle.css';

/**
 * Story 2.1's switch + note. `openToBuddies` and `buddyNote` save via
 * independent `PATCH` calls (AD-8's partial-merge rule) — toggling never
 * depends on the note's save state or vice versa, which is why each uses
 * its own `useUpdateTripSettings` instance rather than sharing one (a
 * shared instance's `isPending` would couple the switch's disabled state
 * to an in-flight note save). No pending-requests list or Buddies browse
 * surface here — Stories 2.2/2.3.
 */
export function BuddyToggle({
  tripCode,
  openToBuddies,
  buddyNote,
}: {
  tripCode: string;
  openToBuddies: boolean;
  buddyNote: string | null;
}) {
  const toggleMutation = useUpdateTripSettings(tripCode);
  const noteMutation = useUpdateTripSettings(tripCode);
  const announce = useAnnounce();
  const labelId = useId();
  const noteId = useId();
  const [noteValue, setNoteValue] = useState(buddyNote ?? '');
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  // A Trip is shared — another member's edit can update `buddyNote`
  // behind this one. Re-sync the draft from the prop, but never while
  // this field is actively focused (that would clobber an in-progress
  // edit the user hasn't saved yet).
  useEffect(() => {
    if (document.activeElement === noteInputRef.current) return;
    setNoteValue(buddyNote ?? '');
  }, [buddyNote]);

  const handleToggle = () => {
    const next = !openToBuddies;
    toggleMutation.mutate(
      { openToBuddies: next },
      {
        onSuccess: () => announce(next ? 'Open to buddies. Note field revealed.' : 'No longer open to buddies.'),
        onError: () => announce("Didn't save. Try again."),
      },
    );
  };

  const commitNote = () => {
    const trimmed = noteValue.trim();
    if (trimmed === (buddyNote ?? '')) return;
    noteMutation.mutate({ buddyNote: trimmed || null }, { onError: () => announce("Didn't save. Try again.") });
  };

  return (
    <section className="buddy-toggle">
      <div className="buddy-toggle__row">
        <span id={labelId} className="buddy-toggle__label">
          Open to buddies
        </span>
        <button
          type="button"
          className="buddy-toggle__switch-hit hit-area-min"
          role="switch"
          aria-checked={openToBuddies}
          aria-labelledby={labelId}
          onClick={handleToggle}
          disabled={toggleMutation.isPending}
        >
          <span className={openToBuddies ? 'buddy-toggle__switch buddy-toggle__switch--on' : 'buddy-toggle__switch'} />
        </button>
      </div>

      {openToBuddies ? (
        <div className="buddy-toggle__note-field">
          <label className="buddy-toggle__note-label" htmlFor={noteId}>
            Note for travelers
          </label>
          <textarea
            id={noteId}
            ref={noteInputRef}
            className="buddy-toggle__note-input"
            value={noteValue}
            maxLength={280}
            placeholder="Spots available, what you're looking for…"
            onChange={(event) => setNoteValue(event.target.value)}
            onBlur={commitNote}
          />
        </div>
      ) : null}
    </section>
  );
}
