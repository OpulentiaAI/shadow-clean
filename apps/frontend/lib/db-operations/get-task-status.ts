// Stub: Using Convex-native
export type TaskStatusData = {
  status: string;
  initStatus: string;
  initializationError: string | null;
  hasBeenInitialized: boolean;
};

export async function getTaskStatus(taskId: string): Promise<TaskStatusData> {
  console.log(`[STUB] getTaskStatus called for ${taskId} - use Convex query api.tasks.get`);
  throw new Error("Use Convex query api.tasks.get");
}
