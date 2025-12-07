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
  const mutate = useCreatePullRequestAction();
  return {
    mutate: (taskId: string): Promise<CreatePRResponse> => {
      const convexTaskId = asConvexId<"tasks">(taskId);
      if (!convexTaskId) {
        return Promise.resolve({
          success: false,
          error: "Convex task id unavailable",
        });
      }
      return mutate({ taskId: convexTaskId as Id<"tasks"> }) as Promise<CreatePRResponse>;
    },
  };
}
