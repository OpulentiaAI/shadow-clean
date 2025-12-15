import { useQuery } from "@tanstack/react-query";
import { CodebaseWithSummaries } from "@repo/types";
import { useTask } from "./tasks/use-task";

export function useCodebase(taskId: string) {
  const { task } = useTask(taskId);
  const codebaseId = task?.codebaseUnderstandingId;

  return useQuery({
    queryKey: ["codebase", codebaseId],
    queryFn: async (): Promise<CodebaseWithSummaries> => {
      const res = await fetch(`/api/codebases/${codebaseId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData.error || "Failed to fetch codebase";
        throw new Error(message);
      }
      const data = await res.json();
      return data.codebase;
    },
    enabled: !!codebaseId,
    // Don't retry on 404 errors - the codebase doesn't exist
    retry: (failureCount, error) => {
      if (error.message === "Codebase not found") return false;
      return failureCount < 3;
    },
    // Cache stale data for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
}
