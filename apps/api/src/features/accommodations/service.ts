import { prisma } from '../../shared/prisma.js';

export interface AccommodationListingSummary {
  id: string;
  name: string;
  type: string;
  pricePerNightUSD: number;
  rating: number;
  photoUrl: string;
  description: string;
}

/**
 * AD-12's exception to AD-1: `AccommodationListing` is seed-only, static
 * reference data, so any slice may read it directly via Prisma — same
 * idiom `discovery/service.ts`'s `listDestinations` already uses for the
 * Destination catalog. No `destinationId` existence check: an unknown id
 * simply yields an empty array, same as Discover's own read path.
 */
export async function listAccommodationsForDestination(destinationId: string): Promise<AccommodationListingSummary[]> {
  return prisma.accommodationListing.findMany({
    where: { destinationId },
    select: {
      id: true,
      name: true,
      type: true,
      pricePerNightUSD: true,
      rating: true,
      photoUrl: true,
      description: true,
    },
    // `name` breaks ties between equal ratings — without a secondary key,
    // same-rated listings would have a DB-dependent (effectively random)
    // order that could vary between otherwise-identical requests.
    orderBy: [{ rating: 'desc' }, { name: 'asc' }],
  });
}
