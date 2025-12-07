import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const TaskStatus = v.union(
  v.literal("STOPPED"),
  v.literal("INITIALIZING"),
  v.literal("ARCHIVED"),
  v.literal("RUNNING"),
  v.literal("COMPLETED"),
  v.literal("FAILED")
);

export const MessageRole = v.union(
  v.literal("USER"),
  v.literal("ASSISTANT"),
  v.literal("SYSTEM")
);

export const TodoStatus = v.union(
  v.literal("PENDING"),
  v.literal("IN_PROGRESS"),
  v.literal("COMPLETED"),
  v.literal("CANCELLED")
);

export const InitStatus = v.union(
  v.literal("INACTIVE"),
  v.literal("PREPARE_WORKSPACE"),
  v.literal("CREATE_VM"),
  v.literal("WAIT_VM_READY"),
  v.literal("VERIFY_VM_WORKSPACE"),
  v.literal("START_BACKGROUND_SERVICES"),
  v.literal("INSTALL_DEPENDENCIES"),
  v.literal("COMPLETE_SHADOW_WIKI"),
  v.literal("ACTIVE")
);

export const MemoryCategory = v.union(
  v.literal("INFRA"),
  v.literal("SETUP"),
  v.literal("STYLES"),
  v.literal("ARCHITECTURE"),
  v.literal("TESTING"),
  v.literal("PATTERNS"),
  v.literal("BUGS"),
  v.literal("PERFORMANCE"),
  v.literal("CONFIG"),
  v.literal("GENERAL")
);

export const PullRequestStatus = v.union(
  v.literal("CREATED"),
  v.literal("UPDATED")
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
  })
    .index("by_email", ["email"])
    .index("by_external_id", ["externalId"]),

  sessions: defineTable({
    token: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  accounts: defineTable({
    accountId: v.string(),
    providerId: v.string(),
    userId: v.id("users"),
    accessToken: v.optional(v.string()),
    refreshToken: v.optional(v.string()),
    idToken: v.optional(v.string()),
    accessTokenExpiresAt: v.optional(v.number()),
    refreshTokenExpiresAt: v.optional(v.number()),
    scope: v.optional(v.string()),
    password: v.optional(v.string()),
    githubInstallationId: v.optional(v.string()),
    githubAppConnected: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_provider", ["providerId", "accountId"])
    .index("by_user_provider", ["userId", "providerId"]),

  verification: defineTable({
    identifier: v.string(),
    value: v.string(),
    expiresAt: v.number(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_identifier", ["identifier"]),

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
    codebaseUnderstandingId: v.optional(v.id("codebaseUnderstanding")),
  })
    .index("by_user", ["userId"])
    .index("by_repo", ["repoFullName"])
    .index("by_user_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_user_repo", ["userId", "repoFullName"]),

  taskSessions: defineTable({
    podName: v.optional(v.string()),
    podNamespace: v.optional(v.string()),
    isActive: v.boolean(),
    connectionId: v.optional(v.string()),
    taskId: v.id("tasks"),
    createdAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_task", ["taskId"])
    .index("by_task_active", ["taskId", "isActive"]),

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
    stackedTaskId: v.optional(v.id("tasks")),
  })
    .index("by_task_sequence", ["taskId", "sequence"])
    .index("by_task_role", ["taskId", "role"])
    .index("by_model_created", ["llmModel", "createdAt"]),

  pullRequestSnapshots: defineTable({
    status: PullRequestStatus,
    title: v.string(),
    description: v.string(),
    filesChanged: v.number(),
    linesAdded: v.number(),
    linesRemoved: v.number(),
    commitSha: v.string(),
    messageId: v.id("chatMessages"),
    createdAt: v.number(),
  }).index("by_message", ["messageId"]),

  todos: defineTable({
    content: v.string(),
    status: TodoStatus,
    sequence: v.number(),
    taskId: v.id("tasks"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_task_sequence", ["taskId", "sequence"])
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

  repositoryIndex: defineTable({
    repoFullName: v.string(),
    lastIndexedAt: v.number(),
    lastCommitSha: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_repo", ["repoFullName"]),

  codebaseUnderstanding: defineTable({
    repoFullName: v.string(),
    repoUrl: v.string(),
    contentJson: v.string(),
    userId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_repo", ["repoFullName"])
    .index("by_user", ["userId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    memoriesEnabled: v.boolean(),
    autoPullRequest: v.boolean(),
    enableShadowWiki: v.boolean(),
    enableIndexing: v.boolean(),
    selectedModels: v.array(v.string()),
    rules: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),
});
