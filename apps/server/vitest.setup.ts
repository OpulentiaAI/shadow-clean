import { beforeAll, afterAll, vi } from 'vitest';

// Mock Prisma client for unit tests
vi.mock('@repo/db', () => ({
  prisma: {
    task: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    chatMessage: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    memory: {
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    todo: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

beforeAll(() => {
  process.env.NODE_ENV = 'test';
  // Set default test API key (integration tests should override)
  process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'nokey';
});

afterAll(() => {
  vi.clearAllMocks();
});
