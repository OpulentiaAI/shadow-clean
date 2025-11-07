import { vi } from 'vitest';

// Mock Prisma Client before tests run
vi.mock('@repo/db', () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    taskSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    userSettings: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  InitStatus: {},
  MessageRole: {
    USER: 'USER',
    ASSISTANT: 'ASSISTANT',
    SYSTEM: 'SYSTEM',
  },
}));
