import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatService } from './chat';
import { AvailableModels } from '@repo/types';

// Import convex-operations - mocked globally in vitest.setup.ts
import * as convexOps from '../lib/convex-operations';

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
  default: { agentMode: 'local' },
}));

// Mock services
vi.mock('../services/git-manager', () => ({ GitManager: vi.fn() }));
vi.mock('../services/pr-manager', () => ({ PRManager: vi.fn() }));
vi.mock('../services/model-context-service', () => ({ modelContextService: { getOrCreateContext: vi.fn() } }));
vi.mock('../services/checkpoint-service', () => ({ checkpointService: { createCheckpoint: vi.fn() } }));
vi.mock('../services/memory-service', () => ({ memoryService: { getMemories: vi.fn() } }));
vi.mock('../services/database-batch-service', () => ({ databaseBatchService: { queueMessageCreate: vi.fn() } }));
vi.mock('../services/chat-summarization-service', () => ({ ChatSummarizationService: vi.fn() }));
vi.mock('../utils/task-status', () => ({
  updateTaskStatus: vi.fn(),
  updateTaskActivity: vi.fn(),
  scheduleTaskCleanup: vi.fn(),
  cancelTaskCleanup: vi.fn(),
}));
vi.mock('./tools', () => ({ createTools: vi.fn(), stopMCPManager: vi.fn() }));
vi.mock('./system-prompt', () => ({ getSystemPrompt: vi.fn().mockReturnValue('System prompt'), getShadowWikiMessage: vi.fn() }));
vi.mock('../execution', () => ({ createGitService: vi.fn() }));
vi.mock('@/initialization', () => ({ TaskInitializationEngine: vi.fn() }));
vi.mock('../config/shared', () => ({ getGitHubAppEmail: vi.fn().mockReturnValue('test@example.com'), getGitHubAppName: vi.fn().mockReturnValue('TestBot') }));
vi.mock('../utils/title-generation', () => ({ generateTaskTitleAndBranch: vi.fn() }));

describe('ChatService-unit-test', () => {
  let chatService: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    chatService = new ChatService();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('creates ChatService with required dependencies', () => {
    expect(chatService).toBeDefined();
  });

  it('initializes with empty active streams and queued actions', () => {
    // Access private properties for testing
    const service = chatService as unknown as { activeStreams: Map<string, unknown>; queuedActions: Map<string, unknown> };
    expect(service.activeStreams).toBeInstanceOf(Map);
    expect(service.activeStreams.size).toBe(0);
    expect(service.queuedActions).toBeInstanceOf(Map);
    expect(service.queuedActions.size).toBe(0);
  });

  it('saves user message via Convex appendMessage', async () => {
    const result = await chatService.saveUserMessage(
      'task-123',
      'Hello, assistant!',
      AvailableModels.CLAUDE_OPUS_4_5
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('msg-123');
    expect(result.sequence).toBe(1);
    expect(convexOps.appendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-123',
        role: 'USER',
        content: 'Hello, assistant!',
      })
    );
  });

  it('saves assistant message via Convex appendMessage', async () => {
    const result = await chatService.saveAssistantMessage(
      'task-123',
      'Hello, user!',
      AvailableModels.CLAUDE_OPUS_4_5
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('msg-123');
    expect(convexOps.appendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-123',
        role: 'ASSISTANT',
        content: 'Hello, user!',
      })
    );
  });

  it('saves system message via Convex appendMessage', async () => {
    const result = await chatService.saveSystemMessage(
      'task-123',
      'System initialization complete',
      AvailableModels.CLAUDE_OPUS_4_5
    );

    expect(result).toBeDefined();
    expect(convexOps.appendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'task-123',
        role: 'SYSTEM',
        content: 'System initialization complete',
      })
    );
  });

  it('generates atomic sequences for messages', async () => {
    let seq = 0;
    vi.mocked(convexOps.appendMessage).mockImplementation(async () => {
      seq++;
      return { messageId: `msg-${seq}`, sequence: seq };
    });

    const msg1 = await chatService.saveUserMessage('task-123', 'Message 1', AvailableModels.CLAUDE_OPUS_4_5);
    const msg2 = await chatService.saveAssistantMessage('task-123', 'Response 1', AvailableModels.CLAUDE_OPUS_4_5);
    const msg3 = await chatService.saveUserMessage('task-123', 'Message 2', AvailableModels.CLAUDE_OPUS_4_5);

    expect(msg1.sequence).toBe(1);
    expect(msg2.sequence).toBe(2);
    expect(msg3.sequence).toBe(3);
  });

  it('handles message metadata correctly', async () => {
    const metadata = {
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    };

    await chatService.saveAssistantMessage(
      'task-123',
      'Test message',
      AvailableModels.CLAUDE_OPUS_4_5,
      undefined,
      metadata
    );

    expect(convexOps.appendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        metadataJson: JSON.stringify(metadata),
      })
    );
  });
});
