import { useAppendMessage } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ModelType } from "@repo/types";
import { asConvexId } from "@/lib/convex/id";

export function useSendMessage() {
  const mutate = useAppendMessage();

  return {
    mutate: ({
      taskId,
      message,
      model,
    }: {
      taskId: string;
      message: string;
      model: ModelType;
    }) => {
      const convexTaskId = asConvexId<"tasks">(taskId);
      if (!convexTaskId) {
        console.warn("Convex task id missing; skipping message append");
        return Promise.resolve();
      }
      return mutate({
        taskId: convexTaskId as Id<"tasks">,
        role: "USER",
        content: message.trim(),
        llmModel: model,
      });
    },
    isPending: false,
  };
}
