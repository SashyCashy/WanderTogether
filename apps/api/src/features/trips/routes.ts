import { Router } from 'express';
import { z } from 'zod';
import { createTrip, getTripByCode, addMember, updateItinerary } from './service.js';
import { AppError } from '../../shared/error-middleware.js';

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
