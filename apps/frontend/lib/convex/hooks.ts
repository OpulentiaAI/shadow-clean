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

export function useAgentGenerateText() {
  return useAction(api.agent.generateText);
}

export function useAgentChat() {
  return useAction(api.agent.chat);
}

export function useAgentAnalyzeCode() {
  return useAction(api.agent.analyzeCode);
}

export function useAgentGenerateCode() {
  return useAction(api.agent.generateCode);
}

export function useAgentExplainError() {
  return useAction(api.agent.explainError);
}

export function useCreateThread() {
  return useAction(api.agent.createThread);
}

export function useContinueThread() {
  return useAction(api.agent.continueThread);
}
