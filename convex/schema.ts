import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const TaskStatus = v.union(
  v.literal("STOPPED"),
  v.literal("INITIALIZING"),
  v.literal("ARCHIVED"),
  v.literal("RUNNING"),
  v.literal("COMPLETED"),
  v.literal("FAILED"),
);

const MessageRole = v.union(
  v.literal("USER"),
  v.literal("ASSISTANT"),
  v.literal("SYSTEM"),
);

const TodoStatus = v.union(
  v.literal("PENDING"),
  v.literal("IN_PROGRESS"),
  v.literal("COMPLETED"),
  v.literal("CANCELLED"),
);

const InitStatus = v.union(
  v.literal("INACTIVE"),
  v.literal("PREPARE_WORKSPACE"),
  v.literal("CREATE_VM"),
  v.literal("WAIT_VM_READY"),
  v.literal("VERIFY_VM_WORKSPACE"),
  v.literal("START_BACKGROUND_SERVICES"),
  v.literal("INSTALL_DEPENDENCIES"),
  v.literal("COMPLETE_SHADOW_WIKI"),
  v.literal("ACTIVE"),
);

const MemoryCategory = v.union(
  v.literal("INFRA"),
  v.literal("SETUP"),
  v.literal("STYLES"),
  v.literal("ARCHITECTURE"),
  v.literal("TESTING"),
  v.literal("PATTERNS"),
  v.literal("BUGS"),
  v.literal("PERFORMANCE"),
  v.literal("CONFIG"),
  v.literal("GENERAL"),
);

export default defineSchema({
  users: defineTable({
    externalId: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    emailVerified: v.boolean(),
    image: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  tasks: defineTable({
    title: v.string(),
    status: TaskStatus,
    repoFullName: v.string(),
    repoUrl: v.string(),
    isScratchpad: v.boolean(),
    mainModel: v.optional(v.string()),
    workspacePath: v.optional(v.string()),
    initStatus: InitStatus,
    scheduledCleanupAt: v.optional(v.number()),
    initializationError: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    workspaceCleanedUp: v.boolean(),
    hasBeenInitialized: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    userId: v.id("users"),
    baseBranch: v.string(),
    baseCommitSha: v.string(),
    shadowBranch: v.string(),
    pullRequestNumber: v.optional(v.number()),
    githubIssueId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_repo", ["repoFullName"]),

  chatMessages: defineTable({
    content: v.string(),
    role: MessageRole,
    llmModel: v.optional(v.string()),
    metadataJson: v.optional(v.string()),
    sequence: v.number(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
    createdAt: v.number(),
    editedAt: v.optional(v.number()),
    taskId: v.id("tasks"),
  }).index("by_task_sequence", ["taskId", "sequence"]),

  todos: defineTable({
    content: v.string(),
    status: TodoStatus,
    sequence: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    taskId: v.id("tasks"),
  })
    .index("by_task", ["taskId"])
    .index("by_task_status", ["taskId", "status"]),

  memories: defineTable({
    content: v.string(),
    category: MemoryCategory,
    repoFullName: v.string(),
    repoUrl: v.string(),
    userId: v.id("users"),
    taskId: v.id("tasks"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_repo", ["userId", "repoFullName"])
    .index("by_task", ["taskId"])
    .index("by_category", ["category"]),
});

