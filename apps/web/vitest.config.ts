import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Separate from vite.config.ts (not merged via `mergeConfig`) so the dev
 * server's `/api`/`/uploads` proxy — meaningless outside a running Vite
 * dev server — never has to be reasoned about here, and this file's own
 * `test` block never leaks into `vite build`'s config resolution.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
});
