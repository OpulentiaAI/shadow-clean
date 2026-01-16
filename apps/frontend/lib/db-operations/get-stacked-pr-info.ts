// Stub: Using Convex-native
export type StackedPRInfo = {
  id: string;
  title: string;
  status: string;
  shadowBranch: string | null;
} | null;

export async function getStackedPRInfo(taskId: string): Promise<StackedPRInfo> {
  console.log(`[STUB] getStackedPRInfo called for ${taskId} - use Convex query`);
  return null;
}