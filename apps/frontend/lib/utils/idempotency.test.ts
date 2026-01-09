import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateIdempotencyKey,
  createIdempotencyTracker,
  hasValidKey,
  getKeyStatus,
  registerKey,
  updateKeyStatus,
  cleanupOldEntries,
  generateMessageId,
} from './idempotency';

describe('idempotency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('generateIdempotencyKey', () => {
    it('should generate consistent keys for same input within time window', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const key1 = generateIdempotencyKey('task-123', 'hello world');
      const key2 = generateIdempotencyKey('task-123', 'hello world');

      expect(key1).toBe(key2);
    });

    it('should generate different keys for different task IDs', () => {
      const key1 = generateIdempotencyKey('task-123', 'hello world');
      const key2 = generateIdempotencyKey('task-456', 'hello world');

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different content', () => {
      const key1 = generateIdempotencyKey('task-123', 'hello world');
      const key2 = generateIdempotencyKey('task-123', 'goodbye world');

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys after time window expires', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const key1 = generateIdempotencyKey('task-123', 'hello world', 5000);

      // Advance past the time window
      vi.advanceTimersByTime(6000);

      const key2 = generateIdempotencyKey('task-123', 'hello world', 5000);

      expect(key1).not.toBe(key2);
    });

    it('should trim whitespace from content', () => {
      const key1 = generateIdempotencyKey('task-123', 'hello world');
      const key2 = generateIdempotencyKey('task-123', '  hello world  ');

      expect(key1).toBe(key2);
    });
  });

  describe('IdempotencyTracker', () => {
    it('should create an empty tracker', () => {
      const tracker = createIdempotencyTracker();

      expect(tracker.keys.size).toBe(0);
      expect(tracker.maxAge).toBe(60000);
      expect(tracker.maxSize).toBe(100);
    });

    it('should create tracker with custom options', () => {
      const tracker = createIdempotencyTracker(30000, 50);

      expect(tracker.maxAge).toBe(30000);
      expect(tracker.maxSize).toBe(50);
    });
  });

  describe('registerKey', () => {
    it('should register a new key', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const tracker = createIdempotencyTracker();
      const entry = registerKey(tracker, 'test-key');

      expect(entry.key).toBe('test-key');
      expect(entry.status).toBe('pending');
      expect(entry.createdAt).toBe(now);
      expect(tracker.keys.size).toBe(1);
    });

    it('should cleanup old entries when at max size', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const tracker = createIdempotencyTracker(60000, 3);

      // Register keys with different timestamps
      registerKey(tracker, 'key-1');
      vi.advanceTimersByTime(1000);
      registerKey(tracker, 'key-2');
      vi.advanceTimersByTime(1000);
      registerKey(tracker, 'key-3');

      expect(tracker.keys.size).toBe(3);

      // This should trigger cleanup
      vi.advanceTimersByTime(60000); // Make first key old
      registerKey(tracker, 'key-4');

      // Old key should have been cleaned up
      expect(tracker.keys.has('key-1')).toBe(false);
      expect(tracker.keys.has('key-4')).toBe(true);
    });
  });

  describe('hasValidKey', () => {
    it('should return false for non-existent key', () => {
      const tracker = createIdempotencyTracker();
      expect(hasValidKey(tracker, 'non-existent')).toBe(false);
    });

    it('should return true for valid key', () => {
      const tracker = createIdempotencyTracker();
      registerKey(tracker, 'test-key');

      expect(hasValidKey(tracker, 'test-key')).toBe(true);
    });

    it('should return false and remove expired key', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const tracker = createIdempotencyTracker(5000);
      registerKey(tracker, 'test-key');

      vi.advanceTimersByTime(6000);

      expect(hasValidKey(tracker, 'test-key')).toBe(false);
      expect(tracker.keys.has('test-key')).toBe(false);
    });
  });

  describe('getKeyStatus', () => {
    it('should return null for non-existent key', () => {
      const tracker = createIdempotencyTracker();
      expect(getKeyStatus(tracker, 'non-existent')).toBe(null);
    });

    it('should return entry for valid key', () => {
      const tracker = createIdempotencyTracker();
      registerKey(tracker, 'test-key');

      const status = getKeyStatus(tracker, 'test-key');
      expect(status).not.toBe(null);
      expect(status?.key).toBe('test-key');
      expect(status?.status).toBe('pending');
    });
  });

  describe('updateKeyStatus', () => {
    it('should update status of existing key', () => {
      const tracker = createIdempotencyTracker();
      registerKey(tracker, 'test-key');

      updateKeyStatus(tracker, 'test-key', 'sent');

      const status = getKeyStatus(tracker, 'test-key');
      expect(status?.status).toBe('sent');
    });

    it('should update status with message ID', () => {
      const tracker = createIdempotencyTracker();
      registerKey(tracker, 'test-key');

      updateKeyStatus(tracker, 'test-key', 'confirmed', 'msg-123');

      const status = getKeyStatus(tracker, 'test-key');
      expect(status?.status).toBe('confirmed');
      expect(status?.messageId).toBe('msg-123');
    });

    it('should do nothing for non-existent key', () => {
      const tracker = createIdempotencyTracker();
      updateKeyStatus(tracker, 'non-existent', 'sent');

      expect(tracker.keys.size).toBe(0);
    });
  });

  describe('cleanupOldEntries', () => {
    it('should remove old entries', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const tracker = createIdempotencyTracker(5000);

      registerKey(tracker, 'old-key');
      vi.advanceTimersByTime(6000);
      registerKey(tracker, 'new-key');

      const removed = cleanupOldEntries(tracker);

      expect(removed).toBe(1);
      expect(tracker.keys.has('old-key')).toBe(false);
      expect(tracker.keys.has('new-key')).toBe(true);
    });

    it('should return 0 when no entries to clean', () => {
      const tracker = createIdempotencyTracker();
      registerKey(tracker, 'test-key');

      const removed = cleanupOldEntries(tracker);
      expect(removed).toBe(0);
    });
  });

  describe('generateMessageId', () => {
    it('should generate ID with default prefix', () => {
      const id = generateMessageId();
      expect(id).toMatch(/^msg-[a-z0-9]+-[a-z0-9]+$/);
    });

    it('should generate ID with custom prefix', () => {
      const id = generateMessageId('user');
      expect(id).toMatch(/^user-[a-z0-9]+-[a-z0-9]+$/);
    });

    it('should generate unique IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      expect(id1).not.toBe(id2);
    });
  });
});
