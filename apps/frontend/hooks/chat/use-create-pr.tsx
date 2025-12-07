import { useCreatePullRequestAction } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import { asConvexId } from "@/lib/convex/id";

interface CreatePRResponse {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  messageId?: string;
  error?: string;
}

export function useCreatePR() {
  const mutationFn = useCreatePullRequestAction();

  const mutate = (taskId: string): Promise<CreatePRResponse> => {
    const convexTaskId = asConvexId<"tasks">(taskId);
    if (!convexTaskId) {
      return Promise.resolve({
        success: false,
        error: "Convex task id unavailable",
      });
    }
    return mutationFn({ taskId: convexTaskId as Id<"tasks"> }) as Promise<CreatePRResponse>;
  };

  // Wrap Convex action to provide React Query-like interface
  return {
    mutate,
    mutateAsync: mutate,
    isPending: false, // Convex actions don't have built-in pending state
  };
}
