import { vi } from 'vitest';

// Set CONVEX_URL environment variable for tests that need it
process.env.CONVEX_URL = 'https://test.convex.cloud';

// Mock convex-operations globally - individual tests can override with mockResolvedValueOnce
vi.mock('./src/lib/convex-operations', () => ({
  appendMessage: vi.fn().mockResolvedValue({ messageId: 'mock-msg-id', sequence: 1 }),
  updateMessage: vi.fn().mockResolvedValue({}),
  listMessagesByTask: vi.fn().mockResolvedValue([]),
  getTask: vi.fn().mockResolvedValue({ _id: 'mock-task-id', status: 'RUNNING', workspacePath: '/tmp/mock' }),
  updateTask: vi.fn().mockResolvedValue({}),
  toConvexId: vi.fn((id: string) => id),
  isConvexId: vi.fn(() => true),
  getLatestMessageSequence: vi.fn().mockResolvedValue(0),
}));

// Mock Convex client to prevent actual network calls
vi.mock('./src/lib/convex-client', () => {
  const mockClient = {
    query: vi.fn().mockResolvedValue(null),
    mutation: vi.fn().mockResolvedValue(null),
    action: vi.fn().mockResolvedValue(null),
  };
  return {
    getConvexClient: vi.fn(() => mockClient),
    resetConvexClient: vi.fn(),
  };
});

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
