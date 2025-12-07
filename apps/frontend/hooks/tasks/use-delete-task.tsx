import { useDeleteTask as useConvexDeleteTask } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import { asConvexId } from "@/lib/convex/id";

export function useDeleteTask() {
  const mutationFn = useConvexDeleteTask();

  const mutate = (taskId: string) => {
    const convexTaskId = asConvexId<"tasks">(taskId);
    if (!convexTaskId) {
      console.warn("Convex task id missing; skipping delete");
      return Promise.resolve();
    }
    return mutationFn({ taskId: convexTaskId as Id<"tasks"> });
  };

  // Wrap Convex mutation to provide React Query-like interface
  return {
    mutate,
    mutateAsync: mutate,
    isPending: false, // Convex mutations are optimistic, no pending state
  };
}
