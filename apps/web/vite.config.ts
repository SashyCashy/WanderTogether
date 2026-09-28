import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Must match apps/api's PORT (see apps/api/.env / .env.example) — set
// API_PORT in the shell or a .env this config loads if you change it there.
const apiPort = process.env.API_PORT ?? 3001;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
      // Story 3.1's uploaded write-up photos (AD-11) are served by the API
      // at /uploads/*, not under /api — needs its own proxy entry.
      '/uploads': {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
});
