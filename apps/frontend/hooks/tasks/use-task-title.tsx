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
  const mutate = useConvexUpdateTitle();
  return mutate;
}
