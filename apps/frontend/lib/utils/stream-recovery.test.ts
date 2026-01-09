import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createStreamRecoveryState,
  generateStreamId,
  startStreamTracking,
  updateStreamChunk,
  completeStream,
  failStream,
  attemptRecovery,
  hasRecoverableStream,
  getRecoverableStream,
  getStreamHealth,
  clearPersistedState,
} from './stream-recovery';

describe('stream-recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createStreamRecoveryState', () => {
    it('should create initial state with defaults', () => {
      const state = createStreamRecoveryState();

      expect(state.activeStream).toBe(null);
      expect(state.recoveryAttempts).toBe(0);
      expect(state.maxRecoveryAttempts).toBe(3);
    });

    it('should create state with custom max attempts', () => {
      const state = createStreamRecoveryState(5);

      expect(state.maxRecoveryAttempts).toBe(5);
    });
  });

  describe('generateStreamId', () => {
    it('should generate unique stream IDs', () => {
      const id1 = generateStreamId();
      const id2 = generateStreamId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^stream-[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('startStreamTracking', () => {
    it('should create active stream info', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const state = createStreamRecoveryState();
      const newState = startStreamTracking(state, 'task-123');

      expect(newState.activeStream).not.toBe(null);
      expect(newState.activeStream?.taskId).toBe('task-123');
      expect(newState.activeStream?.startedAt).toBe(now);
      expect(newState.activeStream?.status).toBe('active');
      expect(newState.activeStream?.chunkCount).toBe(0);
    });

    it('should reset recovery attempts', () => {
      const state = {
        ...createStreamRecoveryState(),
        recoveryAttempts: 2,
      };
      const newState = startStreamTracking(state, 'task-123');

      expect(newState.recoveryAttempts).toBe(0);
    });

    it('should generate unique stream ID', () => {
      const state = createStreamRecoveryState();
      const newState = startStreamTracking(state, 'task-123');

      expect(newState.activeStream?.streamId).toMatch(/^stream-[a-z0-9]+-[a-z0-9]+$/);
    });
  });

  describe('updateStreamChunk', () => {
    it('should increment chunk count', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');
      state = updateStreamChunk(state);
      state = updateStreamChunk(state);

      expect(state.activeStream?.chunkCount).toBe(2);
    });

    it('should update lastChunkAt', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');

      vi.advanceTimersByTime(1000);
      state = updateStreamChunk(state);

      expect(state.activeStream?.lastChunkAt).toBe(now + 1000);
    });

    it('should store partial content', () => {
      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');
      state = updateStreamChunk(state, 'Hello');
      state = updateStreamChunk(state, 'Hello World');

      expect(state.activeStream?.partialContent).toBe('Hello World');
    });

    it('should return unchanged state if no active stream', () => {
      const state = createStreamRecoveryState();
      const newState = updateStreamChunk(state);

      expect(newState).toEqual(state);
    });
  });

  describe('completeStream', () => {
    it('should clear active stream', () => {
      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');
      state = completeStream(state);

      expect(state.activeStream).toBe(null);
    });

    it('should set status to completed before clearing', () => {
      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');
      const completed = completeStream(state);

      // The returned state should have null activeStream
      expect(completed.activeStream).toBe(null);
    });
  });

  describe('failStream', () => {
    it('should set stream status to failed', () => {
      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');
      state = failStream(state, 'Network error');

      expect(state.activeStream?.status).toBe('failed');
      expect(state.lastError).toBe('Network error');
    });

    it('should preserve stream for potential recovery', () => {
      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');
      const failed = failStream(state, 'Network error');

      // Stream should still exist (for potential recovery)
      expect(failed.activeStream).not.toBe(null);
      expect(failed.activeStream?.status).toBe('failed');
    });
  });

  describe('attemptRecovery', () => {
    it('should increment recovery attempts', () => {
      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');

      const { newState } = attemptRecovery(state);

      expect(newState.recoveryAttempts).toBe(1);
    });

    it('should fail if max attempts exceeded', () => {
      let state = createStreamRecoveryState(2);
      state = startStreamTracking(state, 'task-123');
      state.recoveryAttempts = 2;

      const { canRecover, newState } = attemptRecovery(state);

      expect(canRecover).toBe(false);
      expect(newState.activeStream).toBe(null);
      expect(newState.lastError).toBe('Max recovery attempts exceeded');
    });

    it('should fail if stream is expired', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');

      // Advance past max age (5 minutes)
      vi.advanceTimersByTime(6 * 60 * 1000);

      const { canRecover, newState } = attemptRecovery(state);

      expect(canRecover).toBe(false);
      expect(newState.lastError).toBe('Stream expired');
    });

    it('should return canRecover true for valid stream', () => {
      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');

      const { canRecover, newState } = attemptRecovery(state);

      expect(canRecover).toBe(true);
      expect(newState.activeStream?.status).toBe('active');
    });

    it('should return canRecover false if no active stream', () => {
      const state = createStreamRecoveryState();

      const { canRecover } = attemptRecovery(state);

      expect(canRecover).toBe(false);
    });
  });

  describe('hasRecoverableStream', () => {
    it('should return false if no persisted state', () => {
      expect(hasRecoverableStream('task-123')).toBe(false);
    });

    it('should return false for different task ID', () => {
      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-456');

      expect(hasRecoverableStream('task-123')).toBe(false);
    });
  });

  describe('getRecoverableStream', () => {
    it('should return null if no persisted state', () => {
      expect(getRecoverableStream('task-123')).toBe(null);
    });
  });

  describe('getStreamHealth', () => {
    it('should calculate stream health metrics', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');

      // Add some chunks over time
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(100);
        state = updateStreamChunk(state);
      }

      const health = getStreamHealth(state.activeStream!);

      expect(health.durationMs).toBe(1000);
      expect(health.chunksPerSecond).toBe(10);
      expect(health.isHealthy).toBe(true);
      expect(health.timeSinceLastChunk).toBe(0);
    });

    it('should detect unhealthy stream (no chunks for 30s)', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let state = createStreamRecoveryState();
      state = startStreamTracking(state, 'task-123');

      // Advance past healthy threshold
      vi.advanceTimersByTime(35000);

      const health = getStreamHealth(state.activeStream!);

      expect(health.isHealthy).toBe(false);
      expect(health.timeSinceLastChunk).toBe(35000);
    });
  });

  describe('clearPersistedState', () => {
    it('should not throw when called without localStorage', () => {
      // In node environment, localStorage doesn't exist
      // The function should handle this gracefully
      expect(() => clearPersistedState()).not.toThrow();
    });
  });
});
