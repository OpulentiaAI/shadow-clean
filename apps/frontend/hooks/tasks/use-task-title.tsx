import { useConvexTaskTitle, useUpdateTaskTitle as useConvexUpdateTitle } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useTaskTitle(taskId: string) {
  const data = useConvexTaskTitle(taskId as Id<"tasks">);
  return {
    data,
    isLoading: data === undefined,
    error: null,
  };
}

export function useUpdateTaskTitle() {
  const mutate = useConvexUpdateTitle();
  return mutate;
}
