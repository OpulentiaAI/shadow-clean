import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChunkHandlers } from './chunk-handlers';
import { AIStreamChunk, ToolName, AvailableModels } from '@repo/types';

// Mock ToolValidator
vi.mock('../validation/tool-validator', () => ({
  ToolValidator: class {
    validateToolResult = vi.fn().mockReturnValue({
      isValid: true,
      validatedResult: { success: true, data: 'test' },
    });
  },
}));

describe('ChunkHandlers-unit-test', () => {
  let chunkHandlers: ChunkHandlers;
  let toolCallMap: Map<string, ToolName>;

  beforeEach(() => {
    vi.clearAllMocks();
    chunkHandlers = new ChunkHandlers();
    toolCallMap = new Map();
  });

  it('initializes with tool validator', () => {
    expect(chunkHandlers).toBeDefined();
    expect((chunkHandlers as any).toolValidator).toBeDefined();
  });

  it('handles text delta chunks and returns content', () => {
    const chunk: AIStreamChunk & { type: 'text-delta' } = {
      type: 'text-delta',
      textDelta: 'Hello world',
    };

    const result = chunkHandlers.handleTextDelta(chunk);

    expect(result).toBeDefined();
    expect(result?.type).toBe('content');
    expect(result?.content).toBe('Hello world');
  });

  it('handles tool call chunks and registers them in map', () => {
    const chunk: AIStreamChunk & { type: 'tool-call' } = {
      type: 'tool-call',
      toolCallId: 'call-123',
      toolName: 'read_file',
      args: { path: '/test/file.txt' },
    };

    const results = chunkHandlers.handleToolCall(chunk, toolCallMap);

    // Verify tool call chunk was emitted
    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('type', 'tool-call');
    expect(results[0]).toHaveProperty('toolCall');

    // Verify tool was registered in map
    expect(toolCallMap.has('call-123')).toBe(true);
    expect(toolCallMap.get('call-123')).toBe('read_file');
  });

  it('handles unknown tool calls with immediate error', () => {
    const chunk: AIStreamChunk & { type: 'tool-call' } = {
      type: 'tool-call',
      toolCallId: 'call-456',
      toolName: 'unknown_tool',
      args: {},
    };

    const results = chunkHandlers.handleToolCall(chunk, toolCallMap);

    // Verify both tool-call and error tool-result were emitted
    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('type', 'tool-call');
    expect(results[1]).toHaveProperty('type', 'tool-result');
    expect(results[1]).toHaveProperty('toolResult');
    expect((results[1] as any).toolResult.isValid).toBe(false);

    // Verify unknown tool was NOT registered in map
    expect(toolCallMap.has('call-456')).toBe(false);
  });

  it('handles tool call streaming start', () => {
    const chunk: AIStreamChunk & { type: 'tool-call-streaming-start' } = {
      type: 'tool-call-streaming-start',
      toolCallId: 'call-789',
      toolName: 'grep_search',
    };

    const results = chunkHandlers.handleToolCallStreamingStart(chunk, toolCallMap);

    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('type', 'tool-call-start');
    expect(toolCallMap.has('call-789')).toBe(true);
  });

  it('handles tool call delta', () => {
    const chunk: AIStreamChunk & { type: 'tool-call-delta' } = {
      type: 'tool-call-delta',
      toolCallId: 'call-999',
      toolName: 'read_file',
      argsTextDelta: '{"path"',
    };

    const results = chunkHandlers.handleToolCallDelta(chunk);

    expect(results).toHaveLength(1);
    expect(results[0]).toHaveProperty('type', 'tool-call-delta');
    expect(results[0]).toHaveProperty('toolCallDelta');
  });

  it('handles tool result with validation', () => {
    // Register tool call first
    toolCallMap.set('call-result-1', 'read_file' as ToolName);

    const chunk: AIStreamChunk & { type: 'tool-result' } = {
      type: 'tool-result',
      toolCallId: 'call-result-1',
      result: { success: true, content: 'file contents' },
    };

    const result = chunkHandlers.handleToolResult(chunk, toolCallMap);

    expect(result).toBeDefined();
    expect(result?.type).toBe('tool-result');
    expect(result).toHaveProperty('toolResult');
    expect((result as any).toolResult.isValid).toBe(true);
  });

  it('handles finish chunks with usage data', () => {
    const chunk: AIStreamChunk & { type: 'finish' } = {
      type: 'finish',
      finishReason: 'stop',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    };

    const results = chunkHandlers.handleFinish(chunk, AvailableModels.CLAUDE_OPUS_4_5);

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('type', 'usage');
    expect(results[0]).toHaveProperty('usage');
    expect((results[0] as any).usage.totalTokens).toBe(150);
    expect(results[1]).toHaveProperty('type', 'complete');
    expect(results[1]).toHaveProperty('finishReason', 'stop');
  });

  it('handles error chunks', () => {
    const chunk: AIStreamChunk & { type: 'error' } = {
      type: 'error',
      error: new Error('Test error'),
    };

    const result = chunkHandlers.handleError(chunk);

    expect(result).toBeDefined();
    expect(result.type).toBe('error');
    expect(result.error).toBe('Test error');
    expect(result.finishReason).toBe('error');
  });

  it('handles reasoning chunks', () => {
    const chunk: AIStreamChunk & { type: 'reasoning' } = {
      type: 'reasoning',
      textDelta: 'I am thinking...',
    };

    const result = chunkHandlers.handleReasoning(chunk);

    expect(result).toBeDefined();
    expect(result?.type).toBe('reasoning');
    expect(result?.reasoning).toBe('I am thinking...');
  });

  it('handles reasoning signature chunks', () => {
    const chunk: AIStreamChunk & { type: 'reasoning-signature' } = {
      type: 'reasoning-signature',
      signature: 'abc123',
    };

    const result = chunkHandlers.handleReasoningSignature(chunk);

    expect(result).toBeDefined();
    expect(result?.type).toBe('reasoning-signature');
    expect(result?.reasoningSignature).toBe('abc123');
  });
});

describe('ChunkHandlers-integration-test', () => {
  it.skipIf(!process.env.RUN_INTEGRATION_TESTS)(
    'processes full stream with all chunk types',
    async () => {
      const chunkHandlers = new ChunkHandlers();
      const toolCallMap = new Map<string, ToolName>();

      // Simulate a complete stream sequence
      const chunks: AIStreamChunk[] = [
        { type: 'text-delta', textDelta: 'Let me ' },
        { type: 'text-delta', textDelta: 'read the file.' },
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'read_file',
          args: { path: '/test.txt' },
        },
        {
          type: 'tool-result',
          toolCallId: 'call-1',
          result: { success: true, content: 'test content' },
        },
        { type: 'text-delta', textDelta: 'The file contains test content.' },
        {
          type: 'finish',
          finishReason: 'stop',
          usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
        },
      ];

      let processedChunks = 0;
      let hasToolCall = false;
      let hasToolResult = false;
      let hasCompletion = false;

      for (const chunk of chunks) {
        switch (chunk.type) {
          case 'text-delta':
            chunkHandlers.handleTextDelta(chunk as any);
            processedChunks++;
            break;
          case 'tool-call':
            chunkHandlers.handleToolCall(chunk as any, toolCallMap);
            hasToolCall = true;
            processedChunks++;
            break;
          case 'tool-result':
            chunkHandlers.handleToolResult(chunk as any, toolCallMap);
            hasToolResult = true;
            processedChunks++;
            break;
          case 'finish':
            chunkHandlers.handleFinish(chunk as any, AvailableModels.CLAUDE_OPUS_4_5);
            hasCompletion = true;
            processedChunks++;
            break;
        }
      }

      expect(processedChunks).toBe(chunks.length);
      expect(hasToolCall).toBe(true);
      expect(hasToolResult).toBe(true);
      expect(hasCompletion).toBe(true);
      expect(toolCallMap.size).toBe(1);
    }
  );
});
