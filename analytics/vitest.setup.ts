import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Vitest runs without `globals: true`, so Testing Library cannot register its
// automatic cleanup. Without this, components rendered in one test stay in the
// document and leak into the next.
afterEach(() => {
  cleanup();
});
