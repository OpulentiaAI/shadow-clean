import {
  Message,
  MessageMetadata,
  ModelType,
  ApiKeys,
  QueuedActionUI,
  generateTaskId,
} from "@repo/types";
import { randomUUID } from "crypto";
import { LLMService } from "./llm";
import { getSystemPrompt, getShadowWikiMessage } from "./system-prompt";
import { createTools, stopMCPManager } from "./tools";
import type { ToolSet } from "ai";
import { GitManager } from "../services/git-manager";
import { PRManager } from "../services/pr-manager";
import { modelContextService } from "../services/model-context-service";
import { TaskModelContext } from "../services/task-model-context";
import { checkpointService } from "../services/checkpoint-service";
import { generateTaskTitleAndBranch } from "../utils/title-generation";
import {
  emitStreamChunk,
  emitToTask,
  endStream,
  handleStreamError,
  startStream,
  type TypedSocket,
} from "../socket";
import config from "../config";
import { getGitHubAppEmail, getGitHubAppName } from "../config/shared";
import {
  updateTaskStatus,
  updateTaskActivity,
  scheduleTaskCleanup,
  cancelTaskCleanup,
} from "../utils/task-status";
import { createGitService } from "../execution";
import { memoryService } from "../services/memory-service";
import {
  getTask,
  toConvexId,
  appendMessage,
  listMessagesByTask,
  getMessage,
  editMessage,
  removeMessagesAfterSequence,
  getLatestMessageSequence,
  createTask,
  getUserSettings,
  getUserByExternalId,
  getUser,
} from "../lib/convex-operations";
import { getConvexClient } from "../lib/convex-client";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { TaskInitializationEngine } from "@/initialization";
import { databaseBatchService } from "../services/database-batch-service";
import { ChatSummarizationService } from "../services/chat-summarization-service";

// Discriminated union types for queued actions
type QueuedMessageAction = {
  type: "message";
  data: {
    message: string;
    context: TaskModelContext;
    workspacePath?: string;
  };
};

type QueuedStackedPRAction = {
  type: "stacked-pr";
  data: {
    message: string;
    parentTaskId: string;
    model: ModelType;
    userId: string;
    socket: TypedSocket;
    newTaskId?: string;
  };
};

type QueuedAction = QueuedMessageAction | QueuedStackedPRAction;

const CONVEX_ACTION_TIMEOUT_MS = 300000; // 5 minutes

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export class ChatService {
  private llmService: LLMService;
  private activeStreams: Map<string, AbortController> = new Map();
  private activeConvexMessageIds: Map<string, string> = new Map();
  private convexTaskIdMap: Map<string, string> = new Map();
  private stopRequested: Set<string> = new Set();
  private queuedActions: Map<string, QueuedAction> = new Map();
  private processingTasks: Set<string> = new Set();

  constructor() {
    this.llmService = new LLMService();
  }

  private async getNextSequence(taskId: string): Promise<number> {
    const lastSequence = await getLatestMessageSequence(toConvexId<"tasks">(taskId));
    return lastSequence + 1;
  }

  /**
   * Allow callers to provide a Convex taskId that differs from the string taskId.
   * Useful when tasks have different identifiers.
   */
  setConvexTaskId(taskId: string, convexTaskId: string): void {
    this.convexTaskIdMap.set(taskId, convexTaskId);
  }

  private resolveConvexTaskId(taskId: string): string {
    return this.convexTaskIdMap.get(taskId) ?? taskId;
  }

  private async createMessageWithAtomicSequence(
    taskId: string,
    messageData: {
      content: string;
      role: "USER" | "ASSISTANT" | "SYSTEM";
      llmModel: string;
      metadata?: MessageMetadata;
      finishReason?: string;
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      stackedTaskId?: string;
    }
  ): Promise<{ id: string; sequence: number }> {
    const result = await appendMessage({
      taskId: toConvexId<"tasks">(taskId),
      role: messageData.role,
      content: messageData.content,
      llmModel: messageData.llmModel,
      metadataJson: messageData.metadata ? JSON.stringify(messageData.metadata) : undefined,
      promptTokens: messageData.promptTokens,
      completionTokens: messageData.completionTokens,
      totalTokens: messageData.totalTokens,
      finishReason: messageData.finishReason,
      stackedTaskId: messageData.stackedTaskId ? toConvexId<"tasks">(messageData.stackedTaskId) : undefined,
    });
    return { id: result.messageId, sequence: result.sequence };
  }

  async saveUserMessage(
    taskId: string,
    content: string,
    llmModel: string,
    metadata?: MessageMetadata
  ): Promise<{ id: string; sequence: number }> {
    const message = await this.createMessageWithAtomicSequence(taskId, {
      content,
      role: "USER",
      llmModel,
      metadata,
    });
    await updateTaskActivity(taskId, "MESSAGE");
    return message;
  }

  async saveAssistantMessage(
    taskId: string,
    content: string,
    llmModel: string,
    sequence?: number,
    metadata?: MessageMetadata
  ): Promise<{ id: string; sequence: number }> {
    const usage = metadata?.usage;
    return await this.createMessageWithAtomicSequence(taskId, {
      content,
      role: "ASSISTANT",
      llmModel,
      metadata,
      promptTokens: usage?.promptTokens,
      completionTokens: usage?.completionTokens,
      totalTokens: usage?.totalTokens,
      finishReason: metadata?.finishReason,
    });
  }

  async saveSystemMessage(
    taskId: string,
    content: string,
    llmModel: string,
    sequence?: number,
    metadata?: MessageMetadata
  ): Promise<{ id: string; sequence: number }> {
    return await this.createMessageWithAtomicSequence(taskId, {
      content,
      role: "SYSTEM",
      llmModel,
      metadata,
    });
  }

  /**
   * Commit changes to git if there are any changes after an LLM response
   */
  private async commitChangesIfAny(
    taskId: string,
    context: TaskModelContext,
    _workspacePath?: string
  ): Promise<boolean> {
    try {
      const task = await getTask(toConvexId<"tasks">(taskId));

      if (!task) {
        console.warn(`[CHAT] Task not found for git commit: ${taskId}`);
        return false;
      }

      if (task.isScratchpad) {
        console.log(
          `[CHAT] Task ${taskId} is a scratchpad workspace, skipping git commit`
        );
        return false;
      }

      if (!task.shadowBranch) {
        console.warn(
          `[CHAT] No shadow branch configured for task ${taskId}, skipping git commit`
        );
        return false;
      }

      // Use unified git service for both local and remote modes
      const gitService = await createGitService(taskId);

      // Check if there are any uncommitted changes
      const hasChanges = await gitService.hasChanges();
      if (!hasChanges) {
        console.log(`[CHAT] No changes to commit for task ${taskId}`);
        return false;
      }

      // Get diff for commit message generation
      const diff = await gitService.getDiff();

      // Generate commit message using existing logic
      let commitMessage = "Update code via Shadow agent";
      if (diff) {
        // Generate commit message using server-side GitManager (which has AI integration)
        const tempGitManager = new GitManager("");
        commitMessage = await tempGitManager.generateCommitMessage(
          diff,
          context
        );
      }

      console.log(
        `[CHAT] Generated commit message for task ${taskId}: "${commitMessage}"`
      );

      // Fetch user for co-author info
      const user = await getUser(task.userId);

      // Commit changes with Shadow as author and user as co-author
      const commitResult = await gitService.commitChanges({
        user: {
          name: getGitHubAppName(config),
          email: getGitHubAppEmail(config),
        },
        coAuthor: {
          name: user?.name || "Unknown",
          email: user?.email || "unknown@example.com",
        },
        message: commitMessage,
      });

      if (!commitResult.success) {
        console.error(
          `[CHAT] Failed to commit changes for task ${taskId}: ${commitResult.message}`
        );
        return false;
      }

      console.log(`[CHAT] Successfully committed changes for task ${taskId}`);

      // Push the commit to remote
      try {
        const pushResult = await gitService.pushBranch(
          task.shadowBranch,
          false
        );
        if (!pushResult.success) {
          console.warn(
            `[CHAT] Failed to push changes for task ${taskId}: ${pushResult.message}`
          );
          // Don't fail the operation - commit succeeded even if push failed
        } else {
          console.log(`[CHAT] Successfully pushed changes for task ${taskId}`);
        }
      } catch (pushError) {
        console.warn(`[CHAT] Push failed for task ${taskId}:`, pushError);
        // Don't throw - commit succeeded even if push failed
      }

      return true;
    } catch (error) {
      console.error(
        `[CHAT] Failed to commit changes for task ${taskId}:`,
        error
      );
      // Don't throw here - we don't want git failures to break the chat flow
      return false;
    }
  }

  /**
   * Create a PR if needed after changes are committed
   */
  async createPRIfNeeded(
    taskId: string,
    workspacePath?: string,
    messageId?: string,
    context?: TaskModelContext
  ): Promise<void> {
    // Get or create context if not provided
    let modelContext: TaskModelContext;
    if (context) {
      modelContext = context;
    } else {
      const taskContext = await modelContextService.getContextForTask(taskId);
      if (!taskContext) {
        console.warn(
          `[CHAT] No model context available for task ${taskId}, skipping PR creation`
        );
        return;
      }
      modelContext = taskContext;
    }

    return this._createPRIfNeededInternal(
      taskId,
      workspacePath,
      messageId,
      modelContext
    );
  }

  /**
   * Internal method for PR creation
   */
  private async _createPRIfNeededInternal(
    taskId: string,
    workspacePath?: string,
    messageId?: string,
    context?: TaskModelContext
  ): Promise<void> {
    try {
      const task = await getTask(toConvexId<"tasks">(taskId));

      if (!task) {
        console.warn(`[CHAT] Task not found for PR creation: ${taskId}`);
        return;
      }

      if (task.isScratchpad) {
        console.log(
          `[CHAT] Task ${taskId} is a scratchpad workspace, skipping PR creation`
        );
        return;
      }

      if (!task.shadowBranch) {
        console.warn(
          `[CHAT] No shadow branch configured for task ${taskId}, skipping PR creation`
        );
        return;
      }

      const resolvedWorkspacePath = workspacePath || task.workspacePath;
      if (!resolvedWorkspacePath) {
        console.warn(
          `[CHAT] No workspace path available for task ${taskId}, skipping PR creation`
        );
        return;
      }

      const gitService = await createGitService(taskId);
      const prManager = new PRManager(gitService, this.llmService);

      if (!messageId) {
        console.warn(
          `[CHAT] No messageId provided for PR creation for task ${taskId}`
        );
        return;
      }

      if (!context) {
        console.warn(
          `[CHAT] No context available for PR creation, skipping PR for task ${taskId}`
        );
        return;
      }

      await prManager.createPRIfNeeded(
        {
          taskId,
          repoFullName: task.repoFullName,
          shadowBranch: task.shadowBranch,
          baseBranch: task.baseBranch,
          userId: task.userId,
          taskTitle: task.title,
          wasTaskCompleted: task.status === "COMPLETED",
          messageId,
        },
        context
      );
    } catch (error) {
      console.error(`[CHAT] Failed to create PR for task ${taskId}:`, error);
      // Non-blocking - don't throw
    }
  }

  /**
   * Create a PR if user has auto-PR enabled and changes are committed
   */
  private async createPRIfUserEnabled(
    taskId: string,
    workspacePath?: string,
    messageId?: string,
    context?: TaskModelContext
  ): Promise<void> {
    try {
      const task = await getTask(toConvexId<"tasks">(taskId));

      if (!task) {
        console.warn(`[CHAT] Task not found for PR creation: ${taskId}`);
        return;
      }

      const userSettings = await getUserSettings(task.userId);
      const autoPREnabled = userSettings?.autoPullRequest ?? true;

      if (!autoPREnabled) {
        return;
      }

      if (!messageId) {
        console.warn(
          `[CHAT] No messageId provided for auto-PR creation for task ${taskId}`
        );
        return;
      }

      // Emit in-progress event before starting PR creation
      emitToTask(taskId, "auto-pr-status", {
        taskId,
        messageId,
        status: "in-progress" as const,
      });

      // Use the existing createPRIfNeeded method
      await this.createPRIfNeeded(taskId, workspacePath, messageId, context);
    } catch (error) {
      console.error(
        `[CHAT] Failed to check user auto-PR setting for task ${taskId}:`,
        error
      );

      // Emit failure event if messageId is available
      if (messageId) {
        emitToTask(taskId, "auto-pr-status", {
          taskId,
          messageId,
          status: "failed" as const,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create pull request",
        });
      }

      // Non-blocking - don't throw
    }
  }

  async getChatHistory(taskId: string): Promise<Message[]> {
    const dbMessages = await listMessagesByTask(toConvexId<"tasks">(taskId));

    return dbMessages.map((msg) => ({
      id: msg._id,
      role: msg.role.toLowerCase() as Message["role"],
      content: msg.content,
      llmModel: msg.llmModel || undefined,
      createdAt: new Date(msg.createdAt).toISOString(),
      metadata: msg.metadataJson ? JSON.parse(msg.metadataJson) as MessageMetadata : undefined,
      pullRequestSnapshot: msg.pullRequestSnapshot || undefined,
      stackedTaskId: msg.stackedTaskId || undefined,
      stackedTask: msg.stackedTask || undefined,
    }));
  }

  /**
   * Handle follow-up logic for tasks
   */
  private async handleFollowUpLogic(
    taskId: string,
    userId: string,
    context: TaskModelContext
  ): Promise<void> {
    try {
      // Always cancel any scheduled cleanup when user sends follow-up message
      await cancelTaskCleanup(taskId);

      const task = await getTask(toConvexId<"tasks">(taskId));

      if (!task) {
        console.warn(`[CHAT] Task not found for follow-up logic: ${taskId}`);
        return;
      }

      // Handle tasks with inactive workspaces (VM spun down)
      if (task.initStatus === "INACTIVE") {
        console.log(
          `[CHAT] Task ${taskId} is inactive, re-initializing workspace...`
        );

        // Set task to INITIALIZING to indicate re-initialization is happening
        await updateTaskStatus(taskId, "INITIALIZING", "CHAT");

        const initializationEngine = new TaskInitializationEngine();
        const initSteps =
          await initializationEngine.getDefaultStepsForTask(taskId);
        await initializationEngine.initializeTask(
          taskId,
          initSteps,
          userId,
          context
        );

        await updateTaskStatus(taskId, "RUNNING", "CHAT");
      }

      // ARCHIVED is permanent - no follow-up handling
      // For other statuses (RUNNING, INITIALIZING, FAILED), no special handling needed
    } catch (error) {
      console.error(
        `[CHAT] Error in follow-up logic for task ${taskId}:`,
        error
      );
      // Set task to failed state on initialization error
      await updateTaskStatus(
        taskId,
        "FAILED",
        "CHAT",
        error instanceof Error ? error.message : "Re-initialization failed"
      );
      throw error;
    }
  }

  /**
   * Process user message using TaskModelContext system
   */
  async processUserMessage({
    taskId,
    userMessage,
    context,
    enableTools = true,
    skipUserMessageSave = false,
    workspacePath,
    queue = false,
  }: {
    taskId: string;
    userMessage: string;
    context: TaskModelContext;
    enableTools?: boolean;
    skipUserMessageSave?: boolean;
    workspacePath?: string;
    queue?: boolean;
  }) {
    // Update task's mainModel to keep it current
    await modelContextService.updateTaskMainModel(
      taskId,
      context.getMainModel()
    );

    return this._processUserMessageInternal({
      taskId,
      userMessage,
      context,
      enableTools,
      skipUserMessageSave,
      workspacePath,
      queue,
    });
  }

  /**
   * Internal method for processing user messages
   */
  private async _processUserMessageInternal({
    taskId,
    userMessage,
    context,
    enableTools = true,
    skipUserMessageSave = false,
    workspacePath,
    queue = false,
  }: {
    taskId: string;
    userMessage: string;
    context: TaskModelContext;
    enableTools?: boolean;
    skipUserMessageSave?: boolean;
    workspacePath?: string;
    queue?: boolean;
  }) {
    console.log(`[CHAT] _processUserMessageInternal started for task ${taskId}`);
    console.log(`[CHAT] Model: ${context.getMainModel()}, enableTools: ${enableTools}, skipUserMessageSave: ${skipUserMessageSave}`);

    // Prevent concurrent message processing for the same task (duplicate request guard)
    if (this.processingTasks.has(taskId)) {
      console.warn(`[CHAT] Task ${taskId} is already processing a message, skipping duplicate request`);
      return;
    }
    this.processingTasks.add(taskId);
    console.log(`[CHAT] Task ${taskId} added to processing set`);

    // Get task info for follow-up logic (use Convex as source of truth)
    const task = await getTask(toConvexId<"tasks">(taskId));

    if (!task) {
      console.error(`[CHAT] Task ${taskId} not found in Convex`);
      throw new Error(`Task ${taskId} not found in Convex`);
    }
    console.log(`[CHAT] Task found: status=${task.status}, initStatus=${task.initStatus}, userId=${task.userId}`);

    // Handle follow-up logic for COMPLETED tasks
    console.log(`[CHAT] Calling handleFollowUpLogic for task ${taskId}`);
    await this.handleFollowUpLogic(taskId, task.userId, context);
    console.log(`[CHAT] handleFollowUpLogic completed for task ${taskId}`);

    if (queue) {
      if (this.activeStreams.has(taskId)) {
        // Support only one queued action at a time for now, can extend to a list later
        // Override the existing queued action if it exists
        this.queuedActions.set(taskId, {
          type: "message",
          data: {
            message: userMessage,
            context,
            workspacePath,
          },
        });
        return;
      }
    } else {
      // queue=false: interrupt any active stream and process immediately
      if (this.activeStreams.has(taskId)) {
        await this.stopStream(taskId);

        // Override queued action if it exists
        if (this.queuedActions.has(taskId)) {
          this.queuedActions.delete(taskId);
        }

        // Cleanup time buffer
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Save user message to database (unless skipped, e.g. on task initialization)
    if (!skipUserMessageSave) {
      console.log(`[CHAT] Saving user message for task ${taskId}`);
      await this.saveUserMessage(taskId, userMessage, context.getMainModel());
      console.log(`[CHAT] User message saved for task ${taskId}`);
    } else {
      console.log(`[CHAT] Skipping user message save for task ${taskId}`);
    }

    console.log(`[CHAT] Getting chat history for task ${taskId}`);
    const history = await this.getChatHistory(taskId);
    console.log(`[CHAT] Chat history retrieved: ${history.length} messages`);

    const messages: Message[] = history
      .slice(0, -1)
      .filter(
        (msg) =>
          (msg.role === "user" && !msg.stackedTaskId) ||
          msg.role === "assistant" ||
          msg.role === "system"
      );

    const isFirstMessage = !messages.some((msg) => msg.role === "system");
    console.log(`[CHAT] isFirstMessage: ${isFirstMessage}, filtered messages count: ${messages.length}`);

    if (isFirstMessage) {
      console.log(`[CHAT] First message - adding system prompts`);
      const systemMessagesToAdd: Message[] = [];

      console.log(`[CHAT] Getting Shadow Wiki content for task ${taskId}`);
      const shadowWikiContent = await getShadowWikiMessage(taskId);
      console.log(`[CHAT] Shadow Wiki content: ${shadowWikiContent ? 'present' : 'not found'}`);
      if (shadowWikiContent) {
        const shadowWikiSequence = await this.getNextSequence(taskId);
        await this.saveSystemMessage(
          taskId,
          shadowWikiContent,
          context.getMainModel(),
          shadowWikiSequence
        );

        systemMessagesToAdd.push({
          id: randomUUID(),
          role: "system",
          content: shadowWikiContent,
          createdAt: new Date().toISOString(),
          llmModel: context.getMainModel(),
        });
      }

      console.log(`[CHAT] Re-fetching task for userSettings`);
      const task = await getTask(toConvexId<"tasks">(taskId));
      console.log(`[CHAT] Fetching user settings for userId: ${task?.userId}`);
      const userSettings = task ? await getUserSettings(task.userId) : null;
      console.log(`[CHAT] User settings retrieved: ${userSettings ? 'present' : 'not found'}`);
      const memoriesEnabled = userSettings?.memoriesEnabled ?? true;
      console.log(`[CHAT] Memories enabled: ${memoriesEnabled}`);

      if (memoriesEnabled) {
        console.log(`[CHAT] Fetching memories for task ${taskId}`);
        const memoryContext = await memoryService.getMemoriesForTask(taskId);
        console.log(`[CHAT] Memories retrieved: ${memoryContext?.memories?.length ?? 0} memories`);
        if (memoryContext && memoryContext.memories.length > 0) {
          const memoryContent =
            memoryService.formatMemoriesForPrompt(memoryContext);

          const memorySequence = await this.getNextSequence(taskId);
          await this.saveSystemMessage(
            taskId,
            memoryContent,
            context.getMainModel(),
            memorySequence
          );

          systemMessagesToAdd.push({
            id: randomUUID(),
            role: "system",
            content: memoryContent,
            createdAt: new Date().toISOString(),
            llmModel: context.getMainModel(),
          });
        }
      }

      // Add Rules section if available
      console.log(`[CHAT] Checking user rules`);
      const userRules = userSettings?.rules;
      if (userRules && userRules.trim()) {
        const rulesContent = `
<rules>
CUSTOM USER INSTRUCTIONS:
${userRules.trim()}

These are specific instructions from the user that should be followed throughout the conversation. Apply these rules when relevant to your responses and actions.
</rules>`;

        const rulesSequence = await this.getNextSequence(taskId);
        await this.saveSystemMessage(
          taskId,
          rulesContent,
          context.getMainModel(),
          rulesSequence
        );

        systemMessagesToAdd.push({
          id: randomUUID(),
          role: "system",
          content: rulesContent,
          createdAt: new Date().toISOString(),
          llmModel: context.getMainModel(),
        });
      }

      console.log(`[CHAT] About to unshift ${systemMessagesToAdd.length} system messages`);
      messages.unshift(...systemMessagesToAdd);
      console.log(`[CHAT] Added ${systemMessagesToAdd.length} system messages`);
      console.log(`[CHAT] About to exit if block (isFirstMessage)`);
    } else {
      console.log(`[CHAT] Not first message, skipping system prompts`);
    }

    console.log(`[CHAT] === MESSAGE BUILDING PHASE COMPLETE ===`);
    console.log(`[CHAT] Current messages count: ${messages.length}`);
    console.log(`[CHAT] Finished if block, about to push user message`);
    try {
      messages.push({
        id: randomUUID(),
        role: "user",
        content: userMessage,
        createdAt: new Date().toISOString(),
        llmModel: context.getMainModel(),
      });
      console.log(`[CHAT] User message pushed successfully`);
    } catch (pushError) {
      console.error(`[CHAT] Error pushing user message:`, pushError);
      throw pushError;
    }
    console.log(`[CHAT] Total messages for LLM: ${messages.length}`);

    console.log(`[CHAT] === STREAMING PHASE STARTING ===`);
    console.log(`[CHAT] Starting stream for task ${taskId}`);
    startStream(taskId);

    // Create AbortController for this stream
    const abortController = new AbortController();
    this.activeStreams.set(taskId, abortController);

    let assistantMessageId: string | null = null;
    let usageMetadata: MessageMetadata["usage"];
    let finishReason: MessageMetadata["finishReason"];
    let responseText = "";

    // Create tools first so we can generate system prompt based on available tools
    console.log(`[CHAT] === TOOL CREATION PHASE ===`);
    console.log(`[CHAT] enableTools: ${enableTools}, taskId: ${taskId}`);
    let availableTools: ToolSet | undefined;
    if (enableTools && taskId) {
      console.log(`[CHAT] Calling createTools for task ${taskId}`);
      try {
        availableTools = await createTools(taskId, workspacePath);
        console.log(`[CHAT] createTools completed, tools available: ${!!availableTools}`);
      } catch (toolError) {
        console.error(`[CHAT] createTools failed:`, toolError);
        throw toolError;
      }
    } else {
      console.log(`[CHAT] Skipping tool creation`);
    }

    // Get system prompt with available tools context
    console.log(`[CHAT] Getting system prompt for task ${taskId}`);
    const taskSystemPrompt = await getSystemPrompt(availableTools);
    console.log(`[CHAT] System prompt length: ${taskSystemPrompt?.length || 0}`);

    try {
      console.log(`[CHAT] Using static Convex imports (no dynamic import needed)`);

      console.log(`[CHAT] Getting Convex client...`);
      const convexClient = getConvexClient();
      console.log(`[CHAT] Convex client obtained: ${!!convexClient}`);

      console.log(`[CHAT] Starting Convex streaming for task ${taskId}`);

      const convexTaskId = this.resolveConvexTaskId(taskId);
      console.log(`[CHAT] Resolved Convex task ID: ${convexTaskId}`);

      const apiKeys = context.getApiKeys();
      console.log(`[CHAT] API keys present - anthropic: ${!!apiKeys.anthropic}, openai: ${!!apiKeys.openai}, openrouter: ${!!apiKeys.openrouter}`);
      console.log(`[CHAT] === CONVEX ACTION CALL ===`);
      console.log(`[CHAT] Calling streamChatWithTools action`);
      console.log(`[CHAT] Action params: taskId=${convexTaskId}, model=${context.getMainModel()}, promptLen=${userMessage.length}`);

      const actionStartTime = Date.now();
      console.log(`[CHAT] Starting Convex action at ${new Date().toISOString()}`);
      console.log(`[CHAT] Convex action timeout: ${CONVEX_ACTION_TIMEOUT_MS}ms`);
      
      const actionPromise = convexClient.action(
        api.streaming.streamChatWithTools,
        {
          taskId: toConvexId<"tasks">(convexTaskId),
          prompt: userMessage,
          model: context.getMainModel(),
          systemPrompt: taskSystemPrompt,
          llmModel: context.getMainModel(),
          apiKeys: {
            anthropic: apiKeys.anthropic,
            openai: apiKeys.openai,
            openrouter: apiKeys.openrouter,
          },
        }
      );
      
      const streamResult = await withTimeout(
        actionPromise,
        CONVEX_ACTION_TIMEOUT_MS,
        `streamChatWithTools for task ${taskId}`
      );
      const actionDuration = Date.now() - actionStartTime;
      console.log(`[CHAT] streamChatWithTools returned after ${actionDuration}ms: success=${streamResult?.success}, messageId=${streamResult?.messageId}`);

      responseText = streamResult.text ?? "";
      console.log(`[CHAT] Response text length: ${responseText.length}`);
      usageMetadata = streamResult.usage
        ? {
            promptTokens: streamResult.usage.promptTokens,
            completionTokens: streamResult.usage.completionTokens,
            totalTokens: streamResult.usage.totalTokens,
          }
        : undefined;
      this.activeConvexMessageIds.set(taskId, streamResult.messageId);

      // NOTE: Don't create a new assistant message here - the Convex streaming action
      // already created and populated the message via startStreaming + appendStreamDelta.
      // Creating another message would cause duplicate responses in the UI.
      assistantMessageId = streamResult.messageId;

      console.log(
        `[CHAT] Convex streaming completed for task ${taskId}, messageId: ${assistantMessageId}`
      );

      const wasStoppedEarly = this.stopRequested.has(taskId);

      if (wasStoppedEarly) {
        await updateTaskStatus(taskId, "STOPPED", "CHAT");
        await scheduleTaskCleanup(taskId, 15);
      } else {
        await updateTaskStatus(taskId, "COMPLETED", "CHAT");
        await scheduleTaskCleanup(taskId, 15);
        await updateTaskActivity(taskId, "CHAT");

        try {
          const changesCommitted = await this.commitChangesIfAny(
            taskId,
            context,
            workspacePath
          );

          if (changesCommitted && assistantMessageId) {
            await this.createPRIfUserEnabled(
              taskId,
              workspacePath,
              assistantMessageId,
              context
            );

            await checkpointService.createCheckpoint(
              taskId,
              assistantMessageId
            );
          }
        } catch (commitError) {
          console.error(
            `[CHAT] Failed to commit changes for task ${taskId}:`,
            commitError
          );
        }
      }

      // Clean up stream tracking
      this.activeConvexMessageIds.delete(taskId);
      this.activeStreams.delete(taskId);
      this.stopRequested.delete(taskId);
      endStream(taskId);

      // Clean up MCP manager for this task
      try {
        await stopMCPManager(taskId);
      } catch (error) {
        console.error(
          `[CHAT] Error stopping MCP manager for task ${taskId}:`,
          error
        );
      }

      // Process any queued actions
      await this.processQueuedActions(taskId);
    } catch (error) {
      console.error(`[CHAT] Error processing user message for task ${taskId}:`, error);
      if (error instanceof Error) {
        console.error(`[CHAT] Error stack:`, error.stack);
      }

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Update task status to failed when stream processing fails
      try {
        await updateTaskStatus(taskId, "FAILED", "CHAT", errorMessage);
      } catch (statusError) {
        console.error(`[CHAT] Failed to update task status:`, statusError);
      }

      // Emit error chunk
      try {
        emitStreamChunk(
          {
            type: "error",
            error: errorMessage,
            finishReason: "error",
          },
          taskId
        );
      } catch (emitError) {
        console.error(`[CHAT] Failed to emit error chunk:`, emitError);
      }

      // Clean up stream tracking on error
      this.activeConvexMessageIds.delete(taskId);
      this.activeStreams.delete(taskId);
      this.stopRequested.delete(taskId);
      
      try {
        handleStreamError(error, taskId);
      } catch (streamError) {
        console.error(`[CHAT] Failed to handle stream error:`, streamError);
      }

      // Clean up MCP manager for this task
      try {
        await stopMCPManager(taskId);
      } catch (mcpError) {
        console.error(
          `[CHAT] Error stopping MCP manager for task ${taskId}:`,
          mcpError
        );
      }

      // Clear any queued actions (don't process them after error)
      this.clearQueuedAction(taskId);
      
      // Check if this is a model-related error that was already saved to the chat
      // For these errors, don't re-throw - the error is visible in the chat UI
      const errorStr = String(error);
      const isModelError = errorMessage.includes('No output generated') ||
        errorMessage.includes('Model returned no output') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('Rate limit') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('Stream error') ||
        errorMessage.includes('401') ||
        errorMessage.includes('403') ||
        errorMessage.includes('Unauthorized') ||
        errorMessage.includes('Forbidden') ||
        errorStr.includes('401') ||
        errorStr.includes('403');
      
      if (isModelError) {
        console.log(`[CHAT] Model/API error for task ${taskId} - not re-throwing (error visible in chat)`);
        return; // Don't throw - error is already in the chat
      }
      
      throw error;
    } finally {
      // ALWAYS clean up processing state - this guarantees follow-up messages can be processed
      this.processingTasks.delete(taskId);
      console.log(`[CHAT] Task ${taskId} removed from processing set (finally block)`);
    }
  }

  private async processQueuedActions(taskId: string): Promise<void> {
    const queuedAction = this.queuedActions.get(taskId);
    if (!queuedAction) {
      return;
    }

    this.queuedActions.delete(taskId);

    try {
      switch (queuedAction.type) {
        case "message":
          // Emit event for regular messages before processing
          emitToTask(taskId, "queued-action-processing", {
            taskId,
            type: queuedAction.type,
            message: queuedAction.data.message,
            model: queuedAction.data.context.getMainModel(),
          });
          await this._processQueuedMessage(queuedAction.data, taskId);
          break;
        case "stacked-pr":
          await this._processQueuedStackedPR(queuedAction.data);
          break;
      }
    } catch (error) {
      console.error(
        `[CHAT] Error processing queued ${queuedAction.type} for task ${taskId}:`,
        error
      );
    }
  }

  private async _processQueuedMessage(
    data: QueuedMessageAction["data"],
    taskId: string
  ): Promise<void> {
    // Use the stored TaskModelContext directly
    await this.processUserMessage({
      taskId,
      userMessage: data.message,
      context: data.context,
      enableTools: true,
      skipUserMessageSave: false,
      workspacePath: data.workspacePath,
      queue: false,
    });
  }

  private async _processQueuedStackedPR(
    data: QueuedStackedPRAction["data"]
  ): Promise<void> {
    await this._createStackedTaskInternal({
      parentTaskId: data.parentTaskId,
      message: data.message,
      model: data.model,
      userId: data.userId,
      newTaskId: data.newTaskId,
    });
  }

  async getAvailableModels(userApiKeys: ApiKeys): Promise<ModelType[]> {
    return await this.llmService.getAvailableModels(userApiKeys);
  }

  getQueuedAction(taskId: string): QueuedActionUI | null {
    const action = this.queuedActions.get(taskId);
    if (!action) return null;

    // Model is now required for both action types
    const model =
      action.type === "stacked-pr"
        ? action.data.model
        : action.data.context?.getMainModel();

    if (!model) {
      console.warn(
        `[CHAT] No model available for queued ${action.type} action in task ${taskId}`
      );
      return null;
    }

    return {
      type: action.type,
      message: action.data.message,
      model,
    };
  }

  clearQueuedAction(taskId: string): void {
    this.queuedActions.delete(taskId);
  }

  async stopStream(
    taskId: string,
    updateStatus: boolean = false
  ): Promise<void> {
    // Mark stop requested so generator exits early
    this.stopRequested.add(taskId);

    const abortController = this.activeStreams.get(taskId);
    if (abortController) {
      abortController.abort();
      this.activeStreams.delete(taskId);
    }

    const convexMessageId = this.activeConvexMessageIds.get(taskId);
    if (convexMessageId) {
      try {
        const convexClient = getConvexClient();
        await convexClient.action(api.streaming.cancelStream, {
          messageId: toConvexId<"chatMessages">(convexMessageId),
        });
      } catch (convexCancelError) {
        console.warn(
          `[CHAT] Failed to cancel Convex stream for task ${taskId}:`,
          convexCancelError
        );
      } finally {
        this.activeConvexMessageIds.delete(taskId);
      }
    }

    // Flush any pending database updates before stopping
    await databaseBatchService.flushAssistantUpdate(taskId);

    // Clean up MCP manager for this task
    try {
      await stopMCPManager(taskId);
    } catch (error) {
      console.error(
        `[CHAT] Error stopping MCP manager for task ${taskId}:`,
        error
      );
    }

    // Update task status to stopped only when explicitly requested (e.g., manual stop)
    if (updateStatus) {
      await updateTaskStatus(taskId, "STOPPED", "CHAT");
    }
  }

  async editUserMessage({
    taskId,
    messageId,
    newContent,
    newModel,
    context,
    workspacePath,
  }: {
    taskId: string;
    messageId: string;
    newContent: string;
    newModel: ModelType;
    context: TaskModelContext;
    workspacePath?: string;
  }): Promise<void> {
    // First, stop any active stream and clear queued messages
    if (this.activeStreams.has(taskId)) {
      await this.stopStream(taskId);
    }
    this.clearQueuedAction(taskId);

    await editMessage({
      messageId: toConvexId<"chatMessages">(messageId),
      content: newContent,
      llmModel: newModel,
    });

    await updateTaskActivity(taskId, "MESSAGE");

    const editedMessage = await getMessage(toConvexId<"chatMessages">(messageId));

    if (!editedMessage) {
      throw new Error("Edited message not found");
    }

    await checkpointService.restoreCheckpoint(taskId, messageId);
    console.log(`[CHAT] ✅ Checkpoint restoration completed for message editing`);

    await removeMessagesAfterSequence(toConvexId<"tasks">(taskId), editedMessage.sequence);

    // Start streaming from the edited message
    // Update context with new model if it has changed
    if (context.getMainModel() !== newModel) {
      // Create new context with updated model
      const updatedContext = new TaskModelContext(
        taskId,
        newModel,
        context.getApiKeys()
      );
      await this.processUserMessage({
        taskId,
        userMessage: newContent,
        context: updatedContext,
        enableTools: true,
        skipUserMessageSave: true, // Don't save again, already updated
        workspacePath,
        queue: false,
      });
    } else {
      // Use existing context
      await this.processUserMessage({
        taskId,
        userMessage: newContent,
        context,
        enableTools: true,
        skipUserMessageSave: true, // Don't save again, already updated
        workspacePath,
        queue: false,
      });
    }
  }

  /**
   * Create a stacked PR (new task based on current task's shadow branch)
   */
  async createStackedPR({
    parentTaskId,
    message,
    model,
    userId,
    queue,
    socket,
    newTaskId,
  }: {
    parentTaskId: string;
    message: string;
    model: ModelType;
    userId: string;
    queue: boolean;
    socket: TypedSocket;
    newTaskId?: string;
  }): Promise<void> {
    try {
      // If there's an active stream and queue is true, queue the stacked PR
      if (this.activeStreams.has(parentTaskId) && queue) {
        this.queuedActions.set(parentTaskId, {
          type: "stacked-pr",
          data: {
            message,
            parentTaskId,
            model,
            userId,
            socket,
            newTaskId,
          },
        });
        return;
      }

      // Create the stacked task immediately
      await this._createStackedTaskInternal({
        parentTaskId,
        message,
        model,
        userId,
        newTaskId,
      });
    } catch (error) {
      console.error(`[CHAT] Error creating stacked PR:`, error);
      socket.emit("message-error", {
        error: "Failed to create stacked PR",
      });
    }
  }

  /**
   * Internal method to create stacked task
   */
  private async _createStackedTaskInternal({
    parentTaskId,
    message,
    model,
    userId,
    newTaskId,
  }: {
    parentTaskId: string;
    message: string;
    model: ModelType;
    userId: string;
    newTaskId?: string;
  }): Promise<void> {
    try {
      // Get parent task details from Convex
      const parentTask = await getTask(toConvexId<"tasks">(parentTaskId));

      if (!parentTask) {
        throw new Error("Parent task not found");
      }

      // Get the Convex user for authorization check
      const convexUser = await getUserByExternalId(userId);
      if (!convexUser || parentTask.userId !== convexUser._id) {
        throw new Error("Unauthorized to create stacked task");
      }

      const taskId = newTaskId || generateTaskId();

      const parentContext =
        await modelContextService.getContextForTask(parentTaskId);

      // Create TaskModelContext for title generation
      const context = await modelContextService.copyContext(
        taskId,
        parentContext!
      );

      // Generate title and branch for the new task
      const { title, shadowBranch } = await generateTaskTitleAndBranch(
        taskId,
        message,
        context
      );

      // Create the new stacked task in Convex
      const { taskId: newConvexTaskId } = await createTask({
        title,
        repoFullName: parentTask.repoFullName,
        repoUrl: parentTask.repoUrl,
        baseBranch: parentTask.shadowBranch, // Use parent's shadow branch as base
        shadowBranch,
        baseCommitSha: "pending",
        userId: convexUser._id,
      });

      // Create the initial user message for the new task
      await appendMessage({
        taskId: newConvexTaskId,
        role: "USER",
        content: message,
        llmModel: model,
      });

      // Create a message in the parent task referencing the stacked task
      await appendMessage({
        taskId: toConvexId<"tasks">(parentTaskId),
        role: "USER",
        content: message,
        llmModel: model,
        stackedTaskId: newConvexTaskId,
      });

      // Trigger task initialization (similar to the backend initiate endpoint)
      await this.initializeStackedTask(
        taskId,
        message,
        model,
        userId,
        parentTaskId
      );

      // Emit event to frontend for optimistic message display with full context
      emitToTask(parentTaskId, "queued-action-processing", {
        taskId: parentTaskId,
        type: "stacked-pr",
        message,
        model,
        shadowBranch,
        title,
        newTaskId: taskId,
      });
    } catch (error) {
      console.error(`[CHAT] Error in _createStackedTaskInternal:`, error);
      throw error;
    }
  }

  /**
   * Initialize a stacked task (similar to the backend initiate endpoint)
   */
  private async initializeStackedTask(
    taskId: string,
    message: string,
    model: ModelType,
    _userId: string,
    parentTaskId: string
  ): Promise<void> {
    try {
      const initializationEngine = new TaskInitializationEngine();

      await updateTaskStatus(taskId, "RUNNING", "CHAT");

      // Get parent's API keys from cached context
      const parentContext =
        await modelContextService.getContextForTask(parentTaskId);
      if (!parentContext) {
        throw new Error(`Parent task context not found for ${parentTaskId}`);
      }

      // Create new task context inheriting parent's API keys
      const newTaskContext =
        await modelContextService.createContextWithInheritedKeys(
          taskId,
          model,
          parentContext.getApiKeys()
        );

      // Start task initialization in background (non-blocking)
      // This will handle workspace setup, VM creation, etc.
      initializationEngine
        .initializeTask(
          taskId,
          undefined, // Use default steps
          _userId,
          newTaskContext
        )
        .catch((error: unknown) => {
          console.error(
            `[CHAT] Failed to initialize stacked task ${taskId}:`,
            error
          );
        });

      setTimeout(async () => {
        try {
          // Generate conversation summary from parent task
          const chatSummarizationService = new ChatSummarizationService();
          const conversationSummary =
            await chatSummarizationService.summarizeParentChat(
              parentTaskId,
              newTaskContext
            );

          // Inject conversation summary as system message before user message
          if (conversationSummary && conversationSummary.trim()) {
            const contextMessage = `<parent_task_conversation_summary>${conversationSummary}</parent_task_conversation_summary>`;

            const contextSequence = await this.getNextSequence(taskId);
            await this.saveSystemMessage(
              taskId,
              contextMessage,
              newTaskContext.getMainModel(),
              contextSequence
            );
          }

          await this.processUserMessage({
            taskId,
            userMessage: message,
            context: newTaskContext,
            workspacePath: undefined,
            queue: false,
            skipUserMessageSave: true, // Don't duplicate message - it's already in parent task
          });
        } catch (error) {
          console.error(
            `[CHAT] Failed to process first message for stacked task ${taskId}:`,
            error
          );
        }
      }, 1000);
    } catch (error) {
      console.error(`[CHAT] Error initializing stacked task ${taskId}:`, error);
    }
  }

  /**
   * Clean up task-related memory structures
   */
  async cleanupTask(taskId: string): Promise<void> {
    try {
      // Clean up active streams
      const abortController = this.activeStreams.get(taskId);
      if (abortController) {
        abortController.abort();
        this.activeStreams.delete(taskId);
      }

      // Clean up MCP manager for this task
      try {
        await stopMCPManager(taskId);
      } catch (mcpError) {
        console.error(
          `[CHAT] Error stopping MCP manager for task ${taskId}:`,
          mcpError
        );
      }

      // Clean up queued actions
      this.queuedActions.delete(taskId);

      // Clean up batched database updates
      databaseBatchService.clear(taskId);
    } catch (error) {
      console.error(
        `[CHAT] Error cleaning up ChatService memory for task ${taskId}:`,
        error
      );
    }
  }
}
