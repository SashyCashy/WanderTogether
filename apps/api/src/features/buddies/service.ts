import { nanoid } from 'nanoid';
import { prisma } from '../../shared/prisma.js';
import { AppError } from '../../shared/error-middleware.js';
import {
  listOpenTripsForBuddies,
  getOpenTripForBuddies,
  resolveTripIdForBuddyListing,
  addMember,
  type OpenTripForBuddies,
  type TripMemberSummary,
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

export interface PendingBuddyRequest {
  id: string;
  requesterName: string;
  message: string | null;
  createdAt: Date;
}

/** `TravelBuddyRequest` is `buddies`' own table — this is a direct Prisma read, not a cross-slice violation. */
export async function listPendingRequestsForTrip(tripCode: string): Promise<PendingBuddyRequest[]> {
  return prisma.travelBuddyRequest.findMany({
    where: { tripId: tripCode, status: 'pending' },
    select: { id: true, requesterName: true, message: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Verifies a request exists and belongs to `tripCode` (404 otherwise) and
 * returns its `requesterName`. Does *not* check `status` here — that
 * check has to be atomic with the status *write* (see `claimRequest`
 * below), not a separate prior read, or two concurrent accept/decline
 * calls can both pass a "is it pending?" check before either writes.
 */
async function findRequestForTrip(tripCode: string, requestId: string): Promise<{ requesterName: string }> {
  const request = await prisma.travelBuddyRequest.findUnique({ where: { id: requestId }, select: { tripId: true, requesterName: true } });
  if (!request || request.tripId !== tripCode) {
    throw new AppError('NOT_FOUND', 'No pending buddy request matches this id for this Trip.');
  }
  return request;
}

/**
 * Atomically claims a request from `"pending"` to `nextStatus` — the
 * `status: 'pending'` filter is checked and written in the same SQLite
 * statement, so of any number of concurrent accept/decline calls for the
 * same request, exactly one can ever see `count === 1`; every other
 * caller (including a concurrent accept *and* decline racing each other)
 * gets `count === 0` and a `409 CONFLICT` instead of a double-handled
 * request. A prior read-then-write (checking `status` in one query, then
 * writing in a second) cannot make this guarantee.
 */
async function claimRequest(tripCode: string, requestId: string, nextStatus: 'accepted' | 'declined'): Promise<void> {
  const claim = await prisma.travelBuddyRequest.updateMany({
    where: { id: requestId, tripId: tripCode, status: 'pending' },
    data: { status: nextStatus },
  });
  if (claim.count === 0) {
    throw new AppError('CONFLICT', 'This request has already been handled.');
  }
}

/**
 * AD-6: accepting calls the exact same `trips.addMember` function a direct
 * Traveler Profile submission uses — never a second, parallel
 * TripMember-creation path. The status claim happens *before* `addMember`
 * runs, so only the caller that wins the race ever creates a member; if
 * `addMember` itself then fails, the claim is rolled back to `"pending"`
 * so the request doesn't end up falsely `"accepted"` with no member.
 */
export async function acceptBuddyRequest(tripCode: string, requestId: string): Promise<TripMemberSummary> {
  const { requesterName } = await findRequestForTrip(tripCode, requestId);
  await claimRequest(tripCode, requestId, 'accepted');

  try {
    return await addMember(tripCode, requesterName);
  } catch (error) {
    await prisma.travelBuddyRequest.updateMany({ where: { id: requestId, status: 'accepted' }, data: { status: 'pending' } });
    throw error;
  }
}

export async function declineBuddyRequest(tripCode: string, requestId: string): Promise<void> {
  await findRequestForTrip(tripCode, requestId);
  await claimRequest(tripCode, requestId, 'declined');
}
