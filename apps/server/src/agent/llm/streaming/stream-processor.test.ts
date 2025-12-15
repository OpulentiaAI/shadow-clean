import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StreamProcessor } from './stream-processor';
import { Message, ApiKeys, AvailableModels } from '@repo/types';
import * as aiSdk from 'ai';

type RepairToolCallFn = (args: {
  system: string | undefined;
  messages: unknown[];
  toolCall: {
    toolCallType: 'function';
    toolCallId: string;
    toolName: string;
    args: unknown;
  };
  tools: Record<string, unknown>;
  error: Error;
}) => Promise<
  | {
      toolCallType: 'function';
      toolCallId: string;
      toolName: string;
      args: string;
    }
  | null
>;

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
        createdAt: new Date().toISOString(),
        llmModel: AvailableModels.CLAUDE_OPUS_4_5,
      },
    ];
  });

  it('initializes with model provider and chunk handlers', () => {
    expect(streamProcessor).toBeDefined();
    const internal = streamProcessor as unknown as {
      modelProvider: unknown;
      chunkHandlers: unknown;
    };
    expect(internal.modelProvider).toBeDefined();
    expect(internal.chunkHandlers).toBeDefined();
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

    vi.mocked(aiSdk.streamText).mockReturnValue(
      mockStreamResult as unknown as ReturnType<typeof aiSdk.streamText>
    );

    const systemPrompt = 'You are a helpful assistant';
    const model = AvailableModels.CLAUDE_OPUS_4_5;

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
    const model = AvailableModels.CLAUDE_OPUS_4_5;

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

    vi.mocked(aiSdk.streamText).mockReturnValue(
      mockStreamResult as unknown as ReturnType<typeof aiSdk.streamText>
    );

    const systemPrompt = 'You are a helpful assistant';
    const model = AvailableModels.CLAUDE_OPUS_4_5;

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

  it('auto-normalizes read_file args during repair without re-asking the model', async () => {
    const mockFullStream = {
      [Symbol.asyncIterator]: async function* () {
        yield {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        };
      },
    };

    const mockStreamResult = {
      fullStream: mockFullStream,
      textStream: null,
    };

    vi.mocked(aiSdk.streamText).mockReturnValue(
      mockStreamResult as unknown as ReturnType<typeof aiSdk.streamText>
    );
    vi.mocked(aiSdk.generateText).mockResolvedValue(
      { toolCalls: [] } as unknown as Awaited<ReturnType<typeof aiSdk.generateText>>
    );

    const systemPrompt = 'You are a helpful assistant';
    const model = AvailableModels.CLAUDE_OPUS_4_5;

    const stream = streamProcessor.createMessageStream(
      systemPrompt,
      mockMessages,
      model,
      mockApiKeys,
      true,
      'task-args-normalize'
    );

    for await (const _ of stream) {
      // consume
    }

    const streamConfig =
      vi.mocked(aiSdk.streamText).mock.calls[0]?.[0] as unknown as {
        experimental_repairToolCall?: unknown;
      };
    const repairFn =
      streamConfig.experimental_repairToolCall as unknown as RepairToolCallFn;
    expect(typeof repairFn).toBe('function');

    const toolCall = {
      toolCallType: 'function' as const,
      toolCallId: 'tc-1',
      toolName: 'read_file',
      args: JSON.stringify({ file_path: 'src/index.ts' }),
    };

    const repaired = await repairFn({
      system: undefined,
      messages: [],
      toolCall,
      tools: {},
      error: new aiSdk.InvalidToolArgumentsError({
        toolName: 'read_file',
        toolArgs: toolCall.args as string,
        cause: new Error('invalid args'),
      }),
    });

    expect(aiSdk.generateText).not.toHaveBeenCalled();
    expect(repaired).not.toBeNull();
    if (!repaired) throw new Error('Expected repaired tool call');
    expect(repaired.toolCallId).toBe('tc-1');
    expect(repaired.toolName).toBe('read_file');

    const repairedArgs = JSON.parse(repaired.args);
    expect(repairedArgs.target_file).toBe('src/index.ts');
    expect(repairedArgs.should_read_entire_file).toBe(false);
    expect(typeof repairedArgs.explanation).toBe('string');
    expect(repairedArgs.explanation.length).toBeGreaterThan(0);
  });

  it('caps repair attempts per toolCallId to prevent infinite loops', async () => {
    const mockFullStream = {
      [Symbol.asyncIterator]: async function* () {
        yield {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        };
      },
    };

    const mockStreamResult = {
      fullStream: mockFullStream,
      textStream: null,
    };

    vi.mocked(aiSdk.streamText).mockReturnValue(
      mockStreamResult as unknown as ReturnType<typeof aiSdk.streamText>
    );
    vi.mocked(aiSdk.generateText).mockResolvedValue(
      { toolCalls: [] } as unknown as Awaited<ReturnType<typeof aiSdk.generateText>>
    );

    const stream = streamProcessor.createMessageStream(
      'You are a helpful assistant',
      mockMessages,
      AvailableModels.CLAUDE_OPUS_4_5,
      mockApiKeys,
      true,
      'task-repair-cap'
    );

    for await (const _ of stream) {
      // consume
    }

    const streamConfig =
      vi.mocked(aiSdk.streamText).mock.calls[0]?.[0] as unknown as {
        experimental_repairToolCall?: unknown;
      };
    const repairFn =
      streamConfig.experimental_repairToolCall as unknown as RepairToolCallFn;

    const toolCall = {
      toolCallType: 'function' as const,
      toolCallId: 'tc-cap',
      toolName: 'read_file',
      args: JSON.stringify({}),
    };

    const error = new aiSdk.InvalidToolArgumentsError({
      toolName: 'read_file',
      toolArgs: toolCall.args as string,
      cause: new Error('invalid args'),
    });

    await repairFn({ system: undefined, messages: [], toolCall, tools: {}, error });
    await repairFn({ system: undefined, messages: [], toolCall, tools: {}, error });
    await repairFn({ system: undefined, messages: [], toolCall, tools: {}, error });
    await repairFn({ system: undefined, messages: [], toolCall, tools: {}, error });

    expect(aiSdk.generateText).toHaveBeenCalledTimes(3);
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
          createdAt: new Date().toISOString(),
          llmModel: AvailableModels.CLAUDE_HAIKU_4_5,
        },
      ];

      const systemPrompt = 'You are a helpful assistant. Follow instructions exactly.';
      const model = AvailableModels.CLAUDE_HAIKU_4_5;

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
