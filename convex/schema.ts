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

export const FileOperation = v.union(
  v.literal("CREATE"),
  v.literal("UPDATE"),
  v.literal("DELETE"),
  v.literal("RENAME")
);

export const ToolLogStatus = v.union(
  v.literal("RUNNING"),
  v.literal("COMPLETED"),
  v.literal("FAILED")
);

export const StreamType = v.union(
  v.literal("stdout"),
  v.literal("stderr")
);

export const McpTransportType = v.union(
  v.literal("HTTP"),
  v.literal("SSE")
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
    .index("by_user_repo", ["userId", "repoFullName"])
    .index("by_scheduled_cleanup", ["scheduledCleanupAt"]),

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
    // BP012: Message status for promptMessageId pattern (retry-safe streaming)
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("complete"),
      v.literal("failed")
    )),
    // BP012: Link response to its prompt message for retry correlation
    promptMessageId: v.optional(v.id("chatMessages")),
  })
    .index("by_task_sequence", ["taskId", "sequence"])
    .index("by_task_role", ["taskId", "role"])
    .index("by_model_created", ["llmModel", "createdAt"])
    .index("by_status", ["taskId", "status"]),

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

  toolCalls: defineTable({
    taskId: v.id("tasks"),
    threadId: v.optional(v.string()), // reserved for agent threads
    messageId: v.optional(v.id("chatMessages")), // optional - may not have message context during tool execution
    toolCallId: v.string(), // LLM/tool invocation identifier
    toolName: v.string(),
    argsJson: v.string(),
    status: v.union(
      v.literal("REQUESTED"),
      v.literal("RUNNING"),
      v.literal("SUCCEEDED"),
      v.literal("FAILED")
    ),
    resultJson: v.optional(v.string()),
    error: v.optional(v.string()),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId", "createdAt"])
    .index("by_message", ["messageId", "createdAt"])
    .index("by_status", ["status", "createdAt"]),

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

  // MCP (Model Context Protocol) connectors for external AI tools
  mcpConnectors: defineTable({
    userId: v.optional(v.id("users")), // null/undefined = global connector available to all users
    name: v.string(),
    nameId: v.string(), // unique per user, used as namespace for tool IDs
    url: v.string(), // MCP server URL
    type: McpTransportType,
    oauthClientId: v.optional(v.string()),
    oauthClientSecret: v.optional(v.string()),
    enabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_name_id", ["userId", "nameId"]),

  // File changes tracked by sidecar (Convex-native mode)
  fileChanges: defineTable({
    taskId: v.id("tasks"),
    filePath: v.string(),
    operation: FileOperation,
    additions: v.number(),
    deletions: v.number(),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId", "createdAt"])
    .index("by_task_path", ["taskId", "filePath"]),

  // Tool execution logs from sidecar (Convex-native mode)
  toolLogs: defineTable({
    taskId: v.id("tasks"),
    toolName: v.string(),
    argsJson: v.string(),
    status: ToolLogStatus,
    resultJson: v.optional(v.string()),
    error: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_task", ["taskId", "createdAt"])
    .index("by_status", ["status", "createdAt"]),

  // Terminal output streaming from sidecar (Convex-native mode)
  terminalOutput: defineTable({
    taskId: v.id("tasks"),
    commandId: v.string(),
    content: v.string(),
    streamType: StreamType,
    timestamp: v.number(),
  })
    .index("by_task", ["taskId", "timestamp"])
    .index("by_command", ["commandId", "timestamp"]),

  // Workspace status tracking (Convex-native mode)
  workspaceStatus: defineTable({
    taskId: v.id("tasks"),
    isHealthy: v.boolean(),
    lastHeartbeat: v.number(),
    activeProcessCount: v.optional(v.number()),
    diskUsageBytes: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId"]),

  // Real-time presence for collaborative editing
  presence: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    userName: v.string(),
    userImage: v.optional(v.string()),
    cursor: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
      })
    ),
    selection: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
        filePath: v.optional(v.string()),
      })
    ),
    activity: v.union(
      v.literal("viewing"),
      v.literal("typing"),
      v.literal("editing-file"),
      v.literal("running-command"),
      v.literal("idle")
    ),
    lastSeenAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_task_user", ["taskId", "userId"]),

  // Activity broadcasting for real-time collaboration
  activities: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    activityType: v.union(
      v.literal("user-joined"),
      v.literal("user-left"),
      v.literal("file-opened"),
      v.literal("file-saved"),
      v.literal("command-started"),
      v.literal("command-completed")
    ),
    metadata: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_task", ["taskId", "timestamp"]),

  // Agent tool calls during streaming (separate from toolCalls for streaming context)
  agentTools: defineTable({
    messageId: v.id("chatMessages"),
    taskId: v.id("tasks"),
    toolName: v.string(),
    args: v.any(),
    toolCallId: v.string(),
    result: v.optional(v.any()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("RUNNING"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_message", ["messageId"])
    .index("by_task", ["taskId"])
    .index("by_tool_call_id", ["toolCallId"]),

  // Workflow execution traces for observability (Best Practice BP018)
  workflowTraces: defineTable({
    taskId: v.id("tasks"),
    traceId: v.string(), // Unique trace ID for end-to-end correlation
    messageId: v.optional(v.id("chatMessages")),
    workflowType: v.union(
      v.literal("streamChat"),
      v.literal("streamChatWithTools"),
      v.literal("generateText"),
      v.literal("toolExecution")
    ),
    status: v.union(
      v.literal("STARTED"),
      v.literal("IN_PROGRESS"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("CANCELLED")
    ),
    // Timing metrics
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    totalDurationMs: v.optional(v.number()),
    // Token usage
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    // Cost estimation (in millicents for precision)
    estimatedCostMillicents: v.optional(v.number()),
    // Provider info
    model: v.optional(v.string()),
    provider: v.optional(v.string()),
    // Error tracking
    errorType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()),
    // Metadata
    metadata: v.optional(v.string()), // JSON string for flexible data
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId", "createdAt"])
    .index("by_trace_id", ["traceId"])
    .index("by_status", ["status", "createdAt"])
    .index("by_model", ["model", "createdAt"]),

  // Per-step metrics within a workflow trace (Best Practice BP002)
  workflowSteps: defineTable({
    traceId: v.string(), // Links to workflowTraces
    taskId: v.id("tasks"),
    stepNumber: v.number(),
    stepType: v.union(
      v.literal("llm_call"),
      v.literal("tool_call"),
      v.literal("tool_result"),
      v.literal("text_delta"),
      v.literal("retry")
    ),
    // Timing
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    // For tool calls
    toolName: v.optional(v.string()),
    toolCallId: v.optional(v.string()),
    // For LLM calls
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    finishReason: v.optional(v.string()),
    // Status
    status: v.union(
      v.literal("STARTED"),
      v.literal("COMPLETED"),
      v.literal("FAILED")
    ),
    errorMessage: v.optional(v.string()),
    // Streaming metrics
    chunkCount: v.optional(v.number()),
    totalChars: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_trace", ["traceId", "stepNumber"])
    .index("by_task", ["taskId", "createdAt"]),

  // Streaming metrics for throttling optimization (Best Practice BP005)
  streamingMetrics: defineTable({
    taskId: v.id("tasks"),
    messageId: v.id("chatMessages"),
    traceId: v.optional(v.string()),
    // Delta streaming metrics
    totalDeltas: v.number(),
    totalChars: v.number(),
    avgChunkSize: v.number(),
    throttleIntervalMs: v.number(),
    // Timing
    streamStartedAt: v.number(),
    streamEndedAt: v.optional(v.number()),
    totalDurationMs: v.optional(v.number()),
    // Write efficiency
    dbWriteCount: v.number(),
    charsPerWrite: v.optional(v.number()),
    // Status
    streamStatus: v.union(
      v.literal("streaming"),
      v.literal("completed"),
      v.literal("aborted"),
      v.literal("failed")
    ),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId", "createdAt"])
    .index("by_message", ["messageId"]),
});
