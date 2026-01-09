import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createMetrics,
  recordDuplicateBlocked,
  recordMessageAllowed,
  recordStreamStarted,
  recordStreamChunk,
  recordStreamCompleted,
  recordStreamFailed,
  recordStreamRecovered,
  recordMessageLatency,
  recordError,
  getMetricsSummary,
  formatMetricsDisplay,
} from './message-metrics';

describe('message-metrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createMetrics', () => {
    it('should create initial metrics with zero values', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const metrics = createMetrics();

      expect(metrics.duplicatesBlocked).toBe(0);
      expect(metrics.messagesAllowed).toBe(0);
      expect(metrics.streamsStarted).toBe(0);
      expect(metrics.streamsCompleted).toBe(0);
      expect(metrics.streamsFailed).toBe(0);
      expect(metrics.totalErrors).toBe(0);
      expect(metrics.sessionStartedAt).toBe(now);
    });
  });

  describe('recordDuplicateBlocked', () => {
    it('should increment window duplicate counter', () => {
      const metrics = createMetrics();
      const updated = recordDuplicateBlocked(metrics, 'window');

      expect(updated.duplicatesBlocked).toBe(1);
      expect(updated.duplicatesBlockedByWindow).toBe(1);
      expect(updated.duplicatesBlockedByIdempotency).toBe(0);
    });

    it('should increment idempotency duplicate counter', () => {
      const metrics = createMetrics();
      const updated = recordDuplicateBlocked(metrics, 'idempotency');

      expect(updated.duplicatesBlocked).toBe(1);
      expect(updated.duplicatesBlockedByIdempotency).toBe(1);
      expect(updated.duplicatesBlockedByWindow).toBe(0);
    });

    it('should update lastActivityAt', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const metrics = createMetrics();

      vi.advanceTimersByTime(1000);
      const updated = recordDuplicateBlocked(metrics, 'window');

      expect(updated.lastActivityAt).toBe(now + 1000);
    });
  });

  describe('recordMessageAllowed', () => {
    it('should increment messages allowed', () => {
      const metrics = createMetrics();
      const updated = recordMessageAllowed(metrics);

      expect(updated.messagesAllowed).toBe(1);
    });
  });

  describe('recordStreamStarted', () => {
    it('should increment streams started', () => {
      const metrics = createMetrics();
      const updated = recordStreamStarted(metrics);

      expect(updated.streamsStarted).toBe(1);
    });
  });

  describe('recordStreamChunk', () => {
    it('should increment total chunks received', () => {
      let metrics = createMetrics();
      metrics = recordStreamChunk(metrics);
      metrics = recordStreamChunk(metrics);
      metrics = recordStreamChunk(metrics);

      expect(metrics.totalChunksReceived).toBe(3);
    });
  });

  describe('recordStreamCompleted', () => {
    it('should increment completed and add duration', () => {
      const metrics = createMetrics();
      const updated = recordStreamCompleted(metrics, 500);

      expect(updated.streamsCompleted).toBe(1);
      expect(updated.totalStreamingDurationMs).toBe(500);
    });

    it('should accumulate total duration', () => {
      let metrics = createMetrics();
      metrics = recordStreamCompleted(metrics, 500);
      metrics = recordStreamCompleted(metrics, 300);

      expect(metrics.streamsCompleted).toBe(2);
      expect(metrics.totalStreamingDurationMs).toBe(800);
    });
  });

  describe('recordStreamFailed', () => {
    it('should increment failed and track error', () => {
      const metrics = createMetrics();
      const updated = recordStreamFailed(metrics, 'Network error');

      expect(updated.streamsFailed).toBe(1);
      expect(updated.totalErrors).toBe(1);
      expect(Object.keys(updated.errorsByType).length).toBe(1);
    });
  });

  describe('recordStreamRecovered', () => {
    it('should increment recovered count', () => {
      const metrics = createMetrics();
      const updated = recordStreamRecovered(metrics);

      expect(updated.streamsRecovered).toBe(1);
    });
  });

  describe('recordMessageLatency', () => {
    it('should record latency and calculate average', () => {
      let metrics = createMetrics();
      metrics = recordMessageLatency(metrics, 100);
      metrics = recordMessageLatency(metrics, 200);
      metrics = recordMessageLatency(metrics, 300);

      expect(metrics.messageLatencies.length).toBe(3);
      expect(metrics.avgMessageLatencyMs).toBe(200);
    });

    it('should calculate p95 latency', () => {
      let metrics = createMetrics();

      // Add 100 samples
      for (let i = 1; i <= 100; i++) {
        metrics = recordMessageLatency(metrics, i * 10);
      }

      // P95 should be around 950ms (95th percentile of 10-1000)
      expect(metrics.p95MessageLatencyMs).toBeGreaterThanOrEqual(950);
    });

    it('should limit latency samples', () => {
      let metrics = createMetrics();

      // Add more than max samples
      for (let i = 0; i < 150; i++) {
        metrics = recordMessageLatency(metrics, i);
      }

      // Should only keep last 100
      expect(metrics.messageLatencies.length).toBe(100);
    });
  });

  describe('recordError', () => {
    it('should track error by type', () => {
      let metrics = createMetrics();
      metrics = recordError(metrics, 'network');
      metrics = recordError(metrics, 'network');
      metrics = recordError(metrics, 'timeout');

      expect(metrics.errorsByType['network']).toBe(2);
      expect(metrics.errorsByType['timeout']).toBe(1);
      expect(metrics.totalErrors).toBe(3);
    });
  });

  describe('getMetricsSummary', () => {
    it('should calculate duplicate block rate', () => {
      let metrics = createMetrics();
      metrics = recordMessageAllowed(metrics);
      metrics = recordMessageAllowed(metrics);
      metrics = recordDuplicateBlocked(metrics, 'window');
      metrics = recordDuplicateBlocked(metrics, 'idempotency');

      const summary = getMetricsSummary(metrics);

      expect(summary.duplicateBlockRate).toBe(0.5); // 2 blocked out of 4 total
    });

    it('should calculate stream success rate', () => {
      let metrics = createMetrics();
      metrics = recordStreamCompleted(metrics, 100);
      metrics = recordStreamCompleted(metrics, 100);
      metrics = recordStreamCompleted(metrics, 100);
      metrics = recordStreamFailed(metrics, 'error');

      const summary = getMetricsSummary(metrics);

      expect(summary.streamSuccessRate).toBe(0.75); // 3 out of 4
    });

    it('should calculate chunks per stream', () => {
      let metrics = createMetrics();
      metrics = recordStreamChunk(metrics);
      metrics = recordStreamChunk(metrics);
      metrics = recordStreamChunk(metrics);
      metrics = recordStreamChunk(metrics);
      metrics = recordStreamCompleted(metrics, 100);
      metrics = recordStreamCompleted(metrics, 100);

      const summary = getMetricsSummary(metrics);

      expect(summary.chunksPerStream).toBe(2); // 4 chunks / 2 streams
    });

    it('should handle zero division cases', () => {
      const metrics = createMetrics();
      const summary = getMetricsSummary(metrics);

      expect(summary.duplicateBlockRate).toBe(0);
      expect(summary.streamSuccessRate).toBe(1);
      expect(summary.chunksPerStream).toBe(0);
    });
  });

  describe('formatMetricsDisplay', () => {
    it('should format metrics as readable string', () => {
      let metrics = createMetrics();
      metrics = recordMessageAllowed(metrics);
      metrics = recordDuplicateBlocked(metrics, 'window');
      metrics = recordStreamCompleted(metrics, 100);

      const display = formatMetricsDisplay(metrics);

      expect(display).toContain('Message Metrics Summary');
      expect(display).toContain('Allowed: 1');
      expect(display).toContain('Duplicates Blocked: 1');
      expect(display).toContain('Completed: 1');
    });
  });
});
