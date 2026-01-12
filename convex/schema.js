"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpTransportType = exports.StreamType = exports.ToolLogStatus = exports.FileOperation = exports.PullRequestStatus = exports.MemoryCategory = exports.InitStatus = exports.TodoStatus = exports.MessageRole = exports.TaskStatus = void 0;
const server_1 = require("convex/server");
const values_1 = require("convex/values");
exports.TaskStatus = values_1.v.union(values_1.v.literal("STOPPED"), values_1.v.literal("INITIALIZING"), values_1.v.literal("ARCHIVED"), values_1.v.literal("RUNNING"), values_1.v.literal("COMPLETED"), values_1.v.literal("FAILED"));
exports.MessageRole = values_1.v.union(values_1.v.literal("USER"), values_1.v.literal("ASSISTANT"), values_1.v.literal("SYSTEM"));
exports.TodoStatus = values_1.v.union(values_1.v.literal("PENDING"), values_1.v.literal("IN_PROGRESS"), values_1.v.literal("COMPLETED"), values_1.v.literal("CANCELLED"));
exports.InitStatus = values_1.v.union(values_1.v.literal("INACTIVE"), values_1.v.literal("PREPARE_WORKSPACE"), values_1.v.literal("CREATE_VM"), values_1.v.literal("WAIT_VM_READY"), values_1.v.literal("VERIFY_VM_WORKSPACE"), values_1.v.literal("START_BACKGROUND_SERVICES"), values_1.v.literal("INSTALL_DEPENDENCIES"), values_1.v.literal("COMPLETE_SHADOW_WIKI"), values_1.v.literal("ACTIVE"));
exports.MemoryCategory = values_1.v.union(values_1.v.literal("INFRA"), values_1.v.literal("SETUP"), values_1.v.literal("STYLES"), values_1.v.literal("ARCHITECTURE"), values_1.v.literal("TESTING"), values_1.v.literal("PATTERNS"), values_1.v.literal("BUGS"), values_1.v.literal("PERFORMANCE"), values_1.v.literal("CONFIG"), values_1.v.literal("GENERAL"));
exports.PullRequestStatus = values_1.v.union(values_1.v.literal("CREATED"), values_1.v.literal("UPDATED"));
exports.FileOperation = values_1.v.union(values_1.v.literal("CREATE"), values_1.v.literal("UPDATE"), values_1.v.literal("DELETE"), values_1.v.literal("RENAME"));
exports.ToolLogStatus = values_1.v.union(values_1.v.literal("RUNNING"), values_1.v.literal("COMPLETED"), values_1.v.literal("FAILED"));
exports.StreamType = values_1.v.union(values_1.v.literal("stdout"), values_1.v.literal("stderr"));
exports.McpTransportType = values_1.v.union(values_1.v.literal("HTTP"), values_1.v.literal("SSE"));
exports.default = (0, server_1.defineSchema)({
    users: (0, server_1.defineTable)({
        externalId: values_1.v.optional(values_1.v.string()),
        name: values_1.v.string(),
        email: values_1.v.string(),
        emailVerified: values_1.v.boolean(),
        image: values_1.v.optional(values_1.v.string()),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_email", ["email"])
        .index("by_external_id", ["externalId"]),
    sessions: (0, server_1.defineTable)({
        token: values_1.v.string(),
        expiresAt: values_1.v.number(),
        ipAddress: values_1.v.optional(values_1.v.string()),
        userAgent: values_1.v.optional(values_1.v.string()),
        userId: values_1.v.id("users"),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_token", ["token"])
        .index("by_user", ["userId"]),
    accounts: (0, server_1.defineTable)({
        accountId: values_1.v.string(),
        providerId: values_1.v.string(),
        userId: values_1.v.id("users"),
        accessToken: values_1.v.optional(values_1.v.string()),
        refreshToken: values_1.v.optional(values_1.v.string()),
        idToken: values_1.v.optional(values_1.v.string()),
        accessTokenExpiresAt: values_1.v.optional(values_1.v.number()),
        refreshTokenExpiresAt: values_1.v.optional(values_1.v.number()),
        scope: values_1.v.optional(values_1.v.string()),
        password: values_1.v.optional(values_1.v.string()),
        githubInstallationId: values_1.v.optional(values_1.v.string()),
        githubAppConnected: values_1.v.boolean(),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_provider", ["providerId", "accountId"])
        .index("by_user_provider", ["userId", "providerId"]),
    verification: (0, server_1.defineTable)({
        identifier: values_1.v.string(),
        value: values_1.v.string(),
        expiresAt: values_1.v.number(),
        createdAt: values_1.v.optional(values_1.v.number()),
        updatedAt: values_1.v.optional(values_1.v.number()),
    }).index("by_identifier", ["identifier"]),
    tasks: (0, server_1.defineTable)({
        title: values_1.v.string(),
        status: exports.TaskStatus,
        repoFullName: values_1.v.string(),
        repoUrl: values_1.v.string(),
        isScratchpad: values_1.v.boolean(),
        mainModel: values_1.v.optional(values_1.v.string()),
        workspacePath: values_1.v.optional(values_1.v.string()),
        initStatus: exports.InitStatus,
        scheduledCleanupAt: values_1.v.optional(values_1.v.number()),
        initializationError: values_1.v.optional(values_1.v.string()),
        errorMessage: values_1.v.optional(values_1.v.string()),
        workspaceCleanedUp: values_1.v.boolean(),
        hasBeenInitialized: values_1.v.boolean(),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
        userId: values_1.v.id("users"),
        baseBranch: values_1.v.string(),
        baseCommitSha: values_1.v.string(),
        shadowBranch: values_1.v.string(),
        pullRequestNumber: values_1.v.optional(values_1.v.number()),
        githubIssueId: values_1.v.optional(values_1.v.string()),
        codebaseUnderstandingId: values_1.v.optional(values_1.v.id("codebaseUnderstanding")),
    })
        .index("by_user", ["userId"])
        .index("by_repo", ["repoFullName"])
        .index("by_user_status", ["userId", "status"])
        .index("by_status", ["status"])
        .index("by_user_repo", ["userId", "repoFullName"])
        .index("by_scheduled_cleanup", ["scheduledCleanupAt"]),
    taskSessions: (0, server_1.defineTable)({
        podName: values_1.v.optional(values_1.v.string()),
        podNamespace: values_1.v.optional(values_1.v.string()),
        isActive: values_1.v.boolean(),
        connectionId: values_1.v.optional(values_1.v.string()),
        taskId: values_1.v.id("tasks"),
        createdAt: values_1.v.number(),
        endedAt: values_1.v.optional(values_1.v.number()),
    })
        .index("by_task", ["taskId"])
        .index("by_task_active", ["taskId", "isActive"]),
    chatMessages: (0, server_1.defineTable)({
        content: values_1.v.string(),
        role: exports.MessageRole,
        llmModel: values_1.v.optional(values_1.v.string()),
        metadataJson: values_1.v.optional(values_1.v.string()),
        sequence: values_1.v.number(),
        promptTokens: values_1.v.optional(values_1.v.number()),
        completionTokens: values_1.v.optional(values_1.v.number()),
        totalTokens: values_1.v.optional(values_1.v.number()),
        finishReason: values_1.v.optional(values_1.v.string()),
        createdAt: values_1.v.number(),
        editedAt: values_1.v.optional(values_1.v.number()),
        taskId: values_1.v.id("tasks"),
        stackedTaskId: values_1.v.optional(values_1.v.id("tasks")),
        // BP012: Message status for promptMessageId pattern (retry-safe streaming)
        status: values_1.v.optional(values_1.v.union(values_1.v.literal("pending"), values_1.v.literal("streaming"), values_1.v.literal("complete"), values_1.v.literal("failed"))),
        // BP012: Link response to its prompt message for retry correlation
        promptMessageId: values_1.v.optional(values_1.v.id("chatMessages")),
        // Idempotency: client-generated message ID for deduplication across retries
        clientMessageId: values_1.v.optional(values_1.v.string()),
    })
        .index("by_task_sequence", ["taskId", "sequence"])
        .index("by_task_role", ["taskId", "role"])
        .index("by_model_created", ["llmModel", "createdAt"])
        .index("by_status", ["taskId", "status"])
        .index("by_task_clientMessageId", ["taskId", "clientMessageId"])
        .index("by_task_promptMessageId", ["taskId", "promptMessageId"]),
    pullRequestSnapshots: (0, server_1.defineTable)({
        status: exports.PullRequestStatus,
        title: values_1.v.string(),
        description: values_1.v.string(),
        filesChanged: values_1.v.number(),
        linesAdded: values_1.v.number(),
        linesRemoved: values_1.v.number(),
        commitSha: values_1.v.string(),
        messageId: values_1.v.id("chatMessages"),
        createdAt: values_1.v.number(),
    }).index("by_message", ["messageId"]),
    toolCalls: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        threadId: values_1.v.optional(values_1.v.string()), // reserved for agent threads
        messageId: values_1.v.optional(values_1.v.id("chatMessages")), // optional - may not have message context during tool execution
        toolCallId: values_1.v.string(), // LLM/tool invocation identifier
        toolName: values_1.v.string(),
        argsJson: values_1.v.string(),
        status: values_1.v.union(values_1.v.literal("REQUESTED"), values_1.v.literal("RUNNING"), values_1.v.literal("SUCCEEDED"), values_1.v.literal("FAILED")),
        resultJson: values_1.v.optional(values_1.v.string()),
        error: values_1.v.optional(values_1.v.string()),
        startedAt: values_1.v.number(),
        completedAt: values_1.v.optional(values_1.v.number()),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_task", ["taskId", "createdAt"])
        .index("by_message", ["messageId", "createdAt"])
        .index("by_status", ["status", "createdAt"]),
    todos: (0, server_1.defineTable)({
        content: values_1.v.string(),
        status: exports.TodoStatus,
        sequence: values_1.v.number(),
        taskId: values_1.v.id("tasks"),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_task", ["taskId"])
        .index("by_task_sequence", ["taskId", "sequence"])
        .index("by_task_status", ["taskId", "status"]),
    memories: (0, server_1.defineTable)({
        content: values_1.v.string(),
        category: exports.MemoryCategory,
        repoFullName: values_1.v.string(),
        repoUrl: values_1.v.string(),
        userId: values_1.v.id("users"),
        taskId: values_1.v.id("tasks"),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_user_repo", ["userId", "repoFullName"])
        .index("by_task", ["taskId"])
        .index("by_category", ["category"]),
    repositoryIndex: (0, server_1.defineTable)({
        repoFullName: values_1.v.string(),
        lastIndexedAt: values_1.v.number(),
        lastCommitSha: values_1.v.optional(values_1.v.string()),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_repo", ["repoFullName"]),
    codebaseUnderstanding: (0, server_1.defineTable)({
        repoFullName: values_1.v.string(),
        repoUrl: values_1.v.string(),
        contentJson: values_1.v.string(),
        userId: values_1.v.id("users"),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_repo", ["repoFullName"])
        .index("by_user", ["userId"]),
    userSettings: (0, server_1.defineTable)({
        userId: values_1.v.id("users"),
        memoriesEnabled: values_1.v.boolean(),
        autoPullRequest: values_1.v.boolean(),
        enableShadowWiki: values_1.v.boolean(),
        enableIndexing: values_1.v.boolean(),
        selectedModels: values_1.v.array(values_1.v.string()),
        rules: values_1.v.optional(values_1.v.string()),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_user", ["userId"]),
    // MCP (Model Context Protocol) connectors for external AI tools
    mcpConnectors: (0, server_1.defineTable)({
        userId: values_1.v.optional(values_1.v.id("users")), // null/undefined = global connector available to all users
        name: values_1.v.string(),
        nameId: values_1.v.string(), // unique per user, used as namespace for tool IDs
        url: values_1.v.string(), // MCP server URL
        type: exports.McpTransportType,
        templateId: values_1.v.optional(values_1.v.string()), // Reference to template used (e.g., "atlassian", "linear")
        configJson: values_1.v.optional(values_1.v.string()), // JSON string of user-configured environment variables (encrypted)
        oauthClientId: values_1.v.optional(values_1.v.string()),
        oauthClientSecret: values_1.v.optional(values_1.v.string()),
        enabled: values_1.v.boolean(),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_user_name_id", ["userId", "nameId"]),
    // File changes tracked by sidecar (Convex-native mode)
    fileChanges: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        filePath: values_1.v.string(),
        operation: exports.FileOperation,
        additions: values_1.v.number(),
        deletions: values_1.v.number(),
        createdAt: values_1.v.number(),
    })
        .index("by_task", ["taskId", "createdAt"])
        .index("by_task_path", ["taskId", "filePath"]),
    // Tool execution logs from sidecar (Convex-native mode)
    toolLogs: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        toolName: values_1.v.string(),
        argsJson: values_1.v.string(),
        status: exports.ToolLogStatus,
        resultJson: values_1.v.optional(values_1.v.string()),
        error: values_1.v.optional(values_1.v.string()),
        durationMs: values_1.v.optional(values_1.v.number()),
        createdAt: values_1.v.number(),
        completedAt: values_1.v.optional(values_1.v.number()),
    })
        .index("by_task", ["taskId", "createdAt"])
        .index("by_status", ["status", "createdAt"]),
    // Terminal output streaming from sidecar (Convex-native mode)
    terminalOutput: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        commandId: values_1.v.string(),
        content: values_1.v.string(),
        streamType: exports.StreamType,
        timestamp: values_1.v.number(),
    })
        .index("by_task", ["taskId", "timestamp"])
        .index("by_command", ["commandId", "timestamp"]),
    // Workspace status tracking (Convex-native mode)
    workspaceStatus: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        isHealthy: values_1.v.boolean(),
        lastHeartbeat: values_1.v.number(),
        activeProcessCount: values_1.v.optional(values_1.v.number()),
        diskUsageBytes: values_1.v.optional(values_1.v.number()),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_task", ["taskId"]),
    // Real-time presence for collaborative editing
    presence: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        userId: values_1.v.id("users"),
        userName: values_1.v.string(),
        userImage: values_1.v.optional(values_1.v.string()),
        cursor: values_1.v.optional(values_1.v.object({
            x: values_1.v.number(),
            y: values_1.v.number(),
        })),
        selection: values_1.v.optional(values_1.v.object({
            start: values_1.v.number(),
            end: values_1.v.number(),
            filePath: values_1.v.optional(values_1.v.string()),
        })),
        activity: values_1.v.union(values_1.v.literal("viewing"), values_1.v.literal("typing"), values_1.v.literal("editing-file"), values_1.v.literal("running-command"), values_1.v.literal("idle")),
        lastSeenAt: values_1.v.number(),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_task", ["taskId"])
        .index("by_task_user", ["taskId", "userId"]),
    // Activity broadcasting for real-time collaboration
    activities: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        userId: values_1.v.id("users"),
        activityType: values_1.v.union(values_1.v.literal("user-joined"), values_1.v.literal("user-left"), values_1.v.literal("file-opened"), values_1.v.literal("file-saved"), values_1.v.literal("command-started"), values_1.v.literal("command-completed")),
        metadata: values_1.v.optional(values_1.v.string()),
        timestamp: values_1.v.number(),
    })
        .index("by_task", ["taskId", "timestamp"]),
    // Agent tool calls during streaming (separate from toolCalls for streaming context)
    agentTools: (0, server_1.defineTable)({
        messageId: values_1.v.id("chatMessages"),
        taskId: values_1.v.id("tasks"),
        toolName: values_1.v.string(),
        args: values_1.v.any(),
        toolCallId: values_1.v.string(),
        result: values_1.v.optional(values_1.v.any()),
        status: values_1.v.union(values_1.v.literal("PENDING"), values_1.v.literal("RUNNING"), values_1.v.literal("COMPLETED"), values_1.v.literal("FAILED")),
        error: values_1.v.optional(values_1.v.string()),
        createdAt: values_1.v.number(),
        completedAt: values_1.v.optional(values_1.v.number()),
    })
        .index("by_message", ["messageId"])
        .index("by_task", ["taskId"])
        .index("by_tool_call_id", ["toolCallId"]),
    // Workflow execution traces for observability (Best Practice BP018)
    workflowTraces: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        traceId: values_1.v.string(), // Unique trace ID for end-to-end correlation
        messageId: values_1.v.optional(values_1.v.id("chatMessages")),
        workflowType: values_1.v.union(values_1.v.literal("streamChat"), values_1.v.literal("streamChatWithTools"), values_1.v.literal("generateText"), values_1.v.literal("toolExecution")),
        status: values_1.v.union(values_1.v.literal("STARTED"), values_1.v.literal("IN_PROGRESS"), values_1.v.literal("COMPLETED"), values_1.v.literal("FAILED"), values_1.v.literal("CANCELLED")),
        // Timing metrics
        startedAt: values_1.v.number(),
        completedAt: values_1.v.optional(values_1.v.number()),
        totalDurationMs: values_1.v.optional(values_1.v.number()),
        // Token usage
        promptTokens: values_1.v.optional(values_1.v.number()),
        completionTokens: values_1.v.optional(values_1.v.number()),
        totalTokens: values_1.v.optional(values_1.v.number()),
        // Cost estimation (in millicents for precision)
        estimatedCostMillicents: values_1.v.optional(values_1.v.number()),
        // Provider info
        model: values_1.v.optional(values_1.v.string()),
        provider: values_1.v.optional(values_1.v.string()),
        // Error tracking
        errorType: values_1.v.optional(values_1.v.string()),
        errorMessage: values_1.v.optional(values_1.v.string()),
        retryCount: values_1.v.optional(values_1.v.number()),
        // Metadata
        metadata: values_1.v.optional(values_1.v.string()), // JSON string for flexible data
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_task", ["taskId", "createdAt"])
        .index("by_trace_id", ["traceId"])
        .index("by_status", ["status", "createdAt"])
        .index("by_model", ["model", "createdAt"]),
    // Per-step metrics within a workflow trace (Best Practice BP002)
    workflowSteps: (0, server_1.defineTable)({
        traceId: values_1.v.string(), // Links to workflowTraces
        taskId: values_1.v.id("tasks"),
        stepNumber: values_1.v.number(),
        stepType: values_1.v.union(values_1.v.literal("llm_call"), values_1.v.literal("tool_call"), values_1.v.literal("tool_result"), values_1.v.literal("text_delta"), values_1.v.literal("retry")),
        // Timing
        startedAt: values_1.v.number(),
        completedAt: values_1.v.optional(values_1.v.number()),
        durationMs: values_1.v.optional(values_1.v.number()),
        // For tool calls
        toolName: values_1.v.optional(values_1.v.string()),
        toolCallId: values_1.v.optional(values_1.v.string()),
        // For LLM calls
        promptTokens: values_1.v.optional(values_1.v.number()),
        completionTokens: values_1.v.optional(values_1.v.number()),
        finishReason: values_1.v.optional(values_1.v.string()),
        // Status
        status: values_1.v.union(values_1.v.literal("STARTED"), values_1.v.literal("COMPLETED"), values_1.v.literal("FAILED")),
        errorMessage: values_1.v.optional(values_1.v.string()),
        // Streaming metrics
        chunkCount: values_1.v.optional(values_1.v.number()),
        totalChars: values_1.v.optional(values_1.v.number()),
        createdAt: values_1.v.number(),
    })
        .index("by_trace", ["traceId", "stepNumber"])
        .index("by_task", ["taskId", "createdAt"]),
    // Streaming metrics for throttling optimization (Best Practice BP005)
    streamingMetrics: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        messageId: values_1.v.id("chatMessages"),
        traceId: values_1.v.optional(values_1.v.string()),
        // Delta streaming metrics
        totalDeltas: values_1.v.number(),
        totalChars: values_1.v.number(),
        avgChunkSize: values_1.v.number(),
        throttleIntervalMs: values_1.v.number(),
        // Timing
        streamStartedAt: values_1.v.number(),
        streamEndedAt: values_1.v.optional(values_1.v.number()),
        totalDurationMs: values_1.v.optional(values_1.v.number()),
        // Write efficiency
        dbWriteCount: values_1.v.number(),
        charsPerWrite: values_1.v.optional(values_1.v.number()),
        // Status
        streamStatus: values_1.v.union(values_1.v.literal("streaming"), values_1.v.literal("completed"), values_1.v.literal("aborted"), values_1.v.literal("failed")),
        createdAt: values_1.v.number(),
    })
        .index("by_task", ["taskId", "createdAt"])
        .index("by_message", ["messageId"]),
    // Command execution logs for terminal operations (Convex-native)
    commandLogs: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        commandId: values_1.v.string(),
        stream: values_1.v.union(values_1.v.literal("stdout"), values_1.v.literal("stderr"), values_1.v.literal("system")),
        content: values_1.v.string(),
        timestamp: values_1.v.number(),
    })
        .index("by_task", ["taskId", "timestamp"])
        .index("by_command", ["commandId", "timestamp"]),
    // Git repository state tracking (Convex-native)
    gitState: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        workDir: values_1.v.string(),
        repoUrl: values_1.v.optional(values_1.v.string()),
        currentBranch: values_1.v.string(),
        status: values_1.v.string(), // JSON.stringify of status matrix
        lastOperation: values_1.v.string(),
        lastOperationTime: values_1.v.number(),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_task", ["taskId"]),
    // Virtual file system for Convex-native file operations
    virtualFiles: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        path: values_1.v.string(),
        content: values_1.v.optional(values_1.v.string()), // For text files
        storageId: values_1.v.optional(values_1.v.id("_storage")), // For binary files
        size: values_1.v.number(),
        isDirectory: values_1.v.boolean(),
        mimeType: values_1.v.optional(values_1.v.string()),
        createdAt: values_1.v.number(),
        updatedAt: values_1.v.number(),
    })
        .index("by_task", ["taskId"])
        .index("by_task_path", ["taskId", "path"]),
    // Daytona sandbox sessions for terminal streaming
    daytonaSandboxes: (0, server_1.defineTable)({
        taskId: values_1.v.id("tasks"),
        sandboxId: values_1.v.string(),
        sessionId: values_1.v.string(),
        status: values_1.v.union(values_1.v.literal("creating"), values_1.v.literal("active"), values_1.v.literal("stopped"), values_1.v.literal("error")),
        createdAt: values_1.v.number(),
        lastActivityAt: values_1.v.number(),
    })
        .index("by_task", ["taskId"])
        .index("by_sandbox", ["sandboxId"]),
});
