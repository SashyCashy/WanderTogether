import { Router } from 'express';
import { z } from 'zod';
import { createTrip, getTripByCode, addMember, updateItinerary, updateTripSettings } from './service.js';
import { AppError } from '../../shared/error-middleware.js';
// Imports from buddies/service.js, not trips/service.js — buddies/service.js
// already imports from trips/service.js for its own reads/writes, so routing
// this dependency through trips/service.js too would create a cycle between
// the two modules. Routes-to-service is fine; service-to-service isn't.
import { listPendingRequestsForTrip, acceptBuddyRequest, declineBuddyRequest } from '../buddies/service.js';

// z.iso.date() (not z.coerce.date()) — the spec's Always constraint requires
// "ISO date strings"; the generic coercer accepts anything the native Date
// constructor parses (epoch millis, "March 14 2027", etc.), not just ISO.
const isoDate = z.iso.date().transform((value) => new Date(value));

const createTripSchema = z.object({
  name: z.string().trim().min(1, 'Trip name is required.').max(200),
  destinationId: z.string().trim().min(1, 'destinationId is required.'),
  startDate: isoDate,
  endDate: isoDate,
});

const addMemberSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required.').max(100),
});

const updateItinerarySchema = z
  .array(
    z.object({
      day: z.string().trim().min(1, 'day is required.').max(60),
      title: z.string().trim().min(1, 'title is required.').max(200),
      note: z.string().trim().max(500).nullable().optional(),
    }),
  )
  .max(200, 'An itinerary can have at most 200 lines.');

const updateTripSettingsSchema = z
  .object({
    openToBuddies: z.boolean().optional(),
    // Normalize an empty/whitespace-only note to null server-side too —
    // not just in the client's commitNote — so a direct API call can't
    // persist "" as a distinct "cleared note" representation from null.
    // `.transform` sits before `.nullable().optional()` so it only runs
    // when a string was actually sent — an explicit `null` or an absent
    // field pass through untouched.
    buddyNote: z
      .string()
      .trim()
      .max(280)
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, { message: 'At least one field (openToBuddies, buddyNote) is required.' });

export const tripsRouter = Router();

tripsRouter.post('/', async (req, res, next) => {
  try {
    const input = createTripSchema.parse(req.body);
    if (input.endDate < input.startDate) {
      throw new AppError('VALIDATION_ERROR', 'endDate must be on or after startDate.');
    }
    const trip = await createTrip(input);
    res.status(201).json(trip);
  } catch (error) {
    next(error);
  }
});

tripsRouter.get('/:code', async (req, res, next) => {
  try {
    const trip = await getTripByCode(req.params.code);
    res.json(trip);
  } catch (error) {
    next(error);
  }
});

tripsRouter.post('/:code/members', async (req, res, next) => {
  try {
    const { displayName } = addMemberSchema.parse(req.body);
    const member = await addMember(req.params.code, displayName);
    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
});

tripsRouter.put('/:code/itinerary', async (req, res, next) => {
  try {
    const items = updateItinerarySchema.parse(req.body);
    const itineraryItems = await updateItinerary(req.params.code, items);
    res.json(itineraryItems);
  } catch (error) {
    next(error);
  }
});

tripsRouter.patch('/:code', async (req, res, next) => {
  try {
    const patch = updateTripSettingsSchema.parse(req.body);
    const trip = await updateTripSettings(req.params.code, patch);
    res.json(trip);
  } catch (error) {
    next(error);
  }
});

tripsRouter.get('/:code/buddy-requests', async (req, res, next) => {
  try {
    await getTripByCode(req.params.code);
    const requests = await listPendingRequestsForTrip(req.params.code);
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// No `getTripByCode` pre-check here (unlike the GET route above): an
// unknown/mismatched Trip Code is already indistinguishable, at the HTTP
// response level, from "this requestId doesn't belong to this Trip" —
// `acceptBuddyRequest`/`declineBuddyRequest` already 404 for both via
// their own `tripId !== tripCode` check, so a second query here would
// only re-derive the same answer.
tripsRouter.post('/:code/buddy-requests/:requestId/accept', async (req, res, next) => {
  try {
    const member = await acceptBuddyRequest(req.params.code, req.params.requestId);
    res.status(201).json(member);
  } catch (error) {
    next(error);
  }
});

tripsRouter.post('/:code/buddy-requests/:requestId/decline', async (req, res, next) => {
  try {
    await declineBuddyRequest(req.params.code, req.params.requestId);
    res.status(200).json({ ok: true });
  } catch (error) {
    next(error);
  }
});
