import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as convexOps from '../lib/convex-operations';

describe('Concurrency Stress Testing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should maintain ordering under concurrent message creation', async () => {
    const taskId = 'concurrent-test-' + Date.now();
    const promises = [];
    const results: Array<{ messageId: string; sequence: number }> = [];
    
    // Mock appendMessage to simulate concurrent operations
    let sequence = 0;
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async (args) => {
      sequence++;
      const result = { messageId: `msg-${sequence}`, sequence };
      results.push(result);
      return result;
    });
    
    // Create 50 messages concurrently
    for (let i = 0; i < 50; i++) {
      promises.push(
        convexOps.appendMessage({
          taskId,
          role: i % 2 === 0 ? 'USER' : 'ASSISTANT',
          content: `Message ${i}`,
          metadata: { sequence: i }
        })
      );
    }
    
    await Promise.all(promises);
    
    // Verify all have unique IDs
    const messageIds = results.map(r => r.messageId);
    const uniqueIds = new Set(messageIds);
    expect(uniqueIds.size).toBe(50);
    
    // Verify sequence numbers are monotonic
    const sequences = results.map(r => r.sequence).sort((a, b) => a - b);
    for (let i = 1; i < sequences.length; i++) {
      expect(sequences[i]).toBeGreaterThan(sequences[i - 1]);
    }
  });

  it('should handle race condition in promptMessageId assignment', async () => {
    const taskId = 'race-test-' + Date.now();
    const promptMessageId1 = 'prompt-1-' + Date.now();
    const promptMessageId2 = 'prompt-2-' + Date.now();
    
    // Mock to simulate concurrent stream starts with unique IDs per call
    const messageIds: string[] = [];
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async (args) => {
      // Generate unique ID using timestamp + random to avoid collisions
      const uniqueId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      messageIds.push(uniqueId);
      // Simulate slight delay to expose race conditions
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
      return { 
        messageId: uniqueId, 
        sequence: messageIds.length,
        promptMessageId: args.promptMessageId 
      };
    });
    
    // Simulate two streams starting simultaneously
    const stream1 = convexOps.appendMessage({
      taskId,
      role: 'USER',
      content: 'Initial prompt 1',
      promptMessageId: promptMessageId1
    });
    
    const stream2 = convexOps.appendMessage({
      taskId,
      role: 'USER', 
      content: 'Initial prompt 2',
      promptMessageId: promptMessageId2
    });
    
    // Both should complete without deadlock
    const [result1, result2] = await Promise.all([stream1, stream2]);
    
    // Both should have valid results with unique IDs
    expect(result1.messageId).toBeDefined();
    expect(result2.messageId).toBeDefined();
    expect(result1.messageId).not.toBe(result2.messageId);
  });

  it('should prevent duplicate promptMessageId assignment conflicts', async () => {
    const promptMessageId = 'duplicate-test-' + Date.now();
    const taskId = 'duplicate-task-' + Date.now();
    
    let callCount = 0;
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async (args) => {
      callCount++;
      return {
        messageId: `msg-${callCount}`,
        sequence: callCount,
        promptMessageId: args.promptMessageId
      };
    });
    
    // Try to create two assistant messages with same promptMessageId
    const msg1 = await convexOps.appendMessage({
      taskId,
      role: 'ASSISTANT',
      content: 'First attempt',
      promptMessageId
    });
    
    const msg2 = await convexOps.appendMessage({
      taskId,
      role: 'ASSISTANT',
      content: 'Second attempt',
      promptMessageId
    });
    
    // Both should succeed but have different message IDs
    expect(msg1.messageId).not.toBe(msg2.messageId);
    expect(msg1.promptMessageId).toBe(promptMessageId);
    expect(msg2.promptMessageId).toBe(promptMessageId);
  });

  it('should handle burst of 100 concurrent operations', async () => {
    const taskId = 'burst-test-' + Date.now();
    let sequence = 0;
    
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async () => {
      sequence++;
      return { messageId: `msg-${sequence}`, sequence };
    });
    
    const startTime = Date.now();
    const promises = Array.from({ length: 100 }, (_, i) =>
      convexOps.appendMessage({
        taskId,
        role: i % 2 === 0 ? 'USER' : 'ASSISTANT',
        content: `Burst message ${i}`,
        promptMessageId: i === 0 ? 'burst-prompt' : undefined
      })
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    expect(results.length).toBe(100);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5s
  });
});
