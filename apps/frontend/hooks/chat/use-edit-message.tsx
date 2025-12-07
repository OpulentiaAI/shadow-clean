import { useEditMessage as useConvexEditMessage } from "@/lib/convex/hooks";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ModelType } from "@repo/types";

interface EditMessageParams {
  taskId: string;
  messageId: string;
  newContent: string;
  newModel: ModelType;
}

export function useEditMessage() {
  const mutate = useConvexEditMessage();
  return {
    mutate: ({ taskId, messageId, newContent, newModel }: EditMessageParams) =>
      mutate({
        messageId: messageId as Id<"chatMessages">,
        content: newContent,
        llmModel: newModel,
      }),
  };
}
