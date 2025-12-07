import { getConvexClient } from "./client";

export async function createTask(input: {
  title: string;
  repoFullName: string;
  repoUrl: string;
  userId: string;
}) {
  const client = getConvexClient();
  return client.mutation("tasks:create", {
    ...input,
    isScratchpad: false,
    baseBranch: "main",
    baseCommitSha: "",
    shadowBranch: "",
  });
}

export async function appendMessage(input: {
  taskId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
}) {
  const client = getConvexClient();
  return client.mutation("messages:append", {
    ...input,
    llmModel: "gpt-4o-mini",
  });
}

export async function listMessages(taskId: string) {
  const client = getConvexClient();
  return client.query("messages:byTask", { taskId });
}

