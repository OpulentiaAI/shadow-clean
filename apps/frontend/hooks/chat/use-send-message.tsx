import { useAppendMessage } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ModelType } from "@repo/types";

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
    }) =>
      mutate({
        taskId: taskId as Id<"tasks">,
        role: "USER",
        content: message.trim(),
        llmModel: model,
      }),
  };
}
