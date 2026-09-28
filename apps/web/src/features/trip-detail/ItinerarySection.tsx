import { useRef, useState } from 'react';
import { useAnnounce } from '../../shared/LiveRegion';
import { useUpdateItinerary } from './useUpdateItinerary';
import type { ItineraryItem, ItineraryItemInput } from './api';
import './ItinerarySection.css';

function toInput(item: ItineraryItem): ItineraryItemInput {
  return { day: item.day, title: item.title, note: item.note };
}

/** Next "Day N" label, using the highest existing N (not the array length) so removing a line and adding a new one can't collide with a surviving line's label. */
function nextDayLabel(items: ItineraryItem[]): string {
  const maxDayNumber = items.reduce((max, item) => {
    const match = /^Day (\d+)$/.exec(item.day);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `Day ${maxDayNumber + 1}`;
}

/**
 * AD-8: every add/edit/remove sends the *entire* itinerary in one `PUT`
 * (spec-1-5's Always constraint) — there's no per-line endpoint. A line's
 * title is the inline-editable "line" (day is set once at add time, per
 * the spec's Never list — remove + re-add is the path to change it).
 */
export function ItinerarySection({ tripCode, items }: { tripCode: string; items: ItineraryItem[] }) {
  const mutation = useUpdateItinerary(tripCode);
  const announce = useAnnounce();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [newLineTitle, setNewLineTitle] = useState('');
  // Escape triggers a blur too (moving focus away) — this flag tells the
  // blur handler "the user cancelled, don't commit" instead of saving
  // whatever was typed before the Escape key was pressed.
  const cancelledRef = useRef(false);

  const saveError = mutation.isError ? "Didn't save. Try again." : null;

  const save = (nextItems: ItineraryItemInput[], onDone?: () => void) => {
    mutation.mutate(nextItems, {
      onSuccess: () => {
        announce('Itinerary updated.');
        onDone?.();
      },
      onError: () => announce("Didn't save. Try again."),
    });
  };

  const startEditing = (item: ItineraryItem) => {
    if (mutation.isPending) return;
    setEditingId(item.id);
    setEditingValue(item.title);
  };

  // EXPERIENCE.md's Save-failure state pattern: "Input value is retained,
  // not cleared." Editing/new-line state is only cleared inside `save`'s
  // success callback below, never optimistically before the request
  // resolves — a failed save leaves the row exactly as the user left it.
  const commitEdit = () => {
    if (!editingId) return;
    if (cancelledRef.current) {
      cancelledRef.current = false;
      setEditingId(null);
      return;
    }
    const id = editingId;
    const original = items.find((item) => item.id === id);
    const trimmed = editingValue.trim();
    if (!original || trimmed === original.title || !trimmed) {
      setEditingId(null);
      return;
    }
    save(
      items.map((item) => toInput(item.id === id ? { ...item, title: trimmed } : item)),
      () => setEditingId(null),
    );
  };

  const cancelEdit = (event: React.KeyboardEvent<HTMLInputElement>) => {
    cancelledRef.current = true;
    event.currentTarget.blur();
  };

  const removeItem = (id: string) => {
    if (mutation.isPending) return;
    save(items.filter((item) => item.id !== id).map(toInput));
  };

  const commitNewLine = () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      setIsAddingLine(false);
      setNewLineTitle('');
      return;
    }
    const trimmed = newLineTitle.trim();
    if (!trimmed) {
      setIsAddingLine(false);
      return;
    }
    save([...items.map(toInput), { day: nextDayLabel(items), title: trimmed }], () => {
      setIsAddingLine(false);
      setNewLineTitle('');
    });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    else if (event.key === 'Escape') cancelEdit(event);
  };

  return (
    <section className="itinerary-section">
      <h2 className="itinerary-section__heading">Itinerary</h2>
      <p className="itinerary-section__sub">Any trip member can add or edit a line.</p>

      {saveError ? (
        <p className="itinerary-section__error" role="alert">
          {saveError}
        </p>
      ) : null}

      <ul className="itinerary-section__list">
        {items.map((item) => (
          <li key={item.id} className="itinerary-row">
            <span className="itinerary-row__day">{item.day}</span>
            {editingId === item.id ? (
              <input
                className="itinerary-row__title-input"
                type="text"
                value={editingValue}
                autoFocus
                maxLength={200}
                onChange={(event) => setEditingValue(event.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
              />
            ) : (
              <button
                type="button"
                className="itinerary-row__title"
                onClick={() => startEditing(item)}
                disabled={mutation.isPending}
              >
                {item.title}
              </button>
            )}
            <button
              type="button"
              className="itinerary-row__remove"
              onClick={() => removeItem(item.id)}
              disabled={mutation.isPending}
              aria-label={`Remove "${item.title}"`}
            >
              Remove
            </button>
          </li>
        ))}

        {isAddingLine ? (
          <li className="itinerary-row">
            <span className="itinerary-row__day">{nextDayLabel(items)}</span>
            <input
              className="itinerary-row__title-input"
              type="text"
              value={newLineTitle}
              autoFocus
              maxLength={200}
              placeholder="Add a line…"
              onChange={(event) => setNewLineTitle(event.target.value)}
              onBlur={commitNewLine}
              onKeyDown={handleKeyDown}
            />
          </li>
        ) : null}
      </ul>

      {!isAddingLine ? (
        <button type="button" className="itinerary-section__add" onClick={() => setIsAddingLine(true)} disabled={mutation.isPending}>
          + Add a line
        </button>
      ) : null}
    </section>
  );
}
