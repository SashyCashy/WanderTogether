import { nanoid } from 'nanoid';
import { prisma } from '../../shared/prisma.js';
import { AppError } from '../../shared/error-middleware.js';
import {
  listOpenTripsForBuddies,
  getOpenTripForBuddies,
  resolveTripIdForBuddyListing,
  type OpenTripForBuddies,
} from '../trips/service.js';

export type { OpenTripForBuddies };

/** AD-1: reads go through the `trips`-exported functions — this slice never queries `Trip` directly. */
export async function listBuddyListings(): Promise<OpenTripForBuddies[]> {
  return listOpenTripsForBuddies();
}

export async function getBuddyListing(buddyListingId: string): Promise<OpenTripForBuddies> {
  return getOpenTripForBuddies(buddyListingId);
}

export interface BuddyRequestSummary {
  id: string;
  status: string;
}

/**
 * Resolves the real Trip Code via `trips` (never returned to the caller),
 * then creates the `TravelBuddyRequest` — `buddies`' own table, so this
 * part is a direct Prisma write, not a cross-slice violation. Submitting
 * alone never creates a `TripMember` row — that only happens on accept
 * (Story 2.3), via the same shared `addMember` function Story 1.4 uses.
 */
export async function submitBuddyRequest(buddyListingId: string, requesterName: string, message: string | null): Promise<BuddyRequestSummary> {
  const tripId = await resolveTripIdForBuddyListing(buddyListingId);

  return prisma.travelBuddyRequest.create({
    data: { id: nanoid(), tripId, requesterName, message, status: 'pending' },
    select: { id: true, status: true },
  });
}

export interface BuddyRequestStatus {
  status: string;
  /**
   * Only present once `status === 'accepted'` — the one place a real Trip
   * Code is revealed to a Buddies-flow participant. Safe here: the caller
   * already holds a private, unguessable `requestId` only their own
   * browser ever received (not a public browse context), which is
   * exactly the AD-7 concern this design is built around avoiding.
   */
  tripCode?: string;
}

export async function getBuddyRequestStatus(requestId: string): Promise<BuddyRequestStatus> {
  const request = await prisma.travelBuddyRequest.findUnique({ where: { id: requestId }, select: { status: true, tripId: true } });
  if (!request) {
    throw new AppError('NOT_FOUND', 'No buddy request matches this id.');
  }
  if (request.status === 'accepted') {
    return { status: request.status, tripCode: request.tripId };
  }
  return { status: request.status };
}
