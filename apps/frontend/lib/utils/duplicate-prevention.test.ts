import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isDuplicateMessage,
  createLastSentMessage,
  DEFAULT_DUPLICATE_PREVENTION_WINDOW_MS,
  type LastSentMessage,
} from './duplicate-prevention';

describe('duplicate-prevention', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isDuplicateMessage', () => {
    it('should return false when lastSent is null', () => {
      expect(isDuplicateMessage('hello', null)).toBe(false);
    });

    it('should return false when messages are different', () => {
      const lastSent: LastSentMessage = {
        message: 'hello',
        timestamp: Date.now(),
      };
      expect(isDuplicateMessage('goodbye', lastSent)).toBe(false);
    });

    it('should return true when same message within window', () => {
      const now = Date.now();
      const lastSent: LastSentMessage = {
        message: 'hello',
        timestamp: now,
      };
      // Same message, same time
      expect(isDuplicateMessage('hello', lastSent)).toBe(true);
    });

    it('should return true when same message within custom window', () => {
      const now = Date.now();
      const lastSent: LastSentMessage = {
        message: 'test message',
        timestamp: now - 500, // 500ms ago
      };
      // Within 1000ms window
      expect(isDuplicateMessage('test message', lastSent, 1000)).toBe(true);
    });

    it('should return false when same message outside window', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const lastSent: LastSentMessage = {
        message: 'hello',
        timestamp: now - DEFAULT_DUPLICATE_PREVENTION_WINDOW_MS - 100, // Just outside window
      };

      expect(isDuplicateMessage('hello', lastSent)).toBe(false);
    });

    it('should handle whitespace-trimmed messages', () => {
      const now = Date.now();
      const lastSent: LastSentMessage = {
        message: 'hello world',
        timestamp: now,
      };
      // Message with extra whitespace should be trimmed and match
      expect(isDuplicateMessage('  hello world  ', lastSent)).toBe(true);
    });

    it('should not match empty messages after trimming', () => {
      const now = Date.now();
      const lastSent: LastSentMessage = {
        message: '',
        timestamp: now,
      };
      expect(isDuplicateMessage('   ', lastSent)).toBe(true);
    });

    it('should correctly expire after window passes', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const lastSent: LastSentMessage = {
        message: 'test',
        timestamp: now,
      };

      // Initially should be duplicate
      expect(isDuplicateMessage('test', lastSent)).toBe(true);

      // Advance time past the window
      vi.advanceTimersByTime(DEFAULT_DUPLICATE_PREVENTION_WINDOW_MS + 1);

      // Now should not be duplicate
      expect(isDuplicateMessage('test', lastSent)).toBe(false);
    });
  });

  describe('createLastSentMessage', () => {
    it('should create a message record with current timestamp', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const record = createLastSentMessage('hello');

      expect(record.message).toBe('hello');
      expect(record.timestamp).toBe(now);
    });

    it('should trim whitespace from message', () => {
      const record = createLastSentMessage('  hello world  ');
      expect(record.message).toBe('hello world');
    });

    it('should handle empty messages', () => {
      const record = createLastSentMessage('');
      expect(record.message).toBe('');
    });
  });

  describe('integration: rapid duplicate submissions', () => {
    it('should block rapid identical submissions', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      // First submission - should not be blocked
      let lastSent: LastSentMessage | null = null;
      expect(isDuplicateMessage('create a task', lastSent)).toBe(false);

      // Record the first submission
      lastSent = createLastSentMessage('create a task');

      // Second submission immediately after - should be blocked
      expect(isDuplicateMessage('create a task', lastSent)).toBe(true);

      // Third submission 100ms later - should still be blocked
      vi.advanceTimersByTime(100);
      expect(isDuplicateMessage('create a task', lastSent)).toBe(true);

      // Fourth submission 1 second later - should still be blocked (within 2s window)
      vi.advanceTimersByTime(900);
      expect(isDuplicateMessage('create a task', lastSent)).toBe(true);

      // Fifth submission after 2 seconds - should NOT be blocked
      vi.advanceTimersByTime(1001);
      expect(isDuplicateMessage('create a task', lastSent)).toBe(false);
    });

    it('should allow different messages in rapid succession', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let lastSent: LastSentMessage | null = null;

      // First message
      expect(isDuplicateMessage('message 1', lastSent)).toBe(false);
      lastSent = createLastSentMessage('message 1');

      // Different message immediately - should NOT be blocked
      expect(isDuplicateMessage('message 2', lastSent)).toBe(false);
      lastSent = createLastSentMessage('message 2');

      // Yet another different message - should NOT be blocked
      expect(isDuplicateMessage('message 3', lastSent)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle very long messages', () => {
      const longMessage = 'a'.repeat(10000);
      const now = Date.now();

      const lastSent: LastSentMessage = {
        message: longMessage,
        timestamp: now,
      };

      expect(isDuplicateMessage(longMessage, lastSent)).toBe(true);
      expect(isDuplicateMessage(longMessage + 'b', lastSent)).toBe(false);
    });

    it('should handle unicode messages', () => {
      const unicodeMessage = '你好世界 🌍 مرحبا';
      const now = Date.now();

      const lastSent: LastSentMessage = {
        message: unicodeMessage,
        timestamp: now,
      };

      expect(isDuplicateMessage(unicodeMessage, lastSent)).toBe(true);
    });

    it('should handle newlines in messages', () => {
      const multilineMessage = 'line1\nline2\nline3';
      const now = Date.now();

      const lastSent: LastSentMessage = {
        message: multilineMessage,
        timestamp: now,
      };

      expect(isDuplicateMessage(multilineMessage, lastSent)).toBe(true);
    });
  });
});
