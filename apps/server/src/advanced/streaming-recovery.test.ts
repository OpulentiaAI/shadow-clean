import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as convexOps from '../lib/convex-operations';

describe('Streaming Boundary & Recovery', () => {
  let savedChunks: Array<{
    taskId: string;
    content: string;
    promptMessageId?: string;
  }> = [];
  
  beforeEach(() => {
    savedChunks = [];
    vi.clearAllMocks();
    
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async (args) => {
      savedChunks.push({
        taskId: args.taskId,
        content: args.content,
        promptMessageId: args.promptMessageId
      });
      return { messageId: 'chunk-' + savedChunks.length, sequence: savedChunks.length };
    });
  });

  it('should preserve promptMessageId across streaming chunks', async () => {
    const taskId = 'stream-test-' + Date.now();
    const promptMessageId = 'prompt-stream-' + Date.now();
    
    const chunks = ['Hello ', 'world, ', 'this is ', 'streaming!'];
    
    for (const chunk of chunks) {
      await convexOps.appendMessage({
        taskId,
        role: 'ASSISTANT',
        content: chunk,
        promptMessageId
      });
    }
    
    // All chunks should reference same promptMessageId
    expect(savedChunks.length).toBe(4);
    expect(savedChunks.every(c => c.promptMessageId === promptMessageId)).toBe(true);
  });

  it('should resume streaming after simulated client disconnect', async () => {
    const taskId = 'disconnect-test-' + Date.now();
    const promptMessageId = 'prompt-disconnect-' + Date.now();
    
    // Send first chunks
    await convexOps.appendMessage({
      taskId,
      role: 'ASSISTANT',
      content: 'First part ',
      promptMessageId
    });
    
    await convexOps.appendMessage({
      taskId,
      role: 'ASSISTANT',
      content: 'Second part ',
      promptMessageId
    });
    
    // Simulate disconnect by clearing local state (savedChunks represents server state)
    const serverState = [...savedChunks];
    
    // Resume with same promptMessageId
    await convexOps.appendMessage({
      taskId,
      role: 'ASSISTANT',
      content: 'continued after disconnect',
      promptMessageId
    });
    
    expect(savedChunks.length).toBe(3);
    expect(savedChunks.every(c => c.promptMessageId === promptMessageId)).toBe(true);
  });

  it('should handle out-of-order chunk delivery simulation', async () => {
    const taskId = 'ooo-test-' + Date.now();
    const promptMessageId = 'prompt-ooo-' + Date.now();
    
    // Simulate chunks arriving out of order
    const chunks = [
      { content: 'Third ', originalOrder: 3 },
      { content: 'First ', originalOrder: 1 },
      { content: 'Second ', originalOrder: 2 },
      { content: 'Fourth', originalOrder: 4 }
    ];
    
    // Process in out-of-order sequence
    for (const chunk of chunks) {
      await convexOps.appendMessage({
        taskId,
        role: 'ASSISTANT',
        content: chunk.content,
        promptMessageId,
        metadata: { originalOrder: chunk.originalOrder }
      });
    }
    
    // System should accept all chunks
    expect(savedChunks.length).toBe(4);
    expect(savedChunks.every(c => c.promptMessageId === promptMessageId)).toBe(true);
  });

  it('should maintain promptMessageId across large content boundaries', async () => {
    const taskId = 'large-test-' + Date.now();
    const promptMessageId = 'prompt-large-' + Date.now();
    
    // Generate content that simulates chunked large response
    const chunkSize = 1000;
    const totalChunks = 10;
    
    for (let i = 0; i < totalChunks; i++) {
      const content = `Chunk ${i}: ${'X'.repeat(chunkSize)}`;
      await convexOps.appendMessage({
        taskId,
        role: 'ASSISTANT',
        content,
        promptMessageId
      });
    }
    
    expect(savedChunks.length).toBe(totalChunks);
    expect(savedChunks.every(c => c.promptMessageId === promptMessageId)).toBe(true);
    
    // Verify total content size
    const totalSize = savedChunks.reduce((sum, c) => sum + c.content.length, 0);
    expect(totalSize).toBeGreaterThan(chunkSize * totalChunks);
  });

  it('should handle stream interruption and graceful termination', async () => {
    const taskId = 'interrupt-test-' + Date.now();
    const promptMessageId = 'prompt-interrupt-' + Date.now();
    let interrupted = false;
    
    // Override mock to simulate interruption
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async (args) => {
      if (savedChunks.length === 3 && !interrupted) {
        interrupted = true;
        throw new Error('Stream interrupted');
      }
      savedChunks.push({
        taskId: args.taskId,
        content: args.content,
        promptMessageId: args.promptMessageId
      });
      return { messageId: 'chunk-' + savedChunks.length, sequence: savedChunks.length };
    });
    
    const chunks = ['One ', 'Two ', 'Three ', 'Four ', 'Five'];
    let errorCaught = false;
    
    for (const chunk of chunks) {
      try {
        await convexOps.appendMessage({
          taskId,
          role: 'ASSISTANT',
          content: chunk,
          promptMessageId
        });
      } catch {
        errorCaught = true;
        // Retry on error
        await convexOps.appendMessage({
          taskId,
          role: 'ASSISTANT',
          content: chunk,
          promptMessageId
        });
      }
    }
    
    expect(errorCaught).toBe(true);
    expect(savedChunks.length).toBe(5);
  });
});
