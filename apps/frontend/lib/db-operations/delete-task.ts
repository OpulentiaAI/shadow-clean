// Stub: Using Convex-native - delete via Convex mutations
export async function deleteTask(
  taskId: string
): Promise<{ success: boolean; task?: unknown; error?: string }> {
  console.log(`[STUB] deleteTask called for ${taskId} - use Convex mutation`);
  return { success: false, error: "Use Convex mutation api.tasks.remove" };
}