import express from 'express';
import { config } from './shared/config.js';
import { requestLogger } from './shared/logger.js';
import { errorMiddleware, notFoundMiddleware } from './shared/error-middleware.js';

const app = express();

app.use(requestLogger);
app.use(express.json());

// Generic infra, not a feature slice — useful to confirm the process is
// actually serving requests, not just that it didn't crash on boot.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Feature-slice routers (discovery, trips, buddies, write-ups,
// accommodations) mount here starting Story 1.2 — this story only
// scaffolds the shared app shell.

app.use(notFoundMiddleware);
app.use(errorMiddleware);

const server = app.listen(config.port, () => {
  console.log(`WanderTogether API listening on http://localhost:${config.port}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(`Failed to start server on port ${config.port}: ${error.message}`);
  process.exit(1);
});
