/**
 * Message Metrics and Observability System
 *
 * Tracks key metrics for agent messaging including:
 * - Duplicate submission rates (blocked and allowed)
 * - Streaming success/failure rates
 * - Message processing latency
 * - Error rates by type
 *
 * @see Research recommendations for production agent applications
 */

export interface MessageMetrics {
  // Duplicate prevention metrics
  duplicatesBlocked: number;
  duplicatesBlockedByWindow: number;
  duplicatesBlockedByIdempotency: number;
  messagesAllowed: number;

  // Streaming metrics
  streamsStarted: number;
  streamsCompleted: number;
  streamsFailed: number;
  streamsRecovered: number;
  totalStreamingDurationMs: number;
  totalChunksReceived: number;

  // Latency metrics
  messageLatencies: number[];
  avgMessageLatencyMs: number;
  p95MessageLatencyMs: number;

  // Error metrics
  errorsByType: Record<string, number>;
  totalErrors: number;

  // Session info
  sessionStartedAt: number;
  lastActivityAt: number;
}

export interface MetricsEvent {
  type: MetricsEventType;
  timestamp: number;
  data?: Record<string, unknown>;
}

export type MetricsEventType =
  | 'duplicate_blocked_window'
  | 'duplicate_blocked_idempotency'
  | 'message_allowed'
  | 'stream_started'
  | 'stream_chunk'
  | 'stream_completed'
  | 'stream_failed'
  | 'stream_recovered'
  | 'message_latency'
  | 'error';

const METRICS_STORAGE_KEY = 'shadow-message-metrics';
const MAX_LATENCY_SAMPLES = 100;

/**
 * Create initial metrics state
 */
export function createMetrics(): MessageMetrics {
  return {
    duplicatesBlocked: 0,
    duplicatesBlockedByWindow: 0,
    duplicatesBlockedByIdempotency: 0,
    messagesAllowed: 0,
    streamsStarted: 0,
    streamsCompleted: 0,
    streamsFailed: 0,
    streamsRecovered: 0,
    totalStreamingDurationMs: 0,
    totalChunksReceived: 0,
    messageLatencies: [],
    avgMessageLatencyMs: 0,
    p95MessageLatencyMs: 0,
    errorsByType: {},
    totalErrors: 0,
    sessionStartedAt: Date.now(),
    lastActivityAt: Date.now(),
  };
}

/**
 * Record a duplicate blocked event
 */
export function recordDuplicateBlocked(
  metrics: MessageMetrics,
  reason: 'window' | 'idempotency'
): MessageMetrics {
  const updated = {
    ...metrics,
    duplicatesBlocked: metrics.duplicatesBlocked + 1,
    lastActivityAt: Date.now(),
  };

  if (reason === 'window') {
    updated.duplicatesBlockedByWindow = metrics.duplicatesBlockedByWindow + 1;
  } else {
    updated.duplicatesBlockedByIdempotency = metrics.duplicatesBlockedByIdempotency + 1;
  }

  logMetricsEvent({
    type: reason === 'window' ? 'duplicate_blocked_window' : 'duplicate_blocked_idempotency',
    timestamp: Date.now(),
  });

  return updated;
}

/**
 * Record a message allowed event
 */
export function recordMessageAllowed(metrics: MessageMetrics): MessageMetrics {
  logMetricsEvent({
    type: 'message_allowed',
    timestamp: Date.now(),
  });

  return {
    ...metrics,
    messagesAllowed: metrics.messagesAllowed + 1,
    lastActivityAt: Date.now(),
  };
}

/**
 * Record stream started
 */
export function recordStreamStarted(metrics: MessageMetrics): MessageMetrics {
  logMetricsEvent({
    type: 'stream_started',
    timestamp: Date.now(),
  });

  return {
    ...metrics,
    streamsStarted: metrics.streamsStarted + 1,
    lastActivityAt: Date.now(),
  };
}

/**
 * Record stream chunk received
 */
export function recordStreamChunk(metrics: MessageMetrics): MessageMetrics {
  return {
    ...metrics,
    totalChunksReceived: metrics.totalChunksReceived + 1,
    lastActivityAt: Date.now(),
  };
}

/**
 * Record stream completed with duration
 */
export function recordStreamCompleted(
  metrics: MessageMetrics,
  durationMs: number
): MessageMetrics {
  logMetricsEvent({
    type: 'stream_completed',
    timestamp: Date.now(),
    data: { durationMs },
  });

  return {
    ...metrics,
    streamsCompleted: metrics.streamsCompleted + 1,
    totalStreamingDurationMs: metrics.totalStreamingDurationMs + durationMs,
    lastActivityAt: Date.now(),
  };
}

/**
 * Record stream failed
 */
export function recordStreamFailed(
  metrics: MessageMetrics,
  error: string
): MessageMetrics {
  logMetricsEvent({
    type: 'stream_failed',
    timestamp: Date.now(),
    data: { error },
  });

  const errorsByType = { ...metrics.errorsByType };
  const errorKey = `stream_${error.substring(0, 50)}`;
  errorsByType[errorKey] = (errorsByType[errorKey] || 0) + 1;

  return {
    ...metrics,
    streamsFailed: metrics.streamsFailed + 1,
    errorsByType,
    totalErrors: metrics.totalErrors + 1,
    lastActivityAt: Date.now(),
  };
}

/**
 * Record stream recovered
 */
export function recordStreamRecovered(metrics: MessageMetrics): MessageMetrics {
  logMetricsEvent({
    type: 'stream_recovered',
    timestamp: Date.now(),
  });

  return {
    ...metrics,
    streamsRecovered: metrics.streamsRecovered + 1,
    lastActivityAt: Date.now(),
  };
}

/**
 * Record message latency
 */
export function recordMessageLatency(
  metrics: MessageMetrics,
  latencyMs: number
): MessageMetrics {
  const latencies = [...metrics.messageLatencies, latencyMs];

  // Keep only last N samples
  if (latencies.length > MAX_LATENCY_SAMPLES) {
    latencies.shift();
  }

  // Calculate avg and p95
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted[p95Index] ?? sorted[sorted.length - 1] ?? 0;

  logMetricsEvent({
    type: 'message_latency',
    timestamp: Date.now(),
    data: { latencyMs },
  });

  return {
    ...metrics,
    messageLatencies: latencies,
    avgMessageLatencyMs: Math.round(avg),
    p95MessageLatencyMs: Math.round(p95),
    lastActivityAt: Date.now(),
  };
}

/**
 * Record an error
 */
export function recordError(
  metrics: MessageMetrics,
  errorType: string,
  errorMessage?: string
): MessageMetrics {
  logMetricsEvent({
    type: 'error',
    timestamp: Date.now(),
    data: { errorType, errorMessage },
  });

  const errorsByType = { ...metrics.errorsByType };
  errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;

  return {
    ...metrics,
    errorsByType,
    totalErrors: metrics.totalErrors + 1,
    lastActivityAt: Date.now(),
  };
}

/**
 * Get computed metrics summary
 */
export function getMetricsSummary(metrics: MessageMetrics): {
  duplicateBlockRate: number;
  streamSuccessRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorsPerHour: number;
  sessionDurationMs: number;
  chunksPerStream: number;
} {
  const totalMessages = metrics.messagesAllowed + metrics.duplicatesBlocked;
  const duplicateBlockRate = totalMessages > 0
    ? metrics.duplicatesBlocked / totalMessages
    : 0;

  const totalStreams = metrics.streamsCompleted + metrics.streamsFailed;
  const streamSuccessRate = totalStreams > 0
    ? metrics.streamsCompleted / totalStreams
    : 1;

  const sessionDurationMs = Date.now() - metrics.sessionStartedAt;
  const sessionHours = sessionDurationMs / (1000 * 60 * 60);
  const errorsPerHour = sessionHours > 0
    ? metrics.totalErrors / sessionHours
    : 0;

  const chunksPerStream = metrics.streamsCompleted > 0
    ? metrics.totalChunksReceived / metrics.streamsCompleted
    : 0;

  return {
    duplicateBlockRate,
    streamSuccessRate,
    avgLatencyMs: metrics.avgMessageLatencyMs,
    p95LatencyMs: metrics.p95MessageLatencyMs,
    errorsPerHour,
    sessionDurationMs,
    chunksPerStream,
  };
}

/**
 * Log a metrics event (can be extended to send to analytics)
 */
function logMetricsEvent(event: MetricsEvent): void {
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Metrics]', event.type, event.data ?? '');
  }

  // Could be extended to send to analytics service:
  // sendToAnalytics(event);
}

/**
 * Persist metrics to storage
 */
export function persistMetrics(metrics: MessageMetrics): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics));
  } catch (e) {
    console.warn('[Metrics] Failed to persist:', e);
  }
}

/**
 * Load metrics from storage
 */
export function loadMetrics(): MessageMetrics | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(METRICS_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as MessageMetrics;
  } catch (e) {
    console.warn('[Metrics] Failed to load:', e);
    return null;
  }
}

/**
 * Clear stored metrics
 */
export function clearMetrics(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(METRICS_STORAGE_KEY);
  } catch (e) {
    console.warn('[Metrics] Failed to clear:', e);
  }
}

/**
 * Format metrics for display
 */
export function formatMetricsDisplay(metrics: MessageMetrics): string {
  const summary = getMetricsSummary(metrics);

  return `
📊 Message Metrics Summary
━━━━━━━━━━━━━━━━━━━━━━━━━

📩 Messages
  • Allowed: ${metrics.messagesAllowed}
  • Duplicates Blocked: ${metrics.duplicatesBlocked}
    - By Time Window: ${metrics.duplicatesBlockedByWindow}
    - By Idempotency: ${metrics.duplicatesBlockedByIdempotency}
  • Block Rate: ${(summary.duplicateBlockRate * 100).toFixed(1)}%

🌊 Streaming
  • Started: ${metrics.streamsStarted}
  • Completed: ${metrics.streamsCompleted}
  • Failed: ${metrics.streamsFailed}
  • Recovered: ${metrics.streamsRecovered}
  • Success Rate: ${(summary.streamSuccessRate * 100).toFixed(1)}%
  • Avg Chunks/Stream: ${summary.chunksPerStream.toFixed(1)}

⏱️ Latency
  • Average: ${summary.avgLatencyMs}ms
  • P95: ${summary.p95LatencyMs}ms

❌ Errors
  • Total: ${metrics.totalErrors}
  • Per Hour: ${summary.errorsPerHour.toFixed(2)}
`.trim();
}
