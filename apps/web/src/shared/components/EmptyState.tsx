import './EmptyState.css';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
}

export interface EmptyStateProps {
  /** typography.headline one-liner, e.g. "No trips yet." or "Couldn't load this." */
  headline: string;
  /** typography.body supporting line, e.g. "Start one from Discover, or enter a Trip Code." */
  body: string;
  /** Primary action — e.g. "Start a Trip". Omit when there is no action (EXPERIENCE.md: "none when there isn't"). */
  primaryAction?: EmptyStateAction;
  /** Secondary action — e.g. My Trips' "Have a code?" alongside its primary action. */
  secondaryAction?: EmptyStateAction;
}

function ActionButton({ action, variant }: { action: EmptyStateAction; variant: 'primary' | 'secondary' }) {
  const className = `empty-state__action empty-state__action--${variant}`;
  if (action.href) {
    return (
      <a className={className} href={action.href}>
        {action.label}
      </a>
    );
  }
  return (
    <button type="button" className={className} onClick={action.onClick}>
      {action.label}
    </button>
  );
}

/**
 * DESIGN.md > Components > empty-state + EXPERIENCE.md > Component
 * Patterns > Empty state. Covers every listing surface's empty/cold/error
 * treatment (No results, No trips yet, Listing failed to load) so each
 * slice reuses one shape instead of re-deriving the headline/body/padding
 * rhythm per screen.
 */
export function EmptyState({ headline, body, primaryAction, secondaryAction }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-state__headline">{headline}</p>
      <p className="empty-state__body">{body}</p>
      {primaryAction || secondaryAction ? (
        <div className="empty-state__actions">
          {primaryAction ? <ActionButton action={primaryAction} variant="primary" /> : null}
          {secondaryAction ? <ActionButton action={secondaryAction} variant="secondary" /> : null}
        </div>
      ) : null}
    </div>
  );
}
