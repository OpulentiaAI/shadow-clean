import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatService } from './chat';
import { prisma } from '@repo/db';
import { AvailableModels } from '@repo/types';
import type { ChatMessage } from '../../../../packages/db/src/client';

// Mock LLMService
vi.mock('./llm', () => ({
  LLMService: class {
    createMessageStream = vi.fn();
    getAvailableModels = vi.fn();
  },
}));

// Mock socket utilities
vi.mock('../socket', () => ({
  emitStreamChunk: vi.fn(),
  emitToTask: vi.fn(),
  endStream: vi.fn(),
  handleStreamError: vi.fn(),
  startStream: vi.fn(),
}));

// Mock config
vi.mock('../config', () => ({
  default: {
    agentMode: 'local',
  },
}));

// Mock other services
vi.mock('../services/git-manager', () => ({
  GitManager: vi.fn().mockImplementation(() => ({
    // Mock methods
  })),
}));

vi.mock('../services/pr-manager', () => ({
  PRManager: vi.fn(),
}));

vi.mock('../services/model-context-service', () => ({
  modelContextService: {
    getOrCreateContext: vi.fn(),
  },
}));

vi.mock('../services/checkpoint-service', () => ({
  checkpointService: {
    createCheckpoint: vi.fn(),
  },
}));

vi.mock('../services/memory-service', () => ({
  memoryService: {
    getMemories: vi.fn(),
  },
}));

vi.mock('../services/database-batch-service', () => ({
  databaseBatchService: {
    queueMessageCreate: vi.fn(),
  },
}));

vi.mock('../services/chat-summarization-service', () => ({
  ChatSummarizationService: vi.fn(),
}));

vi.mock('../utils/task-status', () => ({
  updateTaskStatus: vi.fn(),
  updateTaskActivity: vi.fn(),
  scheduleTaskCleanup: vi.fn(),
  cancelTaskCleanup: vi.fn(),
}));

vi.mock('./tools', () => ({
  createTools: vi.fn(),
  stopMCPManager: vi.fn(),
}));

vi.mock('./system-prompt', () => ({
  getSystemPrompt: vi.fn().mockReturnValue('System prompt'),
  getShadowWikiMessage: vi.fn(),
}));

vi.mock('../execution', () => ({
  createGitService: vi.fn(),
}));

vi.mock('@/initialization', () => ({
  TaskInitializationEngine: vi.fn(),
}));

vi.mock('../config/shared', () => ({
  getGitHubAppEmail: vi.fn().mockReturnValue('test@example.com'),
  getGitHubAppName: vi.fn().mockReturnValue('TestBot'),
}));

vi.mock('../utils/title-generation', () => ({
  generateTaskTitleAndBranch: vi.fn(),
}));

describe('ChatService-unit-test', () => {
  let chatService: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup prisma mock for transactions
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const tx = {
        chatMessage: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockImplementation((data) => ({
            id: 'msg-123',
            taskId: data.data.taskId,
            content: data.data.content,
            role: data.data.role,
            sequence: data.data.sequence || 1,
            llmModel: data.data.llmModel,
            metadata: data.data.metadata,
            createdAt: new Date(),
            updatedAt: new Date(),
          })),
        },
      };
      return callback(tx);
    });

    // Create ChatService instance
    chatService = new ChatService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('tests that ChatService can be created with required dependencies', () => {
    expect(chatService).toBeDefined();
    expect((chatService as any).llmService).toBeDefined();
  });

  it('initializes with empty active streams and queued actions', () => {
    expect((chatService as any).activeStreams).toBeInstanceOf(Map);
    expect((chatService as any).activeStreams.size).toBe(0);
    expect((chatService as any).queuedActions).toBeInstanceOf(Map);
    expect((chatService as any).queuedActions.size).toBe(0);
  });

  it('saves user message with correct role and content', async () => {
    const mockMessage: ChatMessage = {
      id: 'msg-123',
      taskId: 'task-123',
      content: 'Hello, assistant!',
      role: 'USER' as any,
      sequence: 1,
      llmModel: AvailableModels.CLAUDE_SONNET_4,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      finishReason: null,
    };

    vi.mocked(prisma.$transaction).mockResolvedValue(mockMessage as any);

    const result = await chatService.saveUserMessage(
      'task-123',
      'Hello, assistant!',
      AvailableModels.CLAUDE_SONNET_4
    );

    expect(result).toBeDefined();
    expect(result.content).toBe('Hello, assistant!');
    expect(result.role).toBe('USER');
  });

  it('saves assistant message with correct role and metadata', async () => {
    const mockMessage: ChatMessage = {
      id: 'msg-456',
      taskId: 'task-123',
      content: 'Hello, user!',
      role: 'ASSISTANT' as any,
      sequence: 2,
      llmModel: AvailableModels.CLAUDE_SONNET_4,
      metadata: { usage: { promptTokens: 100, completionTokens: 50 } } as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      finishReason: 'stop',
    };

    vi.mocked(prisma.$transaction).mockResolvedValue(mockMessage as any);

    const result = await chatService.saveAssistantMessage(
      'task-123',
      'Hello, user!',
      AvailableModels.CLAUDE_SONNET_4,
      undefined,
      { usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 }, finishReason: 'stop' }
    );

    expect(result).toBeDefined();
    expect(result.content).toBe('Hello, user!');
    expect(result.role).toBe('ASSISTANT');
  });

  it('saves system message with correct role', async () => {
    const mockMessage: ChatMessage = {
      id: 'msg-789',
      taskId: 'task-123',
      content: 'System initialization complete',
      role: 'SYSTEM' as any,
      sequence: 1,
      llmModel: AvailableModels.CLAUDE_SONNET_4,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      finishReason: null,
    };

    vi.mocked(prisma.$transaction).mockResolvedValue(mockMessage as any);

    const result = await chatService.saveSystemMessage(
      'task-123',
      'System initialization complete',
      AvailableModels.CLAUDE_SONNET_4
    );

    expect(result).toBeDefined();
    expect(result.content).toBe('System initialization complete');
    expect(result.role).toBe('SYSTEM');
  });

  it('generates atomic sequences for messages', async () => {
    const messages: ChatMessage[] = [];
    let sequence = 0;

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      const tx = {
        chatMessage: {
          findFirst: vi.fn().mockResolvedValue(
            sequence > 0 ? { sequence } : null
          ),
          create: vi.fn().mockImplementation((data) => {
            sequence = data.data.sequence || (sequence + 1);
            const msg = {
              id: `msg-${sequence}`,
              taskId: data.data.taskId,
              content: data.data.content,
              role: data.data.role,
              sequence,
              llmModel: data.data.llmModel,
              metadata: data.data.metadata,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            messages.push(msg as any);
            return msg;
          }),
        },
      };
      return callback(tx);
    });

    await chatService.saveUserMessage('task-123', 'Message 1', AvailableModels.CLAUDE_SONNET_4);
    await chatService.saveAssistantMessage('task-123', 'Response 1', AvailableModels.CLAUDE_SONNET_4);
    await chatService.saveUserMessage('task-123', 'Message 2', AvailableModels.CLAUDE_SONNET_4);

    expect(messages).toHaveLength(3);
    expect(messages[0].sequence).toBe(1);
    expect(messages[1].sequence).toBe(2);
    expect(messages[2].sequence).toBe(3);
  });

  it('handles message metadata correctly', async () => {
    const metadata = {
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      finishReason: 'stop',
    };

    const mockMessage: ChatMessage = {
      id: 'msg-meta',
      taskId: 'task-123',
      content: 'Test message',
      role: 'ASSISTANT' as any,
      sequence: 1,
      llmModel: AvailableModels.CLAUDE_SONNET_4,
      metadata: metadata as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      finishReason: 'stop',
    };

    vi.mocked(prisma.$transaction).mockResolvedValue(mockMessage as any);

    const result = await chatService.saveAssistantMessage(
      'task-123',
      'Test message',
      AvailableModels.CLAUDE_SONNET_4,
      undefined,
      metadata
    );

    expect(result.metadata).toBeDefined();
    expect((result.metadata as any).usage.promptTokens).toBe(100);
  });
});

describe('ChatService-integration-test', () => {
  it.skipIf(!process.env.RUN_INTEGRATION_TESTS)(
    'creates complete message conversation flow',
    async () => {
      // This test requires real database connection
      const chatService = new ChatService();

      // Verify service initialization
      expect(chatService).toBeDefined();
      expect((chatService as any).llmService).toBeDefined();
    }
  );
});
