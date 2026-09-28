import { Router } from 'express';
import { z } from 'zod';
import { createTrip, getTripByCode } from './service.js';
import { AppError } from '../../shared/error-middleware.js';

const createTripSchema = z.object({
  name: z.string().trim().min(1, 'Trip name is required.').max(200),
  destinationId: z.string().trim().min(1, 'destinationId is required.'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

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
