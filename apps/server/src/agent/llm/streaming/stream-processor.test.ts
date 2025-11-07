import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamProcessor } from './stream-processor';
import { Message, ModelType, ApiKeys, AvailableModels } from '@repo/types';
import * as aiSdk from 'ai';

// Mock dependencies
vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
  NoSuchToolError: class NoSuchToolError extends Error {},
  InvalidToolArgumentsError: class InvalidToolArgumentsError extends Error {},
}));

vi.mock('../../tools', () => ({
  createTools: vi.fn().mockResolvedValue({}),
}));

vi.mock('../models/model-provider', () => ({
  ModelProvider: class {
    getModel = vi.fn().mockReturnValue({
      constructor: { name: 'MockModel' },
    });
  },
}));

vi.mock('../observability/braintrust-service', () => ({
  braintrustService: {
    getOperationTelemetry: vi.fn().mockReturnValue({}),
  },
}));

describe('StreamProcessor-unit-test', () => {
  let streamProcessor: StreamProcessor;
  let mockApiKeys: ApiKeys;
  let mockMessages: Message[];

  beforeEach(() => {
    vi.clearAllMocks();

    streamProcessor = new StreamProcessor();

    mockApiKeys = {
      anthropic: 'sk-ant-test-key',
      openai: undefined,
      openrouter: undefined,
    };

    mockMessages = [
      {
        role: 'user',
        content: 'Hello',
        id: 'msg-1',
        timestamp: new Date().toISOString(),
      },
    ];
  });

  it('initializes with model provider and chunk handlers', () => {
    expect(streamProcessor).toBeDefined();
    expect((streamProcessor as any).modelProvider).toBeDefined();
    expect((streamProcessor as any).chunkHandlers).toBeDefined();
  });

  it('creates message stream with Anthropic model and proper configuration', async () => {
    const mockFullStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'text-delta', textDelta: 'Hello' };
        yield { type: 'finish', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } };
      },
    };

    const mockStreamResult = {
      fullStream: mockFullStream,
      textStream: null,
    };

    vi.mocked(aiSdk.streamText).mockReturnValue(mockStreamResult as any);

    const systemPrompt = 'You are a helpful assistant';
    const model = AvailableModels.CLAUDE_SONNET_4;

    const stream = streamProcessor.createMessageStream(
      systemPrompt,
      mockMessages,
      model,
      mockApiKeys,
      true,
      'task-123',
      '/test/workspace'
    );

    // Collect stream chunks (this will trigger streamText call)
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Verify streamText was called after stream consumption
    expect(aiSdk.streamText).toHaveBeenCalled();

    // Verify chunks were emitted
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toHaveProperty('type', 'content');
    expect(chunks[0]).toHaveProperty('content', 'Hello');
  });

  it('handles stream errors gracefully', async () => {
    vi.mocked(aiSdk.streamText).mockImplementation(() => {
      throw new Error('API error: rate limit exceeded');
    });

    const systemPrompt = 'You are a helpful assistant';
    const model = AvailableModels.CLAUDE_SONNET_4;

    const stream = streamProcessor.createMessageStream(
      systemPrompt,
      mockMessages,
      model,
      mockApiKeys,
      true,
      'task-456'
    );

    // Collect stream chunks
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Verify error chunk was emitted
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toHaveProperty('type', 'error');
    expect(chunks[0]).toHaveProperty('error');
  });

  it('configures stream with tools when enableTools is true', async () => {
    const mockFullStream = {
      [Symbol.asyncIterator]: async function* () {
        yield { type: 'finish', finishReason: 'stop', usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } };
      },
    };

    const mockStreamResult = {
      fullStream: mockFullStream,
      textStream: null,
    };

    vi.mocked(aiSdk.streamText).mockReturnValue(mockStreamResult as any);

    const systemPrompt = 'You are a helpful assistant';
    const model = AvailableModels.CLAUDE_SONNET_4;

    const stream = streamProcessor.createMessageStream(
      systemPrompt,
      mockMessages,
      model,
      mockApiKeys,
      true, // enableTools
      'task-789',
      '/test/workspace'
    );

    // Consume stream
    for await (const _ of stream) {
      // Just consume
    }

    // Verify streamText was called with tools configuration
    const streamConfig = vi.mocked(aiSdk.streamText).mock.calls[0][0];
    expect(streamConfig).toHaveProperty('tools');
    expect(streamConfig).toHaveProperty('toolCallStreaming', true);
  });
});

describe('StreamProcessor-integration-test', () => {
  it.skipIf(
    !process.env.RUN_INTEGRATION_TESTS ||
    !process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY === 'nokey'
  )(
    'creates real stream with Anthropic API',
    { timeout: 30000 },
    async () => {
      const streamProcessor = new StreamProcessor();

      const mockApiKeys: ApiKeys = {
        anthropic: process.env.ANTHROPIC_API_KEY!,
        openai: undefined,
        openrouter: undefined,
      };

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Say "test successful" and nothing else',
          id: 'msg-1',
          timestamp: new Date().toISOString(),
        },
      ];

      const systemPrompt = 'You are a helpful assistant. Follow instructions exactly.';
      const model = AvailableModels.CLAUDE_3_5_HAIKU;

      const stream = streamProcessor.createMessageStream(
        systemPrompt,
        messages,
        model,
        mockApiKeys,
        false, // no tools for simple integration test
        'integration-test-task'
      );

      // Collect all chunks
      const chunks = [];
      let hasContent = false;
      let hasCompletion = false;

      for await (const chunk of stream) {
        chunks.push(chunk);
        if (chunk.type === 'content') {
          hasContent = true;
        }
        if (chunk.type === 'complete') {
          hasCompletion = true;
        }
      }

      // Verify stream completed successfully
      expect(chunks.length).toBeGreaterThan(0);
      expect(hasContent).toBe(true);
      expect(hasCompletion).toBe(true);
    }
  );
});
