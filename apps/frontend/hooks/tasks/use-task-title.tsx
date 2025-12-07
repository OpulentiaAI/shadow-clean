import {
  useConvexTaskTitle,
  useUpdateTaskTitle as useConvexUpdateTitle,
} from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import { asConvexId } from "@/lib/convex/id";

export function useTaskTitle(taskId: string) {
  const convexTaskId = asConvexId<"tasks">(taskId);
  const data = useConvexTaskTitle(convexTaskId as Id<"tasks"> | undefined);
  return {
    data,
    isLoading: convexTaskId ? data === undefined : false,
    error: null,
  };
}

export function useUpdateTaskTitle() {
  const mutationFn = useConvexUpdateTitle();

  const mutate = ({ taskId, title }: { taskId: string; title: string }) => {
    const convexTaskId = asConvexId<"tasks">(taskId);
    if (!convexTaskId) {
      console.warn("Convex task id missing; skipping title update");
      return Promise.resolve();
    }
    return mutationFn({ taskId: convexTaskId as Id<"tasks">, title });
  };

  // Wrap Convex mutation to provide React Query-like interface
  return {
    mutate,
    mutateAsync: mutate,
    variables: undefined as { taskId: string; title: string } | undefined,
    isPending: false, // Convex mutations are optimistic, no pending state
  };
}
