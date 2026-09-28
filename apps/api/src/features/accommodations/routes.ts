import { Router } from 'express';
import { z } from 'zod';
import { listAccommodationsForDestination } from './service.js';

const listQuerySchema = z.object({
  destinationId: z.string().trim().min(1, 'destinationId is required.'),
});

export const accommodationsRouter = Router();

accommodationsRouter.get('/', async (req, res, next) => {
  try {
    const { destinationId } = listQuerySchema.parse(req.query);
    const listings = await listAccommodationsForDestination(destinationId);
    res.json(listings);
  } catch (error) {
    next(error);
  }
});
