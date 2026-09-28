import { nanoid } from 'nanoid';
import { prisma } from '../../shared/prisma.js';
import { AppError } from '../../shared/error-middleware.js';

export interface CreateTripInput {
  name: string;
  destinationId: string;
  startDate: Date;
  endDate: Date;
}

/**
 * The trimmed shape both `createTrip` and `getTripByCode` return —
 * everything Trip Detail's header needs, nothing from later stories'
 * fields (itinerary, buddies, accommodation).
 */
export interface TripDetail {
  id: string;
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date;
  destination: {
    id: string;
    name: string;
    country: string;
  };
}

const TRIP_SELECT = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  destination: {
    select: { id: true, name: true, country: true },
  },
} as const;

/**
 * AD-2/AD-3: the Trip's `id` doubles as its Trip Code — `nanoid(10)`,
 * never a separate code field. `destinationId` is validated against
 * Destination directly (AD-1's seed-data exception: any slice may read
 * Destination without going through the discovery slice).
 */
export async function createTrip(input: CreateTripInput): Promise<TripDetail> {
  const destination = await prisma.destination.findUnique({ where: { id: input.destinationId } });
  if (!destination) {
    throw new AppError('VALIDATION_ERROR', 'destinationId does not match a known destination.');
  }

  return prisma.trip.create({
    data: {
      id: nanoid(10),
      name: input.name,
      destinationId: input.destinationId,
      startDate: input.startDate,
      endDate: input.endDate,
    },
    select: TRIP_SELECT,
  });
}

/** Throws NOT_FOUND for an unknown/malformed code — never returns null. */
export async function getTripByCode(code: string): Promise<TripDetail> {
  const trip = await prisma.trip.findUnique({ where: { id: code }, select: TRIP_SELECT });
  if (!trip) {
    throw new AppError('NOT_FOUND', `No Trip matches code "${code}".`);
  }
  return trip;
}

export interface TripMemberSummary {
  id: string;
  displayName: string;
  joinedAt: Date;
}

/**
 * AD-6: the one path into membership — a direct Traveler Profile
 * submission (this story) and Epic 2's buddy-request accept both call
 * this same function, never inline `TripMember` creation.
 */
export async function addMember(tripCode: string, displayName: string): Promise<TripMemberSummary> {
  const trimmedCode = tripCode.trim();
  const trip = await prisma.trip.findUnique({ where: { id: trimmedCode } });
  if (!trip) {
    throw new AppError('NOT_FOUND', `No Trip matches code "${tripCode}".`);
  }

  return prisma.tripMember.create({
    data: { id: nanoid(), tripId: trimmedCode, displayName },
    select: { id: true, displayName: true, joinedAt: true },
  });
}
