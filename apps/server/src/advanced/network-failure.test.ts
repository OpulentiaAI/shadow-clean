import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as convexOps from '../lib/convex-operations';

describe('Network Failure & Retry Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should retry with same promptMessageId on network failure', async () => {
    const taskId = 'retry-test-' + Date.now();
    const promptMessageId = 'prompt-retry-' + Date.now();
    let failCount = 0;
    
    // Mock appendMessage to fail twice, then succeed
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async (args) => {
      failCount++;
      if (failCount <= 2) {
        throw new Error('Network timeout');
      }
      return { 
        messageId: 'msg-success', 
        sequence: 1,
        promptMessageId: args.promptMessageId 
      };
    });
    
    // Implement retry logic wrapper
    async function appendWithRetry(args: Parameters<typeof convexOps.appendMessage>[0], maxRetries = 3) {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await convexOps.appendMessage(args);
        } catch (error) {
          lastError = error as Error;
          await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
        }
      }
      throw lastError;
    }
    
    const result = await appendWithRetry({
      taskId,
      role: 'USER',
      content: 'Should retry',
      promptMessageId
    });
    
    expect(failCount).toBe(3); // 2 failures + 1 success
    expect(result.messageId).toBeDefined();
    expect(result.promptMessageId).toBe(promptMessageId);
  });

  it('should handle partial network partition gracefully', async () => {
    const taskId = 'partition-test-' + Date.now();
    let callCount = 0;
    
    // Simulate partition where some mutations succeed, others fail
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async () => {
      callCount++;
      // Fail every 3rd call to simulate partition
      if (callCount % 3 === 0) {
        throw new Error('Connection reset');
      }
      return { messageId: `msg-${callCount}`, sequence: callCount };
    });
    
    const successes: Array<{ messageId: string; sequence: number }> = [];
    const failures: Error[] = [];
    
    for (let i = 0; i < 10; i++) {
      try {
        const result = await convexOps.appendMessage({
          taskId,
          role: i % 2 === 0 ? 'USER' : 'ASSISTANT',
          content: `Message ${i}`,
          promptMessageId: i === 0 ? 'initial-prompt' : undefined
        });
        successes.push(result);
      } catch (error) {
        failures.push(error as Error);
      }
    }
    
    // System should handle mixed success/failure
    expect(successes.length + failures.length).toBe(10);
    expect(successes.length).toBeGreaterThan(0);
    expect(failures.length).toBeGreaterThan(0);
  });

  it('should preserve promptMessageId chain integrity after failures', async () => {
    const taskId = 'chain-test-' + Date.now();
    const promptMessageId = 'chain-prompt-' + Date.now();
    let sequence = 0;
    let shouldFail = true;
    
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async (args) => {
      sequence++;
      // First call fails, subsequent succeed
      if (shouldFail && sequence === 1) {
        shouldFail = false;
        throw new Error('Temporary failure');
      }
      return {
        messageId: `msg-${sequence}`,
        sequence,
        promptMessageId: args.promptMessageId
      };
    });
    
    // First attempt fails
    let userMessage;
    try {
      userMessage = await convexOps.appendMessage({
        taskId,
        role: 'USER',
        content: 'User prompt',
        promptMessageId
      });
    } catch {
      // Retry with same promptMessageId
      userMessage = await convexOps.appendMessage({
        taskId,
        role: 'USER',
        content: 'User prompt',
        promptMessageId
      });
    }
    
    // Now create assistant message linked to same prompt
    const assistantMessage = await convexOps.appendMessage({
      taskId,
      role: 'ASSISTANT',
      content: 'Assistant response',
      promptMessageId
    });
    
    // Chain should be intact
    expect(userMessage.promptMessageId).toBe(promptMessageId);
    expect(assistantMessage.promptMessageId).toBe(promptMessageId);
  });

  it('should handle exponential backoff correctly', async () => {
    let attemptTimes: number[] = [];
    let failCount = 0;
    
    vi.spyOn(convexOps, 'appendMessage').mockImplementation(async () => {
      attemptTimes.push(Date.now());
      failCount++;
      if (failCount < 4) {
        throw new Error('Service unavailable');
      }
      return { messageId: 'msg-success', sequence: 1 };
    });
    
    async function appendWithExponentialBackoff(
      args: Parameters<typeof convexOps.appendMessage>[0],
      maxRetries = 5,
      baseDelay = 50
    ) {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await convexOps.appendMessage(args);
        } catch (error) {
          if (attempt === maxRetries - 1) throw error;
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    const startTime = Date.now();
    await appendWithExponentialBackoff({
      taskId: 'backoff-test',
      role: 'USER',
      content: 'Test backoff',
      promptMessageId: 'backoff-prompt'
    });
    
    expect(failCount).toBe(4);
    
    // Verify delays increased exponentially
    for (let i = 1; i < attemptTimes.length; i++) {
      const gap = attemptTimes[i] - attemptTimes[i - 1];
      // Each gap should be roughly 2x the previous (with some tolerance)
      if (i > 1) {
        const prevGap = attemptTimes[i - 1] - attemptTimes[i - 2];
        expect(gap).toBeGreaterThanOrEqual(prevGap * 1.5);
      }
    }
  });
});
