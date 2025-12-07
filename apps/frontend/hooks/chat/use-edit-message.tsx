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
  const mutationFn = useConvexEditMessage();

  const mutate = ({ taskId, messageId, newContent, newModel }: EditMessageParams) =>
    mutationFn({
      messageId: messageId as Id<"chatMessages">,
      content: newContent,
      llmModel: newModel,
    });

  // Wrap Convex mutation to provide React Query-like interface
  return {
    mutate,
    mutateAsync: mutate,
    isPending: false, // Convex mutations are optimistic, no pending state
  };
}
