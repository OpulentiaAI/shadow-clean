import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { MessageRole } from "./schema";

// Internal mutations for use by other Convex functions (avoids circular type references)
export const internalStartStreaming = internalMutation({
  args: {
    taskId: v.id("tasks"),
    llmModel: v.optional(v.string()),
    stackedTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();
    const sequence = latest ? latest.sequence + 1 : 0;
    const createdAt = Date.now();
    const messageId = await ctx.db.insert("chatMessages", {
      taskId: args.taskId,
      role: "ASSISTANT",
      content: "",
      llmModel: args.llmModel,
      metadataJson: JSON.stringify({ isStreaming: true, parts: [] }),
      promptTokens: undefined,
      completionTokens: undefined,
      totalTokens: undefined,
      finishReason: undefined,
      stackedTaskId: args.stackedTaskId,
      sequence,
      createdAt,
      editedAt: undefined,
    });
    return { messageId, sequence };
  },
});

export const internalAppendStreamDelta = internalMutation({
  args: {
    messageId: v.id("chatMessages"),
    deltaText: v.string(),
    usage: v.optional(
      v.object({
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        totalTokens: v.optional(v.number()),
      })
    ),
    finishReason: v.optional(v.string()),
    isFinal: v.boolean(),
    parts: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.messageId);
    if (!existing) {
      throw new Error("Message not found for streaming");
    }
    const currentMetadata = existing.metadataJson
      ? JSON.parse(existing.metadataJson)
      : {};
    const currentContent = existing.content || "";
    const updatedContent = currentContent + args.deltaText;
    const currentParts: any[] = currentMetadata.parts || [];
    
    // Merge consecutive reasoning parts instead of appending each delta separately
    let updatedParts = currentParts;
    if (args.parts && args.parts.length > 0) {
      for (const newPart of args.parts) {
        const partType = (newPart.type || "").replace(/_/g, "-");
        const isReasoningPart = partType === "reasoning" || partType === "reasoning-delta";
        
        if (isReasoningPart && updatedParts.length > 0) {
          const lastPart = updatedParts[updatedParts.length - 1];
          const lastPartType = (lastPart.type || "").replace(/_/g, "-");
          const lastIsReasoning = lastPartType === "reasoning" || lastPartType === "reasoning-delta";
          
          if (lastIsReasoning) {
            // Merge with last reasoning part
            updatedParts = [
              ...updatedParts.slice(0, -1),
              { ...lastPart, type: "reasoning", text: (lastPart.text || "") + (newPart.text || newPart.delta || "") },
            ];
            continue;
          }
        }
        updatedParts = [...updatedParts, newPart];
      }
    }
    
    const updatedMetadata = {
      ...currentMetadata,
      isStreaming: !args.isFinal,
      parts: updatedParts,
      usage: args.usage ? { ...currentMetadata.usage, ...args.usage } : currentMetadata.usage,
      finishReason: args.finishReason ?? currentMetadata.finishReason,
    };
    await ctx.db.patch(args.messageId, {
      content: updatedContent,
      metadataJson: JSON.stringify(updatedMetadata),
      editedAt: Date.now(),
    });
    return { success: true };
  },
});

export const append = mutation({
  args: {
    taskId: v.id("tasks"),
    role: MessageRole,
    content: v.string(),
    llmModel: v.optional(v.string()),
    metadataJson: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
    stackedTaskId: v.optional(v.id("tasks")),
    // Client-generated UUID for true idempotency across retries
    clientMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now();

    // TRUE IDEMPOTENCY: Check by clientMessageId index first (instant O(1) lookup)
    if (args.clientMessageId) {
      const existingByClientId = await ctx.db
        .query("chatMessages")
        .withIndex("by_task_clientMessageId", (q) =>
          q.eq("taskId", args.taskId).eq("clientMessageId", args.clientMessageId)
        )
        .first();

      if (existingByClientId) {
        console.log(
          `[MESSAGES] Idempotent hit in append: clientMessageId=${args.clientMessageId} → ` +
            `existing message ${existingByClientId._id} (sequence=${existingByClientId.sequence})`
        );
        return { messageId: existingByClientId._id, sequence: existingByClientId.sequence };
      }
    }

    const latest = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();
    const sequence = latest ? latest.sequence + 1 : 0;

    const messageId = await ctx.db.insert("chatMessages", {
      taskId: args.taskId,
      role: args.role,
      content: args.content,
      llmModel: args.llmModel,
      metadataJson: args.metadataJson,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      finishReason: args.finishReason,
      stackedTaskId: args.stackedTaskId,
      clientMessageId: args.clientMessageId,
      sequence,
      createdAt,
      editedAt: undefined,
    });
    return { messageId, sequence };
  },
});

export const startStreaming = mutation({
  args: {
    taskId: v.id("tasks"),
    llmModel: v.optional(v.string()),
    stackedTaskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();
    const sequence = latest ? latest.sequence + 1 : 0;
    const createdAt = Date.now();
    const messageId = await ctx.db.insert("chatMessages", {
      taskId: args.taskId,
      role: "ASSISTANT",
      content: "",
      llmModel: args.llmModel,
      metadataJson: JSON.stringify({ isStreaming: true, parts: [] }),
      promptTokens: undefined,
      completionTokens: undefined,
      totalTokens: undefined,
      finishReason: undefined,
      stackedTaskId: args.stackedTaskId,
      sequence,
      createdAt,
      editedAt: undefined,
    });
    return { messageId, sequence };
  },
});

export const appendStreamDelta = mutation({
  args: {
    messageId: v.id("chatMessages"),
    deltaText: v.string(),
    usage: v.optional(
      v.object({
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        totalTokens: v.optional(v.number()),
      })
    ),
    finishReason: v.optional(v.string()),
    isFinal: v.boolean(),
    parts: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.messageId);
    if (!existing) {
      throw new Error("Message not found for streaming");
    }
    const currentMetadata = existing.metadataJson
      ? JSON.parse(existing.metadataJson)
      : {};
    const currentContent = existing.content || "";
    const updatedContent = currentContent + args.deltaText;
    const currentParts: any[] = currentMetadata.parts || [];
    
    // Merge consecutive reasoning parts instead of appending each delta separately
    let updatedParts = currentParts;
    if (args.parts && args.parts.length > 0) {
      for (const newPart of args.parts) {
        const partType = (newPart.type || "").replace(/_/g, "-");
        const isReasoningPart = partType === "reasoning" || partType === "reasoning-delta";
        
        if (isReasoningPart && updatedParts.length > 0) {
          const lastPart = updatedParts[updatedParts.length - 1];
          const lastPartType = (lastPart.type || "").replace(/_/g, "-");
          const lastIsReasoning = lastPartType === "reasoning" || lastPartType === "reasoning-delta";
          
          if (lastIsReasoning) {
            // Merge with last reasoning part
            updatedParts = [
              ...updatedParts.slice(0, -1),
              { ...lastPart, type: "reasoning", text: (lastPart.text || "") + (newPart.text || newPart.delta || "") },
            ];
            continue;
          }
        }
        updatedParts = [...updatedParts, newPart];
      }
    }
    
    const updatedMetadata = {
      ...currentMetadata,
      isStreaming: !args.isFinal,
      parts: updatedParts,
      usage: args.usage ? { ...currentMetadata.usage, ...args.usage } : currentMetadata.usage,
      finishReason: args.finishReason ?? currentMetadata.finishReason,
    };
    await ctx.db.patch(args.messageId, {
      content: updatedContent,
      metadataJson: JSON.stringify(updatedMetadata),
      editedAt: Date.now(),
    });
    return { success: true };
  },
});

export const update = mutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.optional(v.string()),
    llmModel: v.optional(v.string()),
    metadataJson: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.messageId);
    if (!existing) {
      throw new Error("Message not found");
    }
    const { messageId, ...updates } = args;
    const patchData: Record<string, unknown> = { editedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patchData[key] = value;
      }
    }
    await ctx.db.patch(messageId, patchData);
    return { success: true, messageId };
  },
});

export const edit = mutation({
  args: {
    messageId: v.id("chatMessages"),
    content: v.string(),
    llmModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.messageId);
    if (!existing) {
      throw new Error("Message not found");
    }
    if (existing.role !== "USER") {
      throw new Error("Can only edit user messages");
    }
    await ctx.db.patch(args.messageId, {
      content: args.content,
      llmModel: args.llmModel ?? existing.llmModel,
      editedAt: Date.now(),
    });
    return { success: true, messageId: args.messageId };
  },
});

export const remove = mutation({
  args: { messageId: v.id("chatMessages") },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.messageId);
    if (!existing) {
      throw new Error("Message not found");
    }
    const snapshot = await ctx.db
      .query("pullRequestSnapshots")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .first();
    if (snapshot) {
      await ctx.db.delete(snapshot._id);
    }
    await ctx.db.delete(args.messageId);
    return { success: true };
  },
});

export const removeAfterSequence = mutation({
  args: {
    taskId: v.id("tasks"),
    sequence: v.number(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .collect();
    const toDelete = messages.filter((m) => m.sequence > args.sequence);
    for (const msg of toDelete) {
      const snapshot = await ctx.db
        .query("pullRequestSnapshots")
        .withIndex("by_message", (q) => q.eq("messageId", msg._id))
        .first();
      if (snapshot) {
        await ctx.db.delete(snapshot._id);
      }
      await ctx.db.delete(msg._id);
    }
    return { deleted: toDelete.length };
  },
});

export const get = query({
  args: { messageId: v.id("chatMessages") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.messageId);
  },
});

export const byTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
    const messagesWithSnapshots = await Promise.all(
      messages.map(async (msg) => {
        const pullRequestSnapshot = await ctx.db
          .query("pullRequestSnapshots")
          .withIndex("by_message", (q) => q.eq("messageId", msg._id))
          .first();
        const stackedTask = msg.stackedTaskId
          ? await ctx.db.get(msg.stackedTaskId)
          : null;
        return {
          ...msg,
          pullRequestSnapshot,
          stackedTask: stackedTask
            ? { id: stackedTask._id, title: stackedTask.title }
            : null,
        };
      })
    );
    return messagesWithSnapshots;
  },
});

export const getLatestSequence = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();
    return latest?.sequence ?? -1;
  },
});

// ============================================================================
// BP012: promptMessageId Pattern - Retry-safe streaming
// Source: https://docs.convex.dev/agents/messages#saving-messages
// ============================================================================

/**
 * Save a prompt (user) message BEFORE starting LLM generation.
 * This enables retry-safe streaming - the message exists in DB before LLM call.
 *
 * Implements TRUE IDEMPOTENCY via clientMessageId:
 * 1. If clientMessageId provided, check index first (instant upsert behavior)
 * 2. Always returns existing message if found, never creates duplicates
 *
 * Usage pattern:
 * - Frontend generates clientMessageId (UUID) before sending
 * - On retry/refresh, same clientMessageId returns same message
 */
export const savePromptMessage = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
    llmModel: v.optional(v.string()),
    // Client-generated UUID for true idempotency across retries
    clientMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // TRUE IDEMPOTENCY: Check by clientMessageId index first (instant O(1) lookup)
    if (args.clientMessageId) {
      const existingByClientId = await ctx.db
        .query("chatMessages")
        .withIndex("by_task_clientMessageId", (q) =>
          q.eq("taskId", args.taskId).eq("clientMessageId", args.clientMessageId)
        )
        .first();

      if (existingByClientId) {
        console.log(
          `[MESSAGES] Idempotent hit: clientMessageId=${args.clientMessageId} → ` +
            `existing message ${existingByClientId._id} (sequence=${existingByClientId.sequence})`
        );
        return { messageId: existingByClientId._id, sequence: existingByClientId.sequence };
      }
    }

    // No existing message found, create new one
    const latest = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();
    const sequence = latest ? latest.sequence + 1 : 0;

    const messageId = await ctx.db.insert("chatMessages", {
      taskId: args.taskId,
      role: "USER",
      content: args.content,
      llmModel: args.llmModel,
      clientMessageId: args.clientMessageId,
      sequence,
      status: "complete", // User messages are immediately complete
      createdAt: now,
    });

    console.log(
      `[MESSAGES] Created new prompt message ${messageId} ` +
        `(clientMessageId=${args.clientMessageId}, sequence=${sequence})`
    );

    return { messageId, sequence };
  },
});

/**
 * Create an assistant message placeholder BEFORE LLM call.
 * Links to the prompt message for retry correlation.
 */
export const createAssistantMessage = mutation({
  args: {
    taskId: v.id("tasks"),
    promptMessageId: v.optional(v.id("chatMessages")),
    llmModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const latest = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();
    const sequence = latest ? latest.sequence + 1 : 0;
    const now = Date.now();

    const messageId = await ctx.db.insert("chatMessages", {
      taskId: args.taskId,
      role: "ASSISTANT",
      content: "",
      llmModel: args.llmModel,
      metadataJson: JSON.stringify({ isStreaming: true, parts: [] }),
      sequence,
      status: "pending", // Will transition: pending → streaming → complete/failed
      promptMessageId: args.promptMessageId,
      createdAt: now,
    });

    return { messageId, sequence };
  },
});

/**
 * Get or create an assistant message for a prompt (BP012 idempotency).
 *
 * This prevents duplicate assistant messages when the client retries the same
 * prompt (e.g., network retries) with the same promptMessageId/clientMessageId.
 */
export const getOrCreateAssistantForPrompt = mutation({
  args: {
    taskId: v.id("tasks"),
    promptMessageId: v.id("chatMessages"),
    llmModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // BP012: Use index for faster lookup (prevents duplicate creation in high-concurrency scenarios)
    const existing = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_promptMessageId", (q) =>
        q.eq("taskId", args.taskId).eq("promptMessageId", args.promptMessageId)
      )
      .first();

    if (existing) {
      console.log(
        `[MESSAGES] Found existing assistant message for prompt ${args.promptMessageId}: ${existing._id}`
      );
      return {
        messageId: existing._id,
        sequence: existing.sequence,
        status: existing.status ?? null,
        content: existing.content ?? "",
        reused: true,
      };
    }

    // No existing assistant found, create new one
    const latestMessage = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .first();
    const sequence = latestMessage ? latestMessage.sequence + 1 : 0;
    const now = Date.now();

    const messageId = await ctx.db.insert("chatMessages", {
      taskId: args.taskId,
      role: "ASSISTANT",
      content: "",
      llmModel: args.llmModel,
      metadataJson: JSON.stringify({ isStreaming: true, parts: [] }),
      sequence,
      status: "pending",
      promptMessageId: args.promptMessageId,
      createdAt: now,
    });

    return { messageId, sequence, status: "pending", content: "", reused: false };
  },
});

/**
 * Update message status during streaming lifecycle.
 * Status transitions: pending → streaming → complete | failed
 */
export const updateMessageStatus = mutation({
  args: {
    messageId: v.id("chatMessages"),
    status: v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("complete"),
      v.literal("failed")
    ),
    content: v.optional(v.string()),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.messageId);
    if (!existing) {
      throw new Error(`Message not found: ${args.messageId}`);
    }

    const updates: Record<string, unknown> = {
      status: args.status,
      editedAt: Date.now(),
    };

    if (args.content !== undefined) {
      updates.content = args.content;
    }
    if (args.promptTokens !== undefined) {
      updates.promptTokens = args.promptTokens;
    }
    if (args.completionTokens !== undefined) {
      updates.completionTokens = args.completionTokens;
    }
    if (args.totalTokens !== undefined) {
      updates.totalTokens = args.totalTokens;
    }
    if (args.finishReason !== undefined) {
      updates.finishReason = args.finishReason;
    }

    // Update metadata with streaming state
    const currentMetadata = existing.metadataJson
      ? JSON.parse(existing.metadataJson)
      : {};
    const updatedMetadata = {
      ...currentMetadata,
      isStreaming: args.status === "streaming",
      errorMessage: args.errorMessage,
    };
    updates.metadataJson = JSON.stringify(updatedMetadata);

    await ctx.db.patch(args.messageId, updates);
    return { success: true };
  },
});

/**
 * Find existing assistant message for a prompt (for retry scenarios).
 * Returns the last assistant message linked to the given prompt.
 */
export const findAssistantForPrompt = query({
  args: {
    taskId: v.id("tasks"),
    promptMessageId: v.id("chatMessages"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_task_sequence", (q) => q.eq("taskId", args.taskId))
      .order("desc")
      .collect();

    // Find assistant message linked to this prompt
    const assistant = messages.find(
      (m) =>
        m.role === "ASSISTANT" &&
        m.promptMessageId === args.promptMessageId
    );

    return assistant ?? null;
  },
});

/**
 * Get messages by status (useful for finding failed messages to retry).
 */
export const byStatus = query({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("complete"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_status", (q) =>
        q.eq("taskId", args.taskId).eq("status", args.status)
      )
      .collect();
  },
});
