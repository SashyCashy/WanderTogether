import { nanoid } from 'nanoid';
import { prisma } from '../../shared/prisma.js';
import { AppError } from '../../shared/error-middleware.js';

export interface CreateTripInput {
  name: string;
  destinationId: string;
  startDate: Date;
  endDate: Date;
}

export interface ItineraryItemSummary {
  id: string;
  day: string;
  title: string;
  note: string | null;
}

/**
 * The trimmed shape both `createTrip` and `getTripByCode` return —
 * everything Trip Detail's header + itinerary needs, nothing from later
 * stories' fields (buddies, accommodation).
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
  itineraryItems: ItineraryItemSummary[];
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
  itineraryItems: {
    select: { id: true, day: true, title: true, note: true },
    orderBy: { createdAt: 'asc' },
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
    throw new AppError('NOT_FOUND', `No Trip matches code "${trimmedCode}".`);
  }

  return prisma.tripMember.create({
    data: { id: nanoid(), tripId: trimmedCode, displayName },
    select: { id: true, displayName: true, joinedAt: true },
  });
}

export interface ItineraryItemInput {
  day: string;
  title: string;
  note?: string | null;
}

/**
 * AD-8: the one Trip-level write that's a full-resource overwrite, not
 * PATCH-partial-merge — deletes every existing line and recreates the
 * submitted array in one `$transaction`, no version/lock check, last
 * write wins. Each recreated row's `createdAt` is stamped `base + index`
 * milliseconds (not left to SQLite's default, second-resolution `now()`)
 * so `orderBy: { createdAt: 'asc' }` reliably preserves submission order
 * even when several lines are recreated within the same second.
 */
export async function updateItinerary(tripCode: string, items: ItineraryItemInput[]): Promise<ItineraryItemSummary[]> {
  const trimmedCode = tripCode.trim();
  const trip = await prisma.trip.findUnique({ where: { id: trimmedCode } });
  if (!trip) {
    throw new AppError('NOT_FOUND', `No Trip matches code "${trimmedCode}".`);
  }

  const base = Date.now();
  const results = await prisma.$transaction([
    prisma.itineraryItem.deleteMany({ where: { tripId: trimmedCode } }),
    ...items.map((item, index) =>
      prisma.itineraryItem.create({
        data: {
          id: nanoid(),
          tripId: trimmedCode,
          day: item.day,
          title: item.title,
          // Normalize an empty/whitespace-only note the same way a
          // missing one is — both mean "no note," and zod's `.trim()`
          // alone leaves `""` as `""`, not `null`.
          note: item.note ? item.note : null,
          createdAt: new Date(base + index),
        },
        select: { id: true, day: true, title: true, note: true },
      }),
    ),
  ]);

  // Defensive: the slice below assumes position 0 is always the
  // deleteMany and every later position is one created item, in the
  // order submitted. Guard it so a future edit to this transaction's
  // shape fails loudly instead of silently returning the wrong rows.
  if (results.length !== items.length + 1) {
    throw new Error(`updateItinerary: expected ${items.length + 1} transaction results, got ${results.length}.`);
  }

  return results.slice(1) as ItineraryItemSummary[];
}
