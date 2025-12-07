import { useConvexStackedPRInfo } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { TaskStatus } from "@repo/types";

type InitialStackedPRData = {
  id: string;
  title: string;
  shadowBranch?: string;
  status?: TaskStatus;
};

export function useStackedPRInfo(
  taskId: string,
  initialData?: InitialStackedPRData
) {
  const data = useConvexStackedPRInfo(taskId as Id<"tasks">);
  const merged =
    data ||
    (initialData && {
      id: initialData.id,
      title: initialData.title,
      status: initialData.status || "INITIALIZING",
      shadowBranch: initialData.shadowBranch || null,
    }) ||
    null;

  return {
    data: merged,
    isLoading: data === undefined,
    error: null,
  };
}
