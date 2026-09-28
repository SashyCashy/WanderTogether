import { useSyncExternalStore } from 'react';

/**
 * Minimal client-side router over the native History API — no library.
 * Story 1.3 is the first to need more than one screen; a full router is
 * unjustified for a handful of flat paths with no nested layouts (see
 * spec-1-3's Design Notes).
 */

const listeners = new Set<() => void>();

function getSnapshot(): string {
  return window.location.pathname + window.location.search;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('popstate', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('popstate', listener);
  };
}

/** Pushes a new path onto the History stack and notifies subscribers. */
export function navigate(path: string): void {
  if (path === getSnapshot()) return;
  window.history.pushState(null, '', path);
  for (const listener of listeners) listener();
}

/** The current `pathname + search`, re-rendering on navigation or back/forward. */
export function useRoute(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function isInternalNavigableClick(event: MouseEvent): HTMLAnchorElement | null {
  if (event.defaultPrevented || event.button !== 0) return null;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;

  const anchor = (event.target as HTMLElement).closest('a');
  if (!anchor || anchor.target || anchor.hasAttribute('download')) return null;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return null;

  return anchor;
}

/**
 * Installs one document-level click interceptor so every existing/future
 * `<a href>` (`Row`'s `href` prop, `Navigation`'s tabs) navigates through
 * this router instead of a full page load — no custom `Link` component
 * needed anywhere else in the app.
 */
export function installLinkInterceptor(): () => void {
  const handleClick = (event: MouseEvent) => {
    const anchor = isInternalNavigableClick(event);
    if (!anchor) return;
    event.preventDefault();
    const url = new URL(anchor.href, window.location.href);
    navigate(url.pathname + url.search);
  };

  document.addEventListener('click', handleClick);
  return () => document.removeEventListener('click', handleClick);
}
