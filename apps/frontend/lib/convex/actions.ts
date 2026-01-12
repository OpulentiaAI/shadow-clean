import { getConvexClient, api } from "./client";
import { Id } from "../../../../convex/_generated/dataModel";

type TaskStatus =
  | "STOPPED"
  | "INITIALIZING"
  | "ARCHIVED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED";
type InitStatus =
  | "INACTIVE"
  | "PREPARE_WORKSPACE"
  | "CREATE_VM"
  | "WAIT_VM_READY"
  | "VERIFY_VM_WORKSPACE"
  | "START_BACKGROUND_SERVICES"
  | "INSTALL_DEPENDENCIES"
  | "COMPLETE_SHADOW_WIKI"
  | "ACTIVE";
type MessageRole = "USER" | "ASSISTANT" | "SYSTEM";
type TodoStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
type MemoryCategory =
  | "INFRA"
  | "SETUP"
  | "STYLES"
  | "ARCHITECTURE"
  | "TESTING"
  | "PATTERNS"
  | "BUGS"
  | "PERFORMANCE"
  | "CONFIG"
  | "GENERAL";

export async function createTask(input: {
  title: string;
  repoFullName: string;
  repoUrl: string;
  userId: Id<"users">;
  isScratchpad?: boolean;
  baseBranch?: string;
  baseCommitSha?: string;
  shadowBranch?: string;
  mainModel?: string;
  githubIssueId?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.tasks.create, input);
}

export async function initiateTask(input: {
  taskId: Id<"tasks">;
  message: string;
  model: string;
  userId: Id<"users">;
}) {
  const client = getConvexClient();
  return client.action(api.tasks.initiate, input);
}

export async function updateTask(input: {
  taskId: Id<"tasks">;
  title?: string;
  status?: TaskStatus;
  initStatus?: InitStatus;
  mainModel?: string;
  workspacePath?: string;
  errorMessage?: string;
  initializationError?: string;
  workspaceCleanedUp?: boolean;
  hasBeenInitialized?: boolean;
  pullRequestNumber?: number;
  scheduledCleanupAt?: number;
  shadowBranch?: string;
  baseCommitSha?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.tasks.update, input);
}

export async function updateTaskTitle(taskId: Id<"tasks">, title: string) {
  const client = getConvexClient();
  return client.mutation(api.tasks.updateTitle, { taskId, title });
}

export async function archiveTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.mutation(api.tasks.archive, { taskId });
}

export async function deleteTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.mutation(api.tasks.remove, { taskId });
}

export async function getTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.tasks.get, { taskId });
}

export async function getTaskWithDetails(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.tasks.getWithDetails, { taskId });
}

export async function getTaskTitle(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.tasks.getTitle, { taskId });
}

export async function getTaskStatus(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.tasks.getStatus, { taskId });
}

export async function getStackedPRInfo(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.tasks.getStackedPRInfo, { taskId });
}

export async function listTasks(userId: Id<"users">) {
  const client = getConvexClient();
  return client.query(api.tasks.listByUser, { userId });
}

export async function listTasksExcludeArchived(userId: Id<"users">) {
  const client = getConvexClient();
  return client.query(api.tasks.listByUserExcludeArchived, { userId });
}

export async function countActiveTasks(userId: Id<"users">) {
  const client = getConvexClient();
  return client.query(api.tasks.countActiveByUser, { userId });
}

export async function appendMessage(input: {
  taskId: Id<"tasks">;
  role: MessageRole;
  content: string;
  llmModel?: string;
  metadataJson?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  finishReason?: string;
  stackedTaskId?: Id<"tasks">;
  clientMessageId?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.messages.append, input);
}

export async function savePromptMessage(input: {
  taskId: Id<"tasks">;
  content: string;
  llmModel?: string;
  clientMessageId?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.messages.savePromptMessage, input);
}

export async function updateMessage(input: {
  messageId: Id<"chatMessages">;
  content?: string;
  llmModel?: string;
  metadataJson?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  finishReason?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.messages.update, input);
}

export async function editMessage(input: {
  messageId: Id<"chatMessages">;
  content: string;
  llmModel?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.messages.edit, input);
}

export async function listMessages(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.messages.byTask, { taskId });
}

export async function getMessage(messageId: Id<"chatMessages">) {
  const client = getConvexClient();
  return client.query(api.messages.get, { messageId });
}

export async function createTodo(input: {
  taskId: Id<"tasks">;
  content: string;
  status?: TodoStatus;
  sequence?: number;
}) {
  const client = getConvexClient();
  return client.mutation(api.todos.create, input);
}

export async function updateTodo(input: {
  todoId: Id<"todos">;
  content?: string;
  status?: TodoStatus;
  sequence?: number;
}) {
  const client = getConvexClient();
  return client.mutation(api.todos.update, input);
}

export async function updateTodoStatus(
  todoId: Id<"todos">,
  status: TodoStatus
) {
  const client = getConvexClient();
  return client.mutation(api.todos.updateStatus, { todoId, status });
}

export async function deleteTodo(todoId: Id<"todos">) {
  const client = getConvexClient();
  return client.mutation(api.todos.remove, { todoId });
}

export async function listTodos(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.todos.byTask, { taskId });
}

export async function bulkCreateTodos(
  taskId: Id<"tasks">,
  todos: Array<{ content: string; status?: TodoStatus }>
) {
  const client = getConvexClient();
  return client.mutation(api.todos.bulkCreate, { taskId, todos });
}

export async function createMemory(input: {
  content: string;
  category: MemoryCategory;
  repoFullName: string;
  repoUrl: string;
  userId: Id<"users">;
  taskId: Id<"tasks">;
}) {
  const client = getConvexClient();
  return client.mutation(api.memories.create, input);
}

export async function updateMemory(input: {
  memoryId: Id<"memories">;
  content?: string;
  category?: MemoryCategory;
}) {
  const client = getConvexClient();
  return client.mutation(api.memories.update, input);
}

export async function deleteMemory(memoryId: Id<"memories">) {
  const client = getConvexClient();
  return client.mutation(api.memories.remove, { memoryId });
}

export async function listMemoriesByTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.memories.byTask, { taskId });
}

export async function listMemoriesByUserRepo(
  userId: Id<"users">,
  repoFullName: string
) {
  const client = getConvexClient();
  return client.query(api.memories.byUserAndRepo, { userId, repoFullName });
}

export async function searchMemories(
  userId: Id<"users">,
  repoFullName: string,
  searchTerm?: string
) {
  const client = getConvexClient();
  return client.query(api.memories.search, {
    userId,
    repoFullName,
    searchTerm,
  });
}

export async function upsertUser(input: {
  externalId: string;
  name: string;
  email: string;
  image?: string;
  emailVerified?: boolean;
}) {
  const client = getConvexClient();
  return client.mutation(api.auth.upsertUser, input);
}

export async function getUserByEmail(email: string) {
  const client = getConvexClient();
  return client.query(api.auth.getUserByEmail, { email });
}

export async function getUserByExternalId(externalId: string) {
  const client = getConvexClient();
  return client.query(api.auth.getUserByExternalId, { externalId });
}

export async function getGitHubAccount(userId: Id<"users">) {
  const client = getConvexClient();
  return client.query(api.auth.getGitHubAccount, { userId });
}

export async function syncGitHubAccount(input: {
  userId: Id<"users">;
  accountId: string;
  providerId: string;
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt?: number;
  refreshTokenExpiresAt?: number;
  scope?: string;
  githubInstallationId?: string;
  githubAppConnected?: boolean;
}) {
  const client = getConvexClient();
  return client.mutation(api.auth.createAccount, input);
}

export async function updateGitHubInstallation(input: {
  userId: Id<"users">;
  githubInstallationId?: string;
  githubAppConnected: boolean;
}) {
  const client = getConvexClient();
  return client.mutation(api.auth.updateGitHubInstallation, input);
}

export async function clearGitHubInstallation(userId: Id<"users">) {
  const client = getConvexClient();
  return client.mutation(api.auth.clearGitHubInstallation, { userId });
}

export async function getUserSettings(userId: Id<"users">) {
  const client = getConvexClient();
  return client.query(api.userSettings.get, { userId });
}

export async function getOrCreateUserSettings(userId: Id<"users">) {
  const client = getConvexClient();
  return client.query(api.userSettings.getOrCreate, { userId });
}

export async function updateUserSettings(input: {
  userId: Id<"users">;
  memoriesEnabled?: boolean;
  autoPullRequest?: boolean;
  enableShadowWiki?: boolean;
  enableIndexing?: boolean;
  selectedModels?: string[];
  rules?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.userSettings.update, input);
}

export async function upsertUserSettings(input: {
  userId: Id<"users">;
  memoriesEnabled?: boolean;
  autoPullRequest?: boolean;
  enableShadowWiki?: boolean;
  enableIndexing?: boolean;
  selectedModels?: string[];
  rules?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.userSettings.upsert, input);
}

export async function getRepositoryIndex(repoFullName: string) {
  const client = getConvexClient();
  return client.query(api.repositoryIndex.get, { repoFullName });
}

export async function upsertRepositoryIndex(
  repoFullName: string,
  lastCommitSha?: string
) {
  const client = getConvexClient();
  return client.mutation(api.repositoryIndex.upsert, {
    repoFullName,
    lastCommitSha,
  });
}

export async function needsReindex(
  repoFullName: string,
  currentCommitSha: string
) {
  const client = getConvexClient();
  return client.query(api.repositoryIndex.needsReindex, {
    repoFullName,
    currentCommitSha,
  });
}

export async function getCodebaseUnderstanding(
  id: Id<"codebaseUnderstanding">
) {
  const client = getConvexClient();
  return client.query(api.codebaseUnderstanding.get, { id });
}

export async function getCodebaseByRepo(repoFullName: string) {
  const client = getConvexClient();
  return client.query(api.codebaseUnderstanding.getByRepo, { repoFullName });
}

export async function getCodebaseByTaskId(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.codebaseUnderstanding.getByTaskId, { taskId });
}

export async function createCodebaseUnderstanding(input: {
  repoFullName: string;
  repoUrl: string;
  content: unknown;
  userId: Id<"users">;
}) {
  const client = getConvexClient();
  return client.mutation(api.codebaseUnderstanding.create, input);
}

export async function agentGenerateText(input: {
  prompt: string;
  threadId?: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
}) {
  const client = getConvexClient();
  return client.action(api.agent.generateText, input);
}

export async function agentChat(input: {
  taskId: Id<"tasks">;
  message: string;
  model?: string;
  threadId?: string;
}) {
  const client = getConvexClient();
  return client.action(api.agent.chat, input);
}

export async function agentAnalyzeCode(input: {
  code: string;
  language?: string;
  question?: string;
}) {
  const client = getConvexClient();
  return client.action(api.agent.analyzeCode, input);
}

export async function agentGenerateCode(input: {
  description: string;
  language: string;
  context?: string;
}) {
  const client = getConvexClient();
  return client.action(api.agent.generateCode, input);
}

export async function agentExplainError(input: {
  error: string;
  code?: string;
  language?: string;
}) {
  const client = getConvexClient();
  return client.action(api.agent.explainError, input);
}

export async function executeTaskWithTools(input: {
  taskId: Id<"tasks">;
  message: string;
  model?: string;
  threadId?: string;
}) {
  const client = getConvexClient();
  return client.action(api.agent.executeTaskWithTools, input);
}

export async function streamTaskWithTools(input: {
  taskId: Id<"tasks">;
  message: string;
  model?: string;
  threadId?: string;
}) {
  const client = getConvexClient();
  return client.action(api.agent.streamTaskWithTools, input);
}

// File Changes (sidecar Convex-native)
export async function listFileChanges(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.fileChanges.byTask, { taskId });
}

export async function listFileChangesSince(taskId: Id<"tasks">, since: number) {
  const client = getConvexClient();
  return client.query(api.fileChanges.byTaskSince, { taskId, since });
}

export async function getFileChangeStats(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.fileChanges.getStats, { taskId });
}

// Tool Logs (sidecar Convex-native)
export async function listToolLogs(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.toolLogs.byTask, { taskId });
}

export async function listRecentToolLogs(taskId: Id<"tasks">, limit?: number) {
  const client = getConvexClient();
  return client.query(api.toolLogs.recentByTask, { taskId, limit });
}

export async function listRunningToolLogs(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.toolLogs.runningByTask, { taskId });
}

export async function getToolLogStats(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.toolLogs.getStats, { taskId });
}

// Terminal Output (sidecar Convex-native)
export async function listTerminalOutputByTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.terminalOutput.byTask, { taskId });
}

export async function listTerminalOutputByCommand(commandId: string) {
  const client = getConvexClient();
  return client.query(api.terminalOutput.byCommand, { commandId });
}

export async function getCombinedTerminalOutput(commandId: string) {
  const client = getConvexClient();
  return client.query(api.terminalOutput.getCombinedOutput, { commandId });
}

// Workspace Status
export async function getWorkspaceStatus(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.tasks.getWorkspaceStatus, { taskId });
}

// Streaming Actions (Phase 2)
export async function streamChat(input: {
  taskId: Id<"tasks">;
  prompt: string;
  model: string;
  systemPrompt?: string;
  llmModel?: string;
  apiKeys: {
    anthropic?: string;
    openai?: string;
    openrouter?: string;
    nvidia?: string;
    fireworks?: string;
    exa?: string;
  };
}) {
  const client = getConvexClient();
  return client.action(api.streaming.streamChat, input);
}

export async function streamChatWithTools(input: {
  taskId: Id<"tasks">;
  prompt: string;
  model: string;
  systemPrompt?: string;
  llmModel?: string;
  promptMessageId?: Id<"chatMessages">; // Pass to prevent duplicate user message creation
  clientMessageId?: string; // For idempotency across retries
  tools?: Array<{
    name: string;
    description: string;
    parameters: any;
  }>;
  apiKeys: {
    anthropic?: string;
    openai?: string;
    openrouter?: string;
    nvidia?: string;
    fireworks?: string;
    exa?: string;
  };
}) {
  const client = getConvexClient();
  return client.action(api.streaming.streamChatWithTools, input);
}

export async function cancelStream(messageId: Id<"chatMessages">) {
  const client = getConvexClient();
  return client.action(api.streaming.cancelStream, { messageId });
}

export async function resumeStream(input: {
  taskId: Id<"tasks">;
  fromMessageId: Id<"chatMessages">;
  prompt: string;
  model: string;
  systemPrompt?: string;
  llmModel?: string;
  apiKeys: {
    anthropic?: string;
    openai?: string;
    openrouter?: string;
    nvidia?: string;
    fireworks?: string;
    exa?: string;
  };
}) {
  const client = getConvexClient();
  return client.action(api.streaming.resumeStream, input);
}

// Presence Actions (Phase 2)
export async function updatePresence(input: {
  taskId: Id<"tasks">;
  userId: Id<"users">;
  userName: string;
  userImage?: string;
  cursor?: { x: number; y: number };
  selection?: { start: number; end: number; filePath?: string };
  activity?: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
}) {
  const client = getConvexClient();
  return client.mutation(api.presence.updatePresence, input);
}

export async function getActiveUsers(taskId: Id<"tasks">, timeoutMs?: number) {
  const client = getConvexClient();
  return client.query(api.presence.getActiveUsers, { taskId, timeoutMs });
}

export async function removePresence(taskId: Id<"tasks">, userId: Id<"users">) {
  const client = getConvexClient();
  return client.mutation(api.presence.removePresence, { taskId, userId });
}

export async function broadcastActivity(input: {
  taskId: Id<"tasks">;
  userId: Id<"users">;
  activityType:
    | "user-joined"
    | "user-left"
    | "file-opened"
    | "file-saved"
    | "command-started"
    | "command-completed";
  metadata?: any;
}) {
  const client = getConvexClient();
  return client.mutation(api.presence.broadcastActivity, input);
}

export async function getRecentActivities(taskId: Id<"tasks">, limit?: number) {
  const client = getConvexClient();
  return client.query(api.presence.getRecentActivities, { taskId, limit });
}

// Tool Call Tracking (Phase 2)
export async function listToolCallsByMessage(messageId: Id<"chatMessages">) {
  const client = getConvexClient();
  return client.query(api.toolCallTracking.byMessage, { messageId });
}

export async function listToolCallsByTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.toolCallTracking.byTask, { taskId });
}

export async function getToolCallById(toolCallId: string) {
  const client = getConvexClient();
  return client.query(api.toolCallTracking.byToolCallId, { toolCallId });
}

export async function storeGitHubFileTree(
  taskId: Id<"tasks">,
  files: Array<{ path: string; type: string; size?: number }>
) {
  const client = getConvexClient();
  return client.mutation(api.files.storeGitHubFileTree, { taskId, files });
}
