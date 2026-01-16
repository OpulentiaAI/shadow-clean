// Stub: Using Convex-native - archive via Convex mutations
export async function archiveTask(
  taskId: string
): Promise<{ success: boolean; task?: unknown; error?: string }> {
  console.log(`[STUB] archiveTask called for ${taskId} - use Convex mutation`);
  return { success: false, error: "Use Convex mutation api.tasks.archive" };
}