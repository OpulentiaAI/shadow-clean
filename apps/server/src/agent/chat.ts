import { prisma } from "@repo/db";
import {
  Message,
  MessageMetadata,
  ModelType,
  ApiKeys,
  QueuedActionUI,
  generateTaskId,
} from "@repo/types";
import { TextPart } from "ai";
import { randomUUID } from "crypto";
import { type ChatMessage } from "../../../../packages/db/src/client";
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
import { MessageRole } from "@repo/db";
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
import { getTask, toConvexId } from "../lib/convex-operations";
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

export class ChatService {
  private llmService: LLMService;
  private activeStreams: Map<string, AbortController> = new Map();
  private activeConvexMessageIds: Map<string, string> = new Map();
  private convexTaskIdMap: Map<string, string> = new Map();
  private stopRequested: Set<string> = new Set();
  private queuedActions: Map<string, QueuedAction> = new Map();

  constructor() {
    this.llmService = new LLMService();
  }

  private async getNextSequence(taskId: string): Promise<number> {
    // Use a short transaction to atomically get the next sequence
    // This prevents race conditions when multiple operations need sequences
    return await prisma.$transaction(async (tx) => {
      const lastMessage = await tx.chatMessage.findFirst({
        where: { taskId },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      return (lastMessage?.sequence || 0) + 1;
    });
  }

  /**
   * Allow callers to provide a Convex taskId that differs from the Prisma taskId.
   * Useful during migration when tasks are mirrored into Convex with generated IDs.
   */
  setConvexTaskId(taskId: string, convexTaskId: string): void {
    this.convexTaskIdMap.set(taskId, convexTaskId);
  }

  private resolveConvexTaskId(taskId: string): string {
    return this.convexTaskIdMap.get(taskId) ?? taskId;
  }

  // Helper method to atomically create any message with sequence generation
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
    }
  ): Promise<ChatMessage> {
    return await prisma.$transaction(async (tx) => {
      // Atomically get next sequence within transaction
      const lastMessage = await tx.chatMessage.findFirst({
        where: { taskId },
        orderBy: { sequence: "desc" },
        select: { sequence: true },
      });
      const sequence = (lastMessage?.sequence || 0) + 1;

      // Create message with the atomic sequence
      return await tx.chatMessage.create({
        data: {
          taskId,
          content: messageData.content,
          role: messageData.role,
          sequence,
          llmModel: messageData.llmModel,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: (messageData.metadata as any) || undefined,
          promptTokens: messageData.promptTokens,
          completionTokens: messageData.completionTokens,
          totalTokens: messageData.totalTokens,
          finishReason: messageData.finishReason,
        },
      });
    });
  }

  async saveUserMessage(
    taskId: string,
    content: string,
    llmModel: string,
    metadata?: MessageMetadata
  ): Promise<ChatMessage> {
    // Use atomic sequence generation to prevent race conditions
    const message = await this.createMessageWithAtomicSequence(taskId, {
      content,
      role: "USER",
      llmModel,
      metadata,
    });

    // Update task activity timestamp when user sends a message
    await updateTaskActivity(taskId, "MESSAGE");

    return message;
  }

  async saveAssistantMessage(
    taskId: string,
    content: string,
    llmModel: string,
    sequence?: number,
    metadata?: MessageMetadata
  ): Promise<ChatMessage> {
    // If no sequence provided, generate atomically
    if (sequence === undefined) {
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

    // Extract usage info for denormalized storage
    const usage = metadata?.usage;

    return await prisma.chatMessage.create({
      data: {
        taskId,
        content,
        role: "ASSISTANT",
        llmModel,
        sequence,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (metadata as any) || undefined,
        // Denormalized usage fields for easier querying
        promptTokens: usage?.promptTokens,
        completionTokens: usage?.completionTokens,
        totalTokens: usage?.totalTokens,
        finishReason: metadata?.finishReason,
      },
    });
  }

  async saveSystemMessage(
    taskId: string,
    content: string,
    llmModel: string,
    sequence?: number,
    metadata?: MessageMetadata
  ): Promise<ChatMessage> {
    // If no sequence provided, generate atomically
    if (sequence === undefined) {
      return await this.createMessageWithAtomicSequence(taskId, {
        content,
        role: "SYSTEM",
        llmModel,
        metadata,
      });
    }

    return await prisma.chatMessage.create({
      data: {
        taskId,
        content,
        role: "SYSTEM",
        llmModel,
        sequence,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: (metadata as any) || undefined,
      },
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
      // Get task info including user and workspace details
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { user: true },
      });

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

      // Commit changes with Shadow as author and user as co-author
      const commitResult = await gitService.commitChanges({
        user: {
          name: getGitHubAppName(config),
          email: getGitHubAppEmail(config),
        },
        coAuthor: {
          name: task.user.name,
          email: task.user.email,
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
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: { user: true },
      });

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
      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          user: {
            include: {
              userSettings: true,
            },
          },
        },
      });

      if (!task) {
        console.warn(`[CHAT] Task not found for PR creation: ${taskId}`);
        return;
      }

      // Check if user has auto-PR enabled (default to true if no settings exist)
      const autoPREnabled = task.user.userSettings?.autoPullRequest ?? true;

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
    const dbMessages = await prisma.chatMessage.findMany({
      where: { taskId },
      include: {
        pullRequestSnapshot: true,
        stackedTask: {
          select: {
            id: true,
            title: true,
            shadowBranch: true,
            status: true,
          },
        },
      },
      orderBy: [
        { sequence: "asc" }, // Primary ordering by sequence
        { createdAt: "asc" }, // Fallback ordering by timestamp
      ],
    });

    return dbMessages.map((msg) => ({
      id: msg.id,
      role: msg.role.toLowerCase() as Message["role"],
      content: msg.content,
      llmModel: msg.llmModel,
      createdAt: msg.createdAt.toISOString(),
      metadata: msg.metadata as MessageMetadata | undefined,
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
    // Get task info for follow-up logic (use Convex as source of truth)
    const task = await getTask(toConvexId<"tasks">(taskId));

    if (!task) {
      throw new Error(`Task ${taskId} not found in Convex`);
    }

    // Handle follow-up logic for COMPLETED tasks
    await this.handleFollowUpLogic(taskId, task.userId, context);

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
      await this.saveUserMessage(taskId, userMessage, context.getMainModel());
    }

    const history = await this.getChatHistory(taskId);

    const messages: Message[] = history
      .slice(0, -1)
      .filter(
        (msg) =>
          (msg.role === "user" && !msg.stackedTaskId) ||
          msg.role === "assistant" ||
          msg.role === "system"
      );

    const isFirstMessage = !messages.some((msg) => msg.role === "system");

    if (isFirstMessage) {
      const systemMessagesToAdd: Message[] = [];

      const shadowWikiContent = await getShadowWikiMessage(taskId);
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

      const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
          user: {
            include: {
              userSettings: true,
            },
          },
        },
      });

      const memoriesEnabled = task?.user.userSettings?.memoriesEnabled ?? true;

      if (memoriesEnabled) {
        const memoryContext = await memoryService.getMemoriesForTask(taskId);
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
      const userRules = task?.user.userSettings?.rules;
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

      messages.unshift(...systemMessagesToAdd);
    }

    messages.push({
      id: randomUUID(),
      role: "user",
      content: userMessage,
      createdAt: new Date().toISOString(),
      llmModel: context.getMainModel(),
    });

    startStream(taskId);

    // Create AbortController for this stream
    const abortController = new AbortController();
    this.activeStreams.set(taskId, abortController);

    let assistantMessageId: string | null = null;
    let usageMetadata: MessageMetadata["usage"];
    let finishReason: MessageMetadata["finishReason"];
    let responseText = "";

    // Create tools first so we can generate system prompt based on available tools
    let availableTools: ToolSet | undefined;
    if (enableTools && taskId) {
      availableTools = await createTools(taskId, workspacePath);
    }

    // Get system prompt with available tools context
    const taskSystemPrompt = await getSystemPrompt(availableTools);

    try {
      const { getConvexClient } =
        (await import("../lib/convex-client.js")) as typeof import("../lib/convex-client.js");
      const { api } =
        (await import("../../../../convex/_generated/api.js")) as typeof import("../../../../convex/_generated/api.js");
      const { toConvexId } =
        (await import("../lib/convex-operations.js")) as typeof import("../lib/convex-operations.js");

      const convexClient = getConvexClient();

      console.log(`[CHAT] Starting Convex streaming for task ${taskId}`);

      const convexTaskId = this.resolveConvexTaskId(taskId);

      const streamResult = await convexClient.action(
        api.streaming.streamChatWithTools,
        {
          taskId: toConvexId<"tasks">(convexTaskId),
          prompt: userMessage,
          model: context.getMainModel(),
          systemPrompt: taskSystemPrompt,
          llmModel: context.getMainModel(),
          apiKeys: {
            anthropic: context.getApiKeys().anthropic,
            openai: context.getApiKeys().openai,
            openrouter: context.getApiKeys().openrouter,
          },
        }
      );

      responseText = streamResult.text ?? "";
      usageMetadata = streamResult.usage
        ? {
            promptTokens: streamResult.usage.promptTokens,
            completionTokens: streamResult.usage.completionTokens,
            totalTokens: streamResult.usage.totalTokens,
          }
        : undefined;
      this.activeConvexMessageIds.set(taskId, streamResult.messageId);

      // Persist assistant message to Prisma for history/PR flows
      const assistantSequence = await this.getNextSequence(taskId);
      const finalMetadata: MessageMetadata = {
        usage: usageMetadata,
        finishReason,
        isStreaming: false,
        parts: responseText
          ? [
              {
                type: "text",
                text: responseText,
              } as TextPart,
            ]
          : [],
      };

      const assistantMsg = await this.saveAssistantMessage(
        taskId,
        responseText,
        context.getMainModel(),
        assistantSequence,
        finalMetadata
      );
      assistantMessageId = assistantMsg.id;

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
      console.error("Error processing user message:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      // Update task status to failed when stream processing fails
      await updateTaskStatus(taskId, "FAILED", "CHAT", errorMessage);

      // Emit error chunk
      emitStreamChunk(
        {
          type: "error",
          error: errorMessage,
          finishReason: "error",
        },
        taskId
      );

      // Clean up stream tracking on error
      this.activeConvexMessageIds.delete(taskId);
      this.activeStreams.delete(taskId);
      this.stopRequested.delete(taskId);
      handleStreamError(error, taskId);

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
      throw error;
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
        const { getConvexClient } =
          (await import("../lib/convex-client.js")) as typeof import("../lib/convex-client.js");
        const { api } =
          (await import("../../../../convex/_generated/api.js")) as typeof import("../../../../convex/_generated/api.js");
        const { toConvexId } =
          (await import("../lib/convex-operations.js")) as typeof import("../lib/convex-operations.js");

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

    // Update the message in database
    await prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: newContent,
        llmModel: newModel,
        editedAt: new Date(),
      },
    });

    // Update task activity timestamp when user edits a message
    await updateTaskActivity(taskId, "MESSAGE");

    // Get the sequence of the edited message
    const editedMessage = await prisma.chatMessage.findUnique({
      where: { id: messageId },
      select: { sequence: true },
    });

    if (!editedMessage) {
      throw new Error("Edited message not found");
    }

    await checkpointService.restoreCheckpoint(taskId, messageId);
    console.log(
      `[CHAT] ✅ Checkpoint restoration completed for message editing`
    );

    // Delete all messages that come after the edited message
    await prisma.chatMessage.deleteMany({
      where: {
        taskId,
        sequence: {
          gt: editedMessage.sequence,
        },
      },
    });

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
      // Get parent task details
      const parentTask = await prisma.task.findUnique({
        where: { id: parentTaskId },
        select: {
          repoFullName: true,
          repoUrl: true,
          shadowBranch: true,
          userId: true,
        },
      });

      if (!parentTask) {
        throw new Error("Parent task not found");
      }

      if (parentTask.userId !== userId) {
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

      // Create the new stacked task
      await prisma.task.create({
        data: {
          id: taskId,
          title,
          repoFullName: parentTask.repoFullName,
          repoUrl: parentTask.repoUrl,
          baseBranch: parentTask.shadowBranch, // Use parent's shadow branch as base
          shadowBranch,
          baseCommitSha: "pending",
          status: "INITIALIZING",
          user: {
            connect: {
              id: userId,
            },
          },
          messages: {
            create: {
              content: message,
              role: MessageRole.USER,
              sequence: 1,
              llmModel: model,
            },
          },
        },
      });

      // Create a message in the parent task referencing the stacked task
      const parentNextSequence = await this.getNextSequence(parentTaskId);
      await prisma.chatMessage.create({
        data: {
          content: message,
          role: MessageRole.USER,
          llmModel: model,
          taskId: parentTaskId,
          stackedTaskId: taskId,
          sequence: parentNextSequence,
        },
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
