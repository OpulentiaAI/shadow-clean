import { useConvexStackedPRInfo } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { TaskStatus } from "@repo/types";
import { asConvexId } from "@/lib/convex/id";

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
  const convexTaskId = asConvexId<"tasks">(taskId);
  const data = useConvexStackedPRInfo(convexTaskId as Id<"tasks"> | undefined);
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
    isLoading: convexTaskId ? data === undefined : false,
    error: null,
  };
}
