import { useConvexMessages } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Message } from "@repo/types";
import { asConvexId } from "@/lib/convex/id";

function mapMessage(doc: any): Message {
  return {
    id: doc._id,
    role: doc.role.toLowerCase(),
    content: doc.content,
    llmModel: doc.llmModel ?? "",
    createdAt: new Date(doc.createdAt).toISOString(),
    metadata: doc.metadataJson ? JSON.parse(doc.metadataJson) : undefined,
    pullRequestSnapshot: doc.pullRequestSnapshot ?? undefined,
    stackedTaskId: doc.stackedTaskId ?? undefined,
    stackedTask: doc.stackedTask
      ? {
          id: doc.stackedTask.id,
          title: doc.stackedTask.title,
          shadowBranch: doc.stackedTask.shadowBranch ?? undefined,
          status: doc.stackedTask.status ?? undefined,
        }
      : undefined,
  };
}

export function useTaskMessages(taskId: string) {
  const convexTaskId = asConvexId<"tasks">(taskId);
  const data = useConvexMessages(convexTaskId as Id<"tasks"> | undefined);
  const mapped = data?.map(mapMessage) ?? [];
  return {
    data: mapped,
    isLoading: convexTaskId ? data === undefined : false,
    error: null as Error | null,
  };
}
