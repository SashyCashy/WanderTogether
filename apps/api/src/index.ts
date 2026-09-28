import { createApp } from './app.js';
import { config } from './shared/config.js';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`WanderTogether API listening on http://localhost:${config.port}`);
});

server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(`Failed to start server on port ${config.port}: ${error.message}`);
  process.exit(1);
});
