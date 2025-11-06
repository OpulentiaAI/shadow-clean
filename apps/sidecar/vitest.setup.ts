import { beforeAll, afterAll, vi } from 'vitest';

beforeAll(() => {
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  vi.clearAllMocks();
});
