import express from 'express';
import { requestLogger } from './shared/logger.js';
import { errorMiddleware, notFoundMiddleware } from './shared/error-middleware.js';
import { discoveryRouter } from './features/discovery/routes.js';
import { tripsRouter } from './features/trips/routes.js';
import { buddiesRouter } from './features/buddies/routes.js';

/**
 * Builds the Express app without binding a port, so tests (routes.test.ts)
 * can exercise real routes/middleware via supertest-style requests without
 * a real listening socket. `index.ts` is the only module that calls
 * `.listen()`.
 */
export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());

  // Generic infra, not a feature slice — useful to confirm the process is
  // actually serving requests, not just that it didn't crash on boot.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Feature-slice routers mount under /api/* (Story 1.2 establishes this
  // convention — see vite.config.ts's dev proxy target).
  app.use('/api/destinations', discoveryRouter);
  app.use('/api/trips', tripsRouter);
  app.use('/api/buddies', buddiesRouter);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
