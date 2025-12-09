import { type Message } from "@repo/types";
import { getConvexClient, api } from "../convex/client";

export async function getTaskMessages(taskId: string): Promise<Message[]> {
  try {
    const client = getConvexClient();
    const convexTaskId = taskId as any;
    const messages = await client.query(api.messages.byTask, {
      taskId: convexTaskId,
    });

    const finalMessages: Message[] = messages.map((msg: any) => ({
      id: (msg._id ?? "").toString(),
      role: (msg.role?.toLowerCase?.() ?? "assistant") as
        | "user"
        | "assistant"
        | "system",
      content: msg.content ?? "",
      createdAt: msg.createdAt
        ? new Date(msg.createdAt).toISOString()
        : new Date(0).toISOString(),
      llmModel: msg.llmModel ?? "",
      metadata: (msg.metadataJson && JSON.parse(msg.metadataJson)) || {
        isStreaming: false,
      },
      pullRequestSnapshot: msg.pullRequestSnapshot || undefined,
      stackedTaskId: msg.stackedTaskId
        ? msg.stackedTaskId.toString()
        : undefined,
      stackedTask: msg.stackedTask
        ? {
            id: msg.stackedTask.id,
            title: msg.stackedTask.title,
            shadowBranch: msg.stackedTask.shadowBranch ?? undefined,
            status: msg.stackedTask.status ?? undefined,
          }
        : undefined,
    }));

    return finalMessages;
  } catch (err) {
    console.error("Failed to fetch task messages", err);
    return [];
  }
}
