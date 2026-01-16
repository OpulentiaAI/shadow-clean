// Stub: Using Convex-native
export async function updateTaskTitle(
  taskId: string,
  title: string
): Promise<{ success: boolean; task?: unknown; error?: string }> {
  console.log(`[STUB] updateTaskTitle called for ${taskId} - use Convex mutation`);
  return { success: false, error: "Use Convex mutation api.tasks.updateTitle" };
}
