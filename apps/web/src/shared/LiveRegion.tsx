import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * EXPERIENCE.md > Accessibility Floor:
 * "Same-page updates with no navigation (accepting a buddy request,
 * revealing the note field on toggle) are announced to screen readers via
 * a polite live region — a sighted user sees the row change; a
 * screen-reader user needs the equivalent (WCAG 4.1.3)."
 *
 * One app-level live region + `useAnnounce()` hook so every later slice
 * announces through the same mechanism instead of each inventing its own
 * `aria-live` element.
 */

type AnnounceFn = (message: string) => void;

const AnnounceContext = createContext<AnnounceFn | null>(null);

export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  // Toggling through an empty string first guarantees repeated identical
  // announcements ("Request sent.") are still read out, not deduped away
  // by the browser because the live region's text content didn't change.
  const resetTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((next: string) => {
    if (resetTimeout.current) clearTimeout(resetTimeout.current);
    setMessage('');
    resetTimeout.current = setTimeout(() => setMessage(next), 50);
  }, []);

  useEffect(() => {
    return () => {
      if (resetTimeout.current) clearTimeout(resetTimeout.current);
    };
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" className="visually-hidden">
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

/** Announces `message` politely via the app-level live region. */
export function useAnnounce(): AnnounceFn {
  const announce = useContext(AnnounceContext);
  return useMemo(() => {
    if (announce) return announce;
    // Outside the provider (e.g. an isolated unit test), degrade to a
    // no-op rather than throwing — announcing is an enhancement, not a
    // hard dependency for a component to render.
    return () => {};
  }, [announce]);
}
