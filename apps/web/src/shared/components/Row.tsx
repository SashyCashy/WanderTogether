import type { ReactNode } from 'react';
import './Row.css';

export interface RowProps {
  /** Row headline — Destination name, Trip name, Write-up title, etc. */
  headline: string;
  /** One-line supporting description under the headline. */
  description?: string;
  /**
   * Optional left-aligned thumbnail. Pass `alt: ''` for a decorative
   * swatch/placeholder per EXPERIENCE.md Accessibility Floor ("decorative
   * swatches ... are marked alt=''"); pass real alt text for a photo.
   */
  thumbnail?: { src: string; alt: string };
  /**
   * Right-aligned metadata (price, rating, count, a status tag). Stacks
   * below the title instead of sitting beside it on phone widths, per
   * DESIGN.md > Layout & Spacing.
   */
  metadata?: ReactNode;
  /** Small tracked-out eyebrow label above the headline (DESIGN.md eyebrow-label). */
  eyebrow?: string;
  /** Renders the row as a link to `href` when provided. */
  href?: string;
  /** Renders the row as a click/keyboard-activatable button when no `href` is given. */
  onClick?: () => void;
}

/**
 * DESIGN.md > Components > Rows: the primary list pattern for
 * Destinations, Trip Write-ups, and Travel Buddy Request listings — a
 * hairline-separated row, not a card.
 *
 * EXPERIENCE.md > Component Patterns > Row item: "Click anywhere on the
 * row opens the detail ... No separate 'view' button." The whole row is
 * one interactive element (an `<a>` or `<button>`) so pointer, touch, and
 * keyboard activation all land on the same target, and the row meets the
 * 44px minimum touch-target height from the Accessibility Floor.
 */
export function Row({ headline, description, thumbnail, metadata, eyebrow, href, onClick }: RowProps) {
  const content = (
    <>
      {thumbnail ? (
        <span className="row-item__thumbnail">
          <img src={thumbnail.src} alt={thumbnail.alt} />
        </span>
      ) : null}
      <span className="row-item__body">
        {eyebrow ? <span className="row-item__eyebrow">{eyebrow}</span> : null}
        <span className="row-item__headline">{headline}</span>
        {description ? <span className="row-item__description">{description}</span> : null}
      </span>
      {metadata ? <span className="row-item__metadata">{metadata}</span> : null}
    </>
  );

  if (href) {
    return (
      <a className="row-item" href={href}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className="row-item" onClick={onClick}>
      {content}
    </button>
  );
}
