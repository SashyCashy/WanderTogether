import './RowSkeleton.css';

export interface RowSkeletonProps {
  /** Number of placeholder rows to render — EXPERIENCE.md > Loading & Empty States: "4-6". */
  count?: number;
}

/**
 * EXPERIENCE.md > Loading & Empty States > Cold load: "Row-shaped skeleton
 * placeholders (4-6), matching final row layout, resolving on data."
 *
 * Shared (not Discover-local) because every later listing surface
 * (Buddies, Write-ups, Accommodations) needs the same cold-load treatment
 * — Story 1.1's shared layer didn't build this despite EXPERIENCE.md
 * requiring it; Discover is just the first surface that needs it.
 */
export function RowSkeleton({ count = 5 }: RowSkeletonProps) {
  return (
    <div className="row-skeleton-list" role="presentation" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="row-skeleton" key={index}>
          <span className="row-skeleton__thumbnail" />
          <span className="row-skeleton__body">
            <span className="row-skeleton__line row-skeleton__line--headline" />
            <span className="row-skeleton__line row-skeleton__line--description" />
          </span>
        </div>
      ))}
    </div>
  );
}
