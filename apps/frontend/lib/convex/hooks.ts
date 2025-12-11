"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export function useConvexTask(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.tasks.get, taskId ? { taskId } : "skip");
}

export function useConvexTaskWithDetails(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.tasks.getWithDetails, taskId ? { taskId } : "skip");
}

export function useConvexTaskTitle(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.tasks.getTitle, taskId ? { taskId } : "skip");
}

export function useConvexTaskStatus(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.tasks.getStatus, taskId ? { taskId } : "skip");
}

export function useConvexStackedPRInfo(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.tasks.getStackedPRInfo, taskId ? { taskId } : "skip");
}

export function useConvexTasks(userId: Id<"users"> | undefined) {
  return useQuery(api.tasks.listByUser, userId ? { userId } : "skip");
}

export function useConvexTasksExcludeArchived(userId: Id<"users"> | undefined) {
  return useQuery(api.tasks.listByUserExcludeArchived, userId ? { userId } : "skip");
}

export function useConvexActiveTaskCount(userId: Id<"users"> | undefined) {
  return useQuery(api.tasks.countActiveByUser, userId ? { userId } : "skip");
}

export function useCreateTask() {
  return useMutation(api.tasks.create);
}

export function useUpdateTask() {
  return useMutation(api.tasks.update);
}

export function useUpdateTaskTitle() {
  return useMutation(api.tasks.updateTitle);
}

export function useArchiveTask() {
  return useMutation(api.tasks.archive);
}

export function useDeleteTask() {
  return useMutation(api.tasks.remove);
}

// Explicit return type to avoid non-portable inferred type from ReturnType<typeof action>
export function useTaskDetailsAction(): (args: { taskId: Id<"tasks"> }) => Promise<any> {
  return useAction(api.tasksNode.getDetails) as any;
}

export function useCreatePullRequestAction() {
  return useAction(api.tasksNode.createPullRequest);
}

export function useConvexMessages(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.messages.byTask, taskId ? { taskId } : "skip");
}

export function useConvexMessage(messageId: Id<"chatMessages"> | undefined) {
  return useQuery(api.messages.get, messageId ? { messageId } : "skip");
}

export function useAppendMessage() {
  return useMutation(api.messages.append);
}

export function useUpdateMessage() {
  return useMutation(api.messages.update);
}

export function useEditMessage() {
  return useMutation(api.messages.edit);
}

export function useDeleteMessage() {
  return useMutation(api.messages.remove);
}

export function useConvexTodos(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.todos.byTask, taskId ? { taskId } : "skip");
}

export function useCreateTodo() {
  return useMutation(api.todos.create);
}

export function useUpdateTodo() {
  return useMutation(api.todos.update);
}

export function useUpdateTodoStatus() {
  return useMutation(api.todos.updateStatus);
}

export function useDeleteTodo() {
  return useMutation(api.todos.remove);
}

export function useBulkCreateTodos() {
  return useMutation(api.todos.bulkCreate);
}

export function useReorderTodo() {
  return useMutation(api.todos.reorder);
}

export function useConvexMemoriesByTask(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.memories.byTask, taskId ? { taskId } : "skip");
}

export function useConvexMemoriesByUserRepo(
  userId: Id<"users"> | undefined,
  repoFullName: string | undefined
) {
  return useQuery(
    api.memories.byUserAndRepo,
    userId && repoFullName ? { userId, repoFullName } : "skip"
  );
}

export function useSearchMemories(
  userId: Id<"users"> | undefined,
  repoFullName: string | undefined,
  searchTerm?: string
) {
  return useQuery(
    api.memories.search,
    userId && repoFullName ? { userId, repoFullName, searchTerm } : "skip"
  );
}

export function useCreateMemory() {
  return useMutation(api.memories.create);
}

export function useUpdateMemory() {
  return useMutation(api.memories.update);
}

export function useDeleteMemory() {
  return useMutation(api.memories.remove);
}

export function useConvexUser(userId: Id<"users"> | undefined) {
  return useQuery(api.auth.currentUser, userId ? { userId } : "skip");
}

export function useConvexUserByEmail(email: string | undefined) {
  return useQuery(api.auth.getUserByEmail, email ? { email } : "skip");
}

export function useConvexUserByExternalId(externalId: string | undefined) {
  return useQuery(api.auth.getUserByExternalId, externalId ? { externalId } : "skip");
}

export function useUpsertUser() {
  return useMutation(api.auth.upsertUser);
}

export function useConvexGitHubAccount(userId: Id<"users"> | undefined) {
  return useQuery(api.auth.getGitHubAccount, userId ? { userId } : "skip");
}

export function useUpdateGitHubInstallation() {
  return useMutation(api.auth.updateGitHubInstallation);
}

export function useClearGitHubInstallation() {
  return useMutation(api.auth.clearGitHubInstallation);
}

export function useConvexUserSettings(userId: Id<"users"> | undefined) {
  return useQuery(api.userSettings.get, userId ? { userId } : "skip");
}

export function useConvexUserSettingsOrCreate(userId: Id<"users"> | undefined) {
  return useQuery(api.userSettings.getOrCreate, userId ? { userId } : "skip");
}

export function useUpdateUserSettings() {
  return useMutation(api.userSettings.update);
}

export function useUpsertUserSettings() {
  return useMutation(api.userSettings.upsert);
}

export function useConvexRepositoryIndex(repoFullName: string | undefined) {
  return useQuery(api.repositoryIndex.get, repoFullName ? { repoFullName } : "skip");
}

export function useUpsertRepositoryIndex() {
  return useMutation(api.repositoryIndex.upsert);
}

export function useNeedsReindex(repoFullName: string | undefined, currentCommitSha: string | undefined) {
  return useQuery(
    api.repositoryIndex.needsReindex,
    repoFullName && currentCommitSha ? { repoFullName, currentCommitSha } : "skip"
  );
}

export function useConvexCodebase(id: Id<"codebaseUnderstanding"> | undefined) {
  return useQuery(api.codebaseUnderstanding.get, id ? { id } : "skip");
}

export function useConvexCodebaseByRepo(repoFullName: string | undefined) {
  return useQuery(api.codebaseUnderstanding.getByRepo, repoFullName ? { repoFullName } : "skip");
}

export function useConvexCodebaseByTaskId(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.codebaseUnderstanding.getByTaskId, taskId ? { taskId } : "skip");
}

export function useCreateCodebaseUnderstanding() {
  return useMutation(api.codebaseUnderstanding.create);
}

export function useUpdateCodebaseUnderstanding() {
  return useMutation(api.codebaseUnderstanding.update);
}

// Explicit return types to avoid non-portable inferred types from ReturnType<typeof action>
export function useAgentGenerateText(): (args: any) => Promise<any> {
  return useAction(api.agent.generateText) as any;
}

export function useAgentChat(): (args: any) => Promise<any> {
  return useAction(api.agent.chat) as any;
}

export function useAgentAnalyzeCode(): (args: any) => Promise<any> {
  return useAction(api.agent.analyzeCode) as any;
}

export function useAgentGenerateCode(): (args: any) => Promise<any> {
  return useAction(api.agent.generateCode) as any;
}

export function useAgentExplainError(): (args: any) => Promise<any> {
  return useAction(api.agent.explainError) as any;
}

export function useCreateThread(): (args: any) => Promise<any> {
  return useAction(api.agent.createThread) as any;
}

export function useContinueThread(): (args: any) => Promise<any> {
  return useAction(api.agent.continueThread) as any;
}

export function useStreamText(): (args: any) => Promise<any> {
  return useAction(api.agent.agentStreamText) as any;
}

export function useExecuteTaskWithTools(): (args: any) => Promise<any> {
  return useAction(api.agent.executeTaskWithTools) as any;
}

export function useStreamTaskWithTools(): (args: any) => Promise<any> {
  return useAction(api.agent.streamTaskWithTools) as any;
}

export function useStartStreamingMessage() {
  return useMutation(api.messages.startStreaming);
}

export function useAppendStreamDelta() {
  return useMutation(api.messages.appendStreamDelta);
}

// File Changes hooks (sidecar Convex-native)
export function useConvexFileChanges(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.fileChanges.byTask, taskId ? { taskId } : "skip");
}

export function useConvexRecentFileChanges(taskId: Id<"tasks"> | undefined, limit?: number) {
  return useQuery(api.fileChanges.byTaskSince, taskId ? { taskId, since: Date.now() - 3600000 } : "skip");
}

export function useConvexFileChangeStats(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.fileChanges.getStats, taskId ? { taskId } : "skip");
}

// Tool Logs hooks (sidecar Convex-native)
export function useConvexToolLogs(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.toolLogs.byTask, taskId ? { taskId } : "skip");
}

export function useConvexRecentToolLogs(taskId: Id<"tasks"> | undefined, limit?: number) {
  return useQuery(api.toolLogs.recentByTask, taskId ? { taskId, limit } : "skip");
}

export function useConvexRunningToolLogs(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.toolLogs.runningByTask, taskId ? { taskId } : "skip");
}

export function useConvexToolStats(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.toolLogs.getStats, taskId ? { taskId } : "skip");
}

// Terminal Output hooks (sidecar Convex-native)
export function useConvexTerminalOutputByTask(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.terminalOutput.byTask, taskId ? { taskId } : "skip");
}

export function useConvexTerminalOutputByCommand(commandId: string | undefined) {
  return useQuery(api.terminalOutput.byCommand, commandId ? { commandId } : "skip");
}

export function useConvexCombinedTerminalOutput(commandId: string | undefined) {
  return useQuery(api.terminalOutput.getCombinedOutput, commandId ? { commandId } : "skip");
}

// Workspace Status hooks (sidecar Convex-native)
export function useConvexWorkspaceStatus(taskId: Id<"tasks"> | undefined) {
  return useQuery(api.tasks.getWorkspaceStatus, taskId ? { taskId } : "skip");
}
