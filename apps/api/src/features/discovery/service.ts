import { prisma } from '../../shared/prisma.js';

/**
 * The trimmed field set the frontend needs — excludes `slug` (an
 * internal seed key) and `createdAt` (not used by any Discover UI).
 */
export interface DestinationSummary {
  id: string;
  name: string;
  country: string;
  region: string;
  tripType: string;
  description: string;
  photoUrl: string;
}

/**
 * The discovery slice owns `Destination` and reads it directly via
 * Prisma — it's the owning slice, not a cross-slice read (AD-1's rule
 * restricts *other* slices, not the owner — see
 * SOLUTION-DESIGN.md's Architectural Decisions, AD-1).
 *
 * No filter params: filtering happens client-side against this one
 * unfiltered fetch of the full (seed-only, structurally small) catalog
 * — see spec-1-2's Boundaries & Constraints.
 */
export async function listDestinations(): Promise<DestinationSummary[]> {
  return prisma.destination.findMany({
    select: {
      id: true,
      name: true,
      country: true,
      region: true,
      tripType: true,
      description: true,
      photoUrl: true,
    },
    orderBy: { name: 'asc' },
  });
}
