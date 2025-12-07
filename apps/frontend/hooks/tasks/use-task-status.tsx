import { useConvexTaskStatus } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import { asConvexId } from "@/lib/convex/id";

export function useTaskStatus(taskId: string) {
  const convexTaskId = asConvexId<"tasks">(taskId);
  const data = useConvexTaskStatus(convexTaskId as Id<"tasks"> | undefined);
  return {
    data:
      data && {
        status: data.status,
        initStatus: data.initStatus,
        initializationError: data.initializationError ?? null,
        hasBeenInitialized: data.hasBeenInitialized,
      },
    isLoading: convexTaskId ? data === undefined : false,
    error: null,
  };
}
