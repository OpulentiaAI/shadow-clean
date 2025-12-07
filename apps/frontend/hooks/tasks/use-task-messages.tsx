import { useConvexMessages } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Message } from "@repo/types";

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
  const data = useConvexMessages(taskId as Id<"tasks">);
  const mapped = data?.map(mapMessage) ?? [];
  return {
    data: mapped,
    isLoading: data === undefined,
    error: null,
  };
}
