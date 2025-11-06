import { beforeAll, afterAll, vi } from 'vitest';

// Global test setup
beforeAll(() => {
  // Setup any global mocks or configurations
  // Example: Mock environment variables
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // Cleanup
  vi.clearAllMocks();
});
