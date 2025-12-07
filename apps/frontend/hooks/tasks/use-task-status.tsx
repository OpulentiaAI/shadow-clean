import { useConvexTaskStatus } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useTaskStatus(taskId: string) {
  const data = useConvexTaskStatus(taskId as Id<"tasks">);
  return {
    data:
      data && {
        status: data.status,
        initStatus: data.initStatus,
        initializationError: data.initializationError ?? null,
        hasBeenInitialized: data.hasBeenInitialized,
      },
    isLoading: data === undefined,
    error: null,
  };
}
