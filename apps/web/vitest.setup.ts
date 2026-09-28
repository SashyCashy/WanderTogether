import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Testing Library's own auto-cleanup relies on detecting global test hooks,
// which aren't present since this project doesn't enable vitest's
// `globals: true` (explicit imports keep test files' provenance obvious).
// Without this, a component rendered in one test stays mounted into the
// next test in the same file.
afterEach(() => {
  cleanup();
});
