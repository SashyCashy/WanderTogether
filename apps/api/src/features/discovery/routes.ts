import { Router } from 'express';
import { listDestinations } from './service.js';

/**
 * GET /api/destinations — the discovery slice's only route this story.
 * Mounted under /api by app.ts, the first feature route in the project
 * and the convention every later slice's router follows.
 */
export const discoveryRouter = Router();

discoveryRouter.get('/', (_req, res, next) => {
  listDestinations()
    .then((destinations) => res.json(destinations))
    .catch(next);
});
