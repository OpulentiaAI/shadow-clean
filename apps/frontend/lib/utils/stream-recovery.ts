/**
 * Stream Recovery System
 *
 * Enables chat applications to reconnect to ongoing AI generations after
 * page reloads or disconnections. Based on AI SDK stream resumption patterns.
 *
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams
 */

export interface ActiveStreamInfo {
  streamId: string;
  taskId: string;
  startedAt: number;
  lastChunkAt: number;
  chunkCount: number;
  status: 'active' | 'paused' | 'completed' | 'failed';
  partialContent?: string;
}

export interface StreamRecoveryState {
  activeStream: ActiveStreamInfo | null;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  lastError?: string;
}

const STORAGE_KEY = 'shadow-stream-recovery';
const MAX_STREAM_AGE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Create initial stream recovery state
 */
export function createStreamRecoveryState(
  maxRecoveryAttempts: number = 3
): StreamRecoveryState {
  return {
    activeStream: null,
    recoveryAttempts: 0,
    maxRecoveryAttempts,
  };
}

/**
 * Generate a unique stream ID
 */
export function generateStreamId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `stream-${timestamp}-${random}`;
}

/**
 * Start tracking a new stream
 */
export function startStreamTracking(
  state: StreamRecoveryState,
  taskId: string
): StreamRecoveryState {
  const streamId = generateStreamId();
  const now = Date.now();

  const activeStream: ActiveStreamInfo = {
    streamId,
    taskId,
    startedAt: now,
    lastChunkAt: now,
    chunkCount: 0,
    status: 'active',
  };

  const newState = {
    ...state,
    activeStream,
    recoveryAttempts: 0,
    lastError: undefined,
  };

  // Persist to storage for recovery after page reload
  persistStreamState(newState);

  return newState;
}

/**
 * Update stream with new chunk
 */
export function updateStreamChunk(
  state: StreamRecoveryState,
  partialContent?: string
): StreamRecoveryState {
  if (!state.activeStream) return state;

  const updatedStream: ActiveStreamInfo = {
    ...state.activeStream,
    lastChunkAt: Date.now(),
    chunkCount: state.activeStream.chunkCount + 1,
    partialContent: partialContent ?? state.activeStream.partialContent,
  };

  const newState = {
    ...state,
    activeStream: updatedStream,
  };

  // Persist periodically (every 10 chunks) to avoid excessive writes
  if (updatedStream.chunkCount % 10 === 0) {
    persistStreamState(newState);
  }

  return newState;
}

/**
 * Mark stream as completed
 */
export function completeStream(state: StreamRecoveryState): StreamRecoveryState {
  if (!state.activeStream) return state;

  const newState = {
    ...state,
    activeStream: {
      ...state.activeStream,
      status: 'completed' as const,
    },
  };

  // Clear persisted state on completion
  clearPersistedState();

  return {
    ...newState,
    activeStream: null,
  };
}

/**
 * Mark stream as failed with error
 */
export function failStream(
  state: StreamRecoveryState,
  error: string
): StreamRecoveryState {
  const newState: StreamRecoveryState = {
    ...state,
    activeStream: state.activeStream
      ? {
          ...state.activeStream,
          status: 'failed',
        }
      : null,
    lastError: error,
  };

  // Keep persisted state for potential recovery
  persistStreamState(newState);

  return newState;
}

/**
 * Attempt to recover a stream
 */
export function attemptRecovery(
  state: StreamRecoveryState
): { canRecover: boolean; newState: StreamRecoveryState } {
  if (!state.activeStream) {
    return { canRecover: false, newState: state };
  }

  if (state.recoveryAttempts >= state.maxRecoveryAttempts) {
    return {
      canRecover: false,
      newState: {
        ...state,
        activeStream: null,
        lastError: 'Max recovery attempts exceeded',
      },
    };
  }

  // Check if stream is too old
  const now = Date.now();
  if (now - state.activeStream.lastChunkAt > MAX_STREAM_AGE_MS) {
    clearPersistedState();
    return {
      canRecover: false,
      newState: {
        ...state,
        activeStream: null,
        lastError: 'Stream expired',
      },
    };
  }

  const newState: StreamRecoveryState = {
    ...state,
    recoveryAttempts: state.recoveryAttempts + 1,
    activeStream: {
      ...state.activeStream,
      status: 'active',
    },
  };

  persistStreamState(newState);

  return { canRecover: true, newState };
}

/**
 * Check if there's a recoverable stream for a task
 */
export function hasRecoverableStream(taskId: string): boolean {
  const state = loadPersistedState();
  if (!state?.activeStream) return false;

  if (state.activeStream.taskId !== taskId) return false;

  // Check if stream is still valid
  const now = Date.now();
  if (now - state.activeStream.lastChunkAt > MAX_STREAM_AGE_MS) {
    clearPersistedState();
    return false;
  }

  return state.activeStream.status === 'active' || state.activeStream.status === 'paused';
}

/**
 * Get recoverable stream info
 */
export function getRecoverableStream(taskId: string): ActiveStreamInfo | null {
  const state = loadPersistedState();
  if (!state?.activeStream) return null;

  if (state.activeStream.taskId !== taskId) return null;

  const now = Date.now();
  if (now - state.activeStream.lastChunkAt > MAX_STREAM_AGE_MS) {
    clearPersistedState();
    return null;
  }

  return state.activeStream;
}

/**
 * Persist stream state to localStorage
 */
function persistStreamState(state: StreamRecoveryState): void {
  if (typeof window === 'undefined') return;

  try {
    const serialized = JSON.stringify({
      activeStream: state.activeStream,
      recoveryAttempts: state.recoveryAttempts,
      maxRecoveryAttempts: state.maxRecoveryAttempts,
      lastError: state.lastError,
    });
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) {
    console.warn('[StreamRecovery] Failed to persist state:', e);
  }
}

/**
 * Load persisted stream state from localStorage
 */
export function loadPersistedState(): StreamRecoveryState | null {
  if (typeof window === 'undefined') return null;

  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;

    return JSON.parse(serialized) as StreamRecoveryState;
  } catch (e) {
    console.warn('[StreamRecovery] Failed to load persisted state:', e);
    return null;
  }
}

/**
 * Clear persisted stream state
 */
export function clearPersistedState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('[StreamRecovery] Failed to clear persisted state:', e);
  }
}

/**
 * Calculate stream health metrics
 */
export function getStreamHealth(stream: ActiveStreamInfo): {
  durationMs: number;
  chunksPerSecond: number;
  isHealthy: boolean;
  timeSinceLastChunk: number;
} {
  const now = Date.now();
  const durationMs = now - stream.startedAt;
  const durationSec = durationMs / 1000;
  const chunksPerSecond = durationSec > 0 ? stream.chunkCount / durationSec : 0;
  const timeSinceLastChunk = now - stream.lastChunkAt;

  // Stream is unhealthy if no chunks for 30 seconds
  const isHealthy = timeSinceLastChunk < 30000;

  return {
    durationMs,
    chunksPerSecond,
    isHealthy,
    timeSinceLastChunk,
  };
}
