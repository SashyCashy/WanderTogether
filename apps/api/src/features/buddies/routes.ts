import { Router } from 'express';
import { z } from 'zod';
import { listBuddyListings, getBuddyListing, submitBuddyRequest, getBuddyRequestStatus } from './service.js';

const submitRequestSchema = z.object({
  requesterName: z.string().trim().min(1, 'Your name is required.').max(100),
  // Normalize an empty/whitespace-only message to undefined server-side
  // too — the client always converts empty to undefined, but a direct API
  // call could otherwise persist "" as a distinct "no message" representation.
  message: z
    .string()
    .trim()
    .max(500)
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
});

export const buddiesRouter = Router();

buddiesRouter.get('/', async (_req, res, next) => {
  try {
    const listings = await listBuddyListings();
    res.json(listings);
  } catch (error) {
    next(error);
  }
});

// Registered before the generic '/:buddyListingId' route below — otherwise
// Express would match "requests" itself as a buddyListingId value.
buddiesRouter.get('/requests/:requestId', async (req, res, next) => {
  try {
    const status = await getBuddyRequestStatus(req.params.requestId);
    res.json(status);
  } catch (error) {
    next(error);
  }
});

buddiesRouter.get('/:buddyListingId', async (req, res, next) => {
  try {
    const listing = await getBuddyListing(req.params.buddyListingId);
    res.json(listing);
  } catch (error) {
    next(error);
  }
});

buddiesRouter.post('/:buddyListingId/requests', async (req, res, next) => {
  try {
    const { requesterName, message } = submitRequestSchema.parse(req.body);
    const request = await submitBuddyRequest(req.params.buddyListingId, requesterName, message ?? null);
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
});
