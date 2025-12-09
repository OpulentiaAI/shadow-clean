/**
 * Convex Operations - Backend Database Layer
 *
 * This module provides typed wrappers around Convex mutations and queries
 * for backend operations. Replaces Prisma ORM calls with Convex.
 */

import { api } from "../../../../convex/_generated/api";
import type { Id, TableNames } from "../../../../convex/_generated/dataModel";
import { getConvexClient } from "./convex-client";

// ============================================================================
// TASK OPERATIONS
// ============================================================================

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

export async function updateTask(input: {
  taskId: Id<"tasks">;
  title?: string;
  status?: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
  initStatus?: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
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
  codebaseUnderstandingId?: Id<"codebaseUnderstanding">;
}) {
  const client = getConvexClient();
  return client.mutation(api.tasks.update, input);
}

export async function getTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.tasks.get, { taskId });
}

export async function getTaskWithDetails(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.tasks.getWithDetails, { taskId });
}

export async function getTaskStatus(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.tasks.getStatus, { taskId });
}

export async function listTasksByUser(userId: Id<"users">) {
  const client = getConvexClient();
  return client.query(api.tasks.listByUser, { userId });
}

export async function listTasksByUserExcludeArchived(userId: Id<"users">) {
  const client = getConvexClient();
  return client.query(api.tasks.listByUserExcludeArchived, { userId });
}

export async function listTasksScheduledForCleanup(now: number) {
  const client = getConvexClient();
  return client.query(api.tasks.listScheduledForCleanup, { now });
}

export async function countActiveTasksByUser(userId: Id<"users">) {
  const client = getConvexClient();
  return client.query(api.tasks.countActiveByUser, { userId });
}

export async function archiveTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.mutation(api.tasks.archive, { taskId });
}

export async function deleteTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.mutation(api.tasks.remove, { taskId });
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

export async function appendMessage(input: {
  taskId: Id<"tasks">;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  llmModel?: string;
  metadataJson?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  finishReason?: string;
  stackedTaskId?: Id<"tasks">;
}) {
  const client = getConvexClient();
  return client.mutation(api.messages.append, input);
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

export async function listMessagesByTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.messages.byTask, { taskId });
}

export async function getMessage(messageId: Id<"chatMessages">) {
  const client = getConvexClient();
  return client.query(api.messages.get, { messageId });
}

export async function startStreamingMessage(input: {
  taskId: Id<"tasks">;
  llmModel?: string;
  stackedTaskId?: Id<"tasks">;
}) {
  const client = getConvexClient();
  return client.mutation(api.messages.startStreaming, input);
}

export async function appendStreamDelta(input: {
  messageId: Id<"chatMessages">;
  deltaText: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string;
  isFinal: boolean;
  parts?: Array<{
    type: string;
    text?: string;
    data?: unknown;
  }>;
}) {
  const client = getConvexClient();
  return client.mutation(api.messages.appendStreamDelta, input);
}

export async function removeMessagesAfterSequence(taskId: Id<"tasks">, sequence: number) {
  const client = getConvexClient();
  return client.mutation(api.messages.removeAfterSequence, { taskId, sequence });
}

export async function getLatestMessageSequence(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.messages.getLatestSequence, { taskId });
}

export async function removeMessage(messageId: Id<"chatMessages">) {
  const client = getConvexClient();
  return client.mutation(api.messages.remove, { messageId });
}

// ============================================================================
// TODO OPERATIONS
// ============================================================================

export async function createTodo(input: {
  taskId: Id<"tasks">;
  content: string;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  sequence?: number;
}) {
  const client = getConvexClient();
  return client.mutation(api.todos.create, input);
}

export async function updateTodo(input: {
  todoId: Id<"todos">;
  content?: string;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  sequence?: number;
}) {
  const client = getConvexClient();
  return client.mutation(api.todos.update, input);
}

export async function updateTodoStatus(todoId: Id<"todos">, status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") {
  const client = getConvexClient();
  return client.mutation(api.todos.updateStatus, { todoId, status });
}

export async function deleteTodo(todoId: Id<"todos">) {
  const client = getConvexClient();
  return client.mutation(api.todos.remove, { todoId });
}

export async function deleteTodosByTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.mutation(api.todos.removeAllByTask, { taskId });
}

export async function listTodosByTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.todos.byTask, { taskId });
}

export async function bulkCreateTodos(taskId: Id<"tasks">, todos: Array<{ content: string; status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" }>) {
  const client = getConvexClient();
  return client.mutation(api.todos.bulkCreate, { taskId, todos });
}

// ============================================================================
// MEMORY OPERATIONS
// ============================================================================

export async function createMemory(input: {
  content: string;
  category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
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
  category?: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
}) {
  const client = getConvexClient();
  return client.mutation(api.memories.update, input);
}

export async function deleteMemory(memoryId: Id<"memories">) {
  const client = getConvexClient();
  return client.mutation(api.memories.remove, { memoryId });
}

export async function getMemory(memoryId: Id<"memories">) {
  const client = getConvexClient();
  return client.query(api.memories.get, { memoryId });
}

export async function listMemoriesByTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.memories.byTask, { taskId });
}

export async function listMemoriesByUserRepo(userId: Id<"users">, repoFullName: string) {
  const client = getConvexClient();
  return client.query(api.memories.byUserAndRepo, { userId, repoFullName });
}

export async function searchMemories(userId: Id<"users">, repoFullName: string, searchTerm?: string) {
  const client = getConvexClient();
  return client.query(api.memories.search, { userId, repoFullName, searchTerm });
}

// ============================================================================
// USER OPERATIONS
// ============================================================================

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

export async function getUser(userId: Id<"users">) {
  const client = getConvexClient();
  return client.query(api.auth.currentUser, { userId });
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

export async function updateAccountTokens(input: {
  accountId: Id<"accounts">;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}) {
  const client = getConvexClient();
  return client.mutation(api.auth.updateAccountTokens, input);
}

// ============================================================================
// USER SETTINGS OPERATIONS
// ============================================================================

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

// ============================================================================
// CODEBASE UNDERSTANDING OPERATIONS
// ============================================================================

export async function getCodebaseUnderstanding(id: Id<"codebaseUnderstanding">) {
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

// ============================================================================
// REPOSITORY INDEX OPERATIONS
// ============================================================================

export async function getRepositoryIndex(repoFullName: string) {
  const client = getConvexClient();
  return client.query(api.repositoryIndex.get, { repoFullName });
}

export async function upsertRepositoryIndex(repoFullName: string, lastCommitSha?: string) {
  const client = getConvexClient();
  return client.mutation(api.repositoryIndex.upsert, { repoFullName, lastCommitSha });
}

export async function needsReindex(repoFullName: string, currentCommitSha: string) {
  const client = getConvexClient();
  return client.query(api.repositoryIndex.needsReindex, { repoFullName, currentCommitSha });
}

// ============================================================================
// TASK SESSION OPERATIONS
// ============================================================================

export async function createTaskSession(input: {
  taskId: Id<"tasks">;
  podName?: string;
  podNamespace?: string;
  connectionId?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.taskSessions.create, input);
}

export async function endTaskSession(sessionId: Id<"taskSessions">) {
  const client = getConvexClient();
  return client.mutation(api.taskSessions.end, { sessionId });
}

export async function endAllTaskSessions(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.mutation(api.taskSessions.endAllForTask, { taskId });
}

export async function getActiveTaskSession(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.taskSessions.getActiveByTask, { taskId });
}

export async function listTaskSessions(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.taskSessions.listByTask, { taskId });
}

// ============================================================================
// PULL REQUEST SNAPSHOT OPERATIONS
// ============================================================================

export async function createPRSnapshot(input: {
  messageId: Id<"chatMessages">;
  status: "CREATED" | "UPDATED";
  title: string;
  description: string;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  commitSha: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.pullRequestSnapshots.create, input);
}

export async function getLatestPRSnapshotByTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.pullRequestSnapshots.getLatestByTask, { taskId });
}

export async function listTasksByPrAndRepo(pullRequestNumber: number, repoFullName: string) {
  const client = getConvexClient();
  return client.query(api.tasks.listByPrNumberAndRepo, { pullRequestNumber, repoFullName });
}

// ============================================================================
// TOOL CALL OPERATIONS
// ============================================================================

export async function logToolCallRequest(input: {
  taskId: Id<"tasks">;
  messageId?: Id<"chatMessages">; // optional - may not have message context during tool execution
  toolCallId: string;
  toolName: string;
  argsJson: string;
  threadId?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.toolCalls.logRequest, input);
}

export async function markToolCallRunning(toolCallId: Id<"toolCalls">) {
  const client = getConvexClient();
  return client.mutation(api.toolCalls.markRunning, { toolCallId });
}

export async function logToolCallResult(input: {
  toolCallId: Id<"toolCalls">;
  status: "SUCCEEDED" | "FAILED";
  resultJson?: string;
  error?: string;
}) {
  const client = getConvexClient();
  return client.mutation(api.toolCalls.logResult, input);
}

export async function listToolCallsByTask(taskId: Id<"tasks">) {
  const client = getConvexClient();
  return client.query(api.toolCalls.listByTask, { taskId });
}

export async function listToolCallsByMessage(messageId: Id<"chatMessages">) {
  const client = getConvexClient();
  return client.query(api.toolCalls.listByMessage, { messageId });
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Convert string ID to Convex ID type
 * Use this when you have a string taskId from routes/params
 */
export function toConvexId<T extends TableNames>(id: string): Id<T> {
  return id as Id<T>;
}

/**
 * Check if a string is a valid Convex ID format
 */
export function isConvexId(id: string): boolean {
  // Convex IDs are base64-encoded and have a specific format
  return /^[a-zA-Z0-9_-]{20,}$/.test(id);
}
