/**
 * Convex Client Service for Sidecar
 *
 * Provides direct Convex access for:
 * - File system change notifications
 * - Tool execution result logging
 * - Workspace state management
 */
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { config } from "../config";
import { logger } from "../utils/logger";
import type { FileSystemEvent } from "@repo/types";

// Singleton Convex client instance
let convexClient: ConvexHttpClient | null = null;

/**
 * Initialize and get the Convex client
 */
export function getConvexClient(): ConvexHttpClient | null {
  if (!config.convexUrl) {
    logger.debug("[CONVEX_CLIENT] No CONVEX_URL configured, skipping initialization");
    return null;
  }

  if (!convexClient) {
    convexClient = new ConvexHttpClient(config.convexUrl);
    logger.info("[CONVEX_CLIENT] Initialized Convex client", {
      url: config.convexUrl,
    });
  }

  return convexClient;
}

/**
 * Convert string taskId to Convex Id type
 */
function toConvexTaskId(taskId: string): Id<"tasks"> {
  return taskId as Id<"tasks">;
}

/**
 * Record a file system change directly to Convex
 */
export async function recordFileChange(event: FileSystemEvent): Promise<boolean> {
  const client = getConvexClient();
  if (!client) {
    logger.debug("[CONVEX_CLIENT] Client not available, skipping file change record");
    return false;
  }

  try {
    await client.mutation(api.fileChanges.create, {
      taskId: toConvexTaskId(event.taskId),
      filePath: event.path,
      operation: mapEventTypeToOperation(event.type),
      additions: 0, // Will be populated by file service if needed
      deletions: 0,
    });

    logger.debug("[CONVEX_CLIENT] File change recorded", {
      taskId: event.taskId,
      path: event.path,
      type: event.type,
    });

    return true;
  } catch (error) {
    logger.error("[CONVEX_CLIENT] Failed to record file change", {
      error: error instanceof Error ? error.message : String(error),
      event,
    });
    return false;
  }
}

/**
 * Map file system event type to Convex operation type
 */
function mapEventTypeToOperation(type: string): "CREATE" | "UPDATE" | "DELETE" | "RENAME" {
  switch (type) {
    case "add":
      return "CREATE";
    case "unlink":
      return "DELETE";
    case "change":
      return "UPDATE";
    case "rename":
      return "RENAME";
    default:
      return "UPDATE";
  }
}

/**
 * Log tool execution start to Convex
 */
export async function logToolStart(
  taskId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<string | null> {
  const client = getConvexClient();
  if (!client) {
    return null;
  }

  try {
    const result = await client.mutation(api.toolLogs.create, {
      taskId: toConvexTaskId(taskId),
      toolName,
      args,
      status: "RUNNING",
    });

    logger.debug("[CONVEX_CLIENT] Tool start logged", {
      taskId,
      toolName,
      logId: result.logId,
    });

    return result.logId as string;
  } catch (error) {
    logger.error("[CONVEX_CLIENT] Failed to log tool start", {
      error: error instanceof Error ? error.message : String(error),
      taskId,
      toolName,
    });
    return null;
  }
}

/**
 * Log tool execution completion to Convex
 */
export async function logToolComplete(
  logId: string,
  result: unknown,
  durationMs: number
): Promise<boolean> {
  const client = getConvexClient();
  if (!client) {
    return false;
  }

  try {
    await client.mutation(api.toolLogs.update, {
      logId: logId as Id<"toolLogs">,
      status: "COMPLETED",
      result,
      durationMs,
    });

    logger.debug("[CONVEX_CLIENT] Tool completion logged", {
      logId,
      durationMs,
    });

    return true;
  } catch (error) {
    logger.error("[CONVEX_CLIENT] Failed to log tool completion", {
      error: error instanceof Error ? error.message : String(error),
      logId,
    });
    return false;
  }
}

/**
 * Log tool execution error to Convex
 */
export async function logToolError(
  logId: string,
  errorMessage: string,
  durationMs: number
): Promise<boolean> {
  const client = getConvexClient();
  if (!client) {
    return false;
  }

  try {
    await client.mutation(api.toolLogs.update, {
      logId: logId as Id<"toolLogs">,
      status: "FAILED",
      error: errorMessage,
      durationMs,
    });

    logger.debug("[CONVEX_CLIENT] Tool error logged", {
      logId,
      errorMessage,
      durationMs,
    });

    return true;
  } catch (error) {
    logger.error("[CONVEX_CLIENT] Failed to log tool error", {
      error: error instanceof Error ? error.message : String(error),
      logId,
    });
    return false;
  }
}

/**
 * Update workspace status in Convex
 */
export async function updateWorkspaceStatus(
  taskId: string,
  status: {
    isHealthy: boolean;
    lastHeartbeat: Date;
    activeProcessCount?: number;
    diskUsageBytes?: number;
  }
): Promise<boolean> {
  const client = getConvexClient();
  if (!client) {
    return false;
  }

  try {
    await client.mutation(api.tasks.updateWorkspaceStatus, {
      taskId: toConvexTaskId(taskId),
      isHealthy: status.isHealthy,
      lastHeartbeat: status.lastHeartbeat.getTime(),
      activeProcessCount: status.activeProcessCount,
      diskUsageBytes: status.diskUsageBytes,
    });

    logger.debug("[CONVEX_CLIENT] Workspace status updated", {
      taskId,
      isHealthy: status.isHealthy,
    });

    return true;
  } catch (error) {
    logger.error("[CONVEX_CLIENT] Failed to update workspace status", {
      error: error instanceof Error ? error.message : String(error),
      taskId,
    });
    return false;
  }
}

/**
 * Stream terminal output to Convex
 */
export async function streamTerminalOutput(
  taskId: string,
  commandId: string,
  output: string,
  streamType: "stdout" | "stderr"
): Promise<boolean> {
  const client = getConvexClient();
  if (!client) {
    return false;
  }

  try {
    await client.mutation(api.terminalOutput.append, {
      taskId: toConvexTaskId(taskId),
      commandId,
      content: output,
      streamType,
      timestamp: Date.now(),
    });

    return true;
  } catch (error) {
    logger.error("[CONVEX_CLIENT] Failed to stream terminal output", {
      error: error instanceof Error ? error.message : String(error),
      taskId,
      commandId,
    });
    return false;
  }
}

/**
 * Check if Convex native mode is enabled
 */
export function isConvexNativeEnabled(): boolean {
  return config.useConvexNative && !!config.convexUrl && !!config.taskId;
}

/**
 * Get the configured task ID
 */
export function getConfiguredTaskId(): string | undefined {
  return config.taskId;
}
