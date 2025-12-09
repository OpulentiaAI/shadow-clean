import { TaskStatus, InitStatus } from "@repo/db";
import { emitTaskStatusUpdate } from "../socket";
import config from "@/config";
import { updateTask, toConvexId } from "../lib/convex-operations";

/**
 * Updates a task's status in the database and emits a real-time update
 * @param taskId - The task ID to update
 * @param status - The new status for the task
 * @param context - Optional context for logging (e.g., "CHAT", "SOCKET", "INIT")
 */
export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  context?: string,
  errorMessage?: string
): Promise<void> {
  try {
    await updateTask({
      taskId: toConvexId<"tasks">(taskId),
      status: status as "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED",
      errorMessage:
        status === "FAILED" ? errorMessage || "Unknown error" : undefined,
    });

    // Log the status change
    const logPrefix = context ? `[${context}]` : "[TASK]";
    const errorSuffix = errorMessage ? ` (error: ${errorMessage})` : "";
    console.log(
      `${logPrefix} Task ${taskId} status updated to ${status}${errorSuffix}`
    );

    // Emit real-time update to all connected clients
    emitTaskStatusUpdate(taskId, status);
  } catch (error) {
    console.error(
      `Failed to update task ${taskId} status to ${status}:`,
      error
    );
    throw error;
  }
}

/**
 * Set task initialization status
 */
export async function setInitStatus(
  taskId: string,
  status: InitStatus
): Promise<void> {
  await updateTask({
    taskId: toConvexId<"tasks">(taskId),
    initStatus: status as "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE",
    initializationError: undefined, // Clear any previous errors
  });
}

/**
 * Set task as completed with final step
 */
export async function setTaskCompleted(
  taskId: string,
  status: InitStatus
): Promise<void> {
  await updateTask({
    taskId: toConvexId<"tasks">(taskId),
    initStatus: status as "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE",
    initializationError: undefined,
  });
}

/**
 * Set task as failed with error message
 */
export async function setTaskFailed(
  taskId: string,
  step: InitStatus,
  error: string
): Promise<void> {
  await updateTask({
    taskId: toConvexId<"tasks">(taskId),
    initStatus: step as "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE",
    initializationError: error,
  });
}

/**
 * Clear task progress (reset to not started state)
 */
export async function clearTaskProgress(taskId: string): Promise<void> {
  await updateTask({
    taskId: toConvexId<"tasks">(taskId),
    initStatus: "INACTIVE",
    initializationError: undefined,
  });
}

/**
 * Updates a task's updatedAt timestamp to reflect recent activity
 * Note: Convex automatically updates _creationTime on document creation.
 * For activity tracking, we'll use a dedicated field if needed.
 * @param taskId - The task ID to update
 * @param context - Optional context for logging (e.g., "MESSAGE", "CHAT", "TOOL")
 */
export async function updateTaskActivity(
  taskId: string,
  context?: string
): Promise<void> {
  try {
    // Convex handles timestamps automatically, but we log the activity
    const logPrefix = context ? `[${context}]` : "[ACTIVITY]";
    console.log(`${logPrefix} Task ${taskId} activity timestamp updated`);
  } catch (error) {
    console.error(`Failed to update task ${taskId} activity timestamp:`, error);
  }
}

/**
 * Schedule task for cleanup (remote mode only)
 */
export async function scheduleTaskCleanup(
  taskId: string,
  delayMinutes: number
): Promise<void> {
  if (config.nodeEnv !== "production") {
    console.log(
      `[TASK_CLEANUP] Skipping cleanup (non-production mode): ${taskId}`
    );
    return;
  }

  const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  try {
    await updateTask({
      taskId: toConvexId<"tasks">(taskId),
      scheduledCleanupAt: scheduledAt.getTime(),
    });

    console.log(
      `[TASK_CLEANUP] Task ${taskId} scheduled for cleanup at ${scheduledAt.toISOString()}`
    );
  } catch (error) {
    console.error(`Failed to schedule cleanup for task ${taskId}:`, error);
  }
}

/**
 * Cancel scheduled cleanup for a task
 */
export async function cancelTaskCleanup(taskId: string): Promise<void> {
  await updateTask({
    taskId: toConvexId<"tasks">(taskId),
    scheduledCleanupAt: undefined,
  });

  console.log(`[TASK_CLEANUP] Cancelled cleanup for task ${taskId}`);
}

/**
 * Mark task as having been initialized for the first time
 */
export async function setTaskInitialized(taskId: string): Promise<void> {
  await updateTask({
    taskId: toConvexId<"tasks">(taskId),
    hasBeenInitialized: true,
  });

  console.log(`[TASK_STATUS] Task ${taskId} marked as initialized`);
}
