/**
 * EXPERIENCE.md > Responsive & Platform — the three breakpoints, as the
 * single JS-side source every slice's responsive logic should read from
 * (mirrors the CSS custom properties in a11y.css). There are exactly
 * three: phone (< 768px), tablet (768–1023px), desktop (>= 1024px).
 */
export const BREAKPOINT_TABLET_MIN = 768;
export const BREAKPOINT_DESKTOP_MIN = 1024;

export const MEDIA_QUERY_TABLET_UP = `(min-width: ${BREAKPOINT_TABLET_MIN}px)`;
export const MEDIA_QUERY_DESKTOP_UP = `(min-width: ${BREAKPOINT_DESKTOP_MIN}px)`;
export const MEDIA_QUERY_PHONE_ONLY = `(max-width: ${BREAKPOINT_TABLET_MIN - 1}px)`;

export type Breakpoint = 'phone' | 'tablet' | 'desktop';

/** Classifies a viewport width into one of the three EXPERIENCE.md breakpoints. */
export function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINT_DESKTOP_MIN) return 'desktop';
  if (width >= BREAKPOINT_TABLET_MIN) return 'tablet';
  return 'phone';
}
