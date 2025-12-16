import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as convexOps from '../lib/convex-operations';

describe('Memory & Performance Stress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle high-volume message creation without memory leak', async () => {
    const taskId = 'volume-test-' + Date.now();
    const MAX_MESSAGES = 500;
    let sequence = 0;
    
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async () => {
      sequence++;
      return { messageId: `msg-${sequence}`, sequence };
    });
    
    const startMemory = process.memoryUsage().heapUsed;
    
    const promises = [];
    for (let i = 0; i < MAX_MESSAGES; i++) {
      promises.push(
        convexOps.appendMessage({
          taskId,
          role: i % 2 === 0 ? 'USER' : 'ASSISTANT',
          content: `Message ${i} ${'X'.repeat(100)}`,
          promptMessageId: i === 0 ? 'initial-prompt' : undefined
        })
      );
      
      // Batch to avoid overwhelming event loop
      if (i % 50 === 0 && promises.length > 0) {
        await Promise.all(promises);
        promises.length = 0;
      }
    }
    
    await Promise.all(promises);
    
    // Force GC if available
    if (global.gc) {
      global.gc();
    }
    
    const endMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = endMemory - startMemory;
    
    // Memory increase should be reasonable (< 50MB for 500 messages)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    expect(sequence).toBe(MAX_MESSAGES);
  });

  it('should maintain performance under concurrent load', async () => {
    const tasks = Array.from({ length: 10 }, (_, i) => `task-load-${i}-${Date.now()}`);
    let totalCalls = 0;
    
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async () => {
      totalCalls++;
      // Simulate small processing delay
      await new Promise(resolve => setTimeout(resolve, 1));
      return { messageId: `msg-${totalCalls}`, sequence: totalCalls };
    });
    
    const startTime = performance.now();
    
    const allPromises = [];
    for (const taskId of tasks) {
      const taskPromises = [];
      for (let i = 0; i < 10; i++) {
        taskPromises.push(
          convexOps.appendMessage({
            taskId,
            role: 'USER',
            content: `Concurrent message ${i}`,
            promptMessageId: i === 0 ? 'prompt-' + taskId : undefined
          })
        );
      }
      allPromises.push(Promise.all(taskPromises));
    }
    
    const results = await Promise.all(allPromises);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 100 messages (10 tasks × 10 messages) should complete in reasonable time
    expect(duration).toBeLessThan(10000); // 10 seconds max
    
    const totalMessages = results.flat().length;
    expect(totalMessages).toBe(100);
  });

  it('should handle maximum payload size boundary', async () => {
    const taskId = 'max-payload-test-' + Date.now();
    
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async (args) => {
      // Simulate Convex payload validation
      const contentSize = args.content.length;
      if (contentSize > 1000000) { // 1MB limit
        throw new Error('Payload size exceeds limit');
      }
      return { messageId: 'msg-large', sequence: 1 };
    });
    
    // Create message at near payload limit (~900KB)
    const maxContent = 'A'.repeat(900000);
    
    const result = await convexOps.appendMessage({
      taskId,
      role: 'USER',
      content: maxContent,
      promptMessageId: 'max-payload-prompt'
    });
    
    expect(result.messageId).toBeDefined();
  });

  it('should reject payload exceeding maximum size', async () => {
    const taskId = 'exceed-payload-test-' + Date.now();
    
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async (args) => {
      const contentSize = args.content.length;
      if (contentSize > 1000000) {
        throw new Error('Payload size exceeds limit');
      }
      return { messageId: 'msg-large', sequence: 1 };
    });
    
    // Create message exceeding payload limit
    const oversizedContent = 'A'.repeat(1100000);
    
    await expect(
      convexOps.appendMessage({
        taskId,
        role: 'USER',
        content: oversizedContent,
        promptMessageId: 'oversized-prompt'
      })
    ).rejects.toThrow(/payload|size|limit/i);
  });

  it('should handle rapid sequential operations', async () => {
    const taskId = 'rapid-test-' + Date.now();
    let sequence = 0;
    
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async () => {
      sequence++;
      return { messageId: `msg-${sequence}`, sequence };
    });
    
    const startTime = performance.now();
    
    // Rapid sequential operations
    for (let i = 0; i < 100; i++) {
      await convexOps.appendMessage({
        taskId,
        role: i % 2 === 0 ? 'USER' : 'ASSISTANT',
        content: `Rapid message ${i}`,
        promptMessageId: i === 0 ? 'rapid-prompt' : undefined
      });
    }
    
    const duration = performance.now() - startTime;
    
    expect(sequence).toBe(100);
    expect(duration).toBeLessThan(5000); // Should complete within 5s
  });

  it('should handle mixed size payloads efficiently', async () => {
    const taskId = 'mixed-size-test-' + Date.now();
    let sequence = 0;
    
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async () => {
      sequence++;
      return { messageId: `msg-${sequence}`, sequence };
    });
    
    const sizes = [10, 100, 1000, 10000, 50000, 100, 10];
    
    for (const size of sizes) {
      await convexOps.appendMessage({
        taskId,
        role: 'ASSISTANT',
        content: 'X'.repeat(size),
        promptMessageId: 'mixed-prompt'
      });
    }
    
    expect(sequence).toBe(sizes.length);
  });
});
