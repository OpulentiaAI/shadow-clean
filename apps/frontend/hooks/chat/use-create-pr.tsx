import { useCreatePullRequestAction } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";

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
    mutate: (taskId: string): Promise<CreatePRResponse> =>
      mutate({ taskId: taskId as Id<"tasks"> }) as Promise<CreatePRResponse>,
  };
}
