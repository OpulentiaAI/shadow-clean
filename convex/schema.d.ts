export declare const TaskStatus: import("convex/values").VUnion<"STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED", [import("convex/values").VLiteral<"STOPPED", "required">, import("convex/values").VLiteral<"INITIALIZING", "required">, import("convex/values").VLiteral<"ARCHIVED", "required">, import("convex/values").VLiteral<"RUNNING", "required">, import("convex/values").VLiteral<"COMPLETED", "required">, import("convex/values").VLiteral<"FAILED", "required">], "required", never>;
export declare const MessageRole: import("convex/values").VUnion<"USER" | "ASSISTANT" | "SYSTEM", [import("convex/values").VLiteral<"USER", "required">, import("convex/values").VLiteral<"ASSISTANT", "required">, import("convex/values").VLiteral<"SYSTEM", "required">], "required", never>;
export declare const TodoStatus: import("convex/values").VUnion<"COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED", [import("convex/values").VLiteral<"PENDING", "required">, import("convex/values").VLiteral<"IN_PROGRESS", "required">, import("convex/values").VLiteral<"COMPLETED", "required">, import("convex/values").VLiteral<"CANCELLED", "required">], "required", never>;
export declare const InitStatus: import("convex/values").VUnion<"INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE", [import("convex/values").VLiteral<"INACTIVE", "required">, import("convex/values").VLiteral<"PREPARE_WORKSPACE", "required">, import("convex/values").VLiteral<"CREATE_VM", "required">, import("convex/values").VLiteral<"WAIT_VM_READY", "required">, import("convex/values").VLiteral<"VERIFY_VM_WORKSPACE", "required">, import("convex/values").VLiteral<"START_BACKGROUND_SERVICES", "required">, import("convex/values").VLiteral<"INSTALL_DEPENDENCIES", "required">, import("convex/values").VLiteral<"COMPLETE_SHADOW_WIKI", "required">, import("convex/values").VLiteral<"ACTIVE", "required">], "required", never>;
export declare const MemoryCategory: import("convex/values").VUnion<"INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL", [import("convex/values").VLiteral<"INFRA", "required">, import("convex/values").VLiteral<"SETUP", "required">, import("convex/values").VLiteral<"STYLES", "required">, import("convex/values").VLiteral<"ARCHITECTURE", "required">, import("convex/values").VLiteral<"TESTING", "required">, import("convex/values").VLiteral<"PATTERNS", "required">, import("convex/values").VLiteral<"BUGS", "required">, import("convex/values").VLiteral<"PERFORMANCE", "required">, import("convex/values").VLiteral<"CONFIG", "required">, import("convex/values").VLiteral<"GENERAL", "required">], "required", never>;
export declare const PullRequestStatus: import("convex/values").VUnion<"CREATED" | "UPDATED", [import("convex/values").VLiteral<"CREATED", "required">, import("convex/values").VLiteral<"UPDATED", "required">], "required", never>;
export declare const FileOperation: import("convex/values").VUnion<"CREATE" | "UPDATE" | "DELETE" | "RENAME", [import("convex/values").VLiteral<"CREATE", "required">, import("convex/values").VLiteral<"UPDATE", "required">, import("convex/values").VLiteral<"DELETE", "required">, import("convex/values").VLiteral<"RENAME", "required">], "required", never>;
export declare const ToolLogStatus: import("convex/values").VUnion<"RUNNING" | "COMPLETED" | "FAILED", [import("convex/values").VLiteral<"RUNNING", "required">, import("convex/values").VLiteral<"COMPLETED", "required">, import("convex/values").VLiteral<"FAILED", "required">], "required", never>;
export declare const StreamType: import("convex/values").VUnion<"stdout" | "stderr", [import("convex/values").VLiteral<"stdout", "required">, import("convex/values").VLiteral<"stderr", "required">], "required", never>;
export declare const McpTransportType: import("convex/values").VUnion<"HTTP" | "SSE", [import("convex/values").VLiteral<"HTTP", "required">, import("convex/values").VLiteral<"SSE", "required">], "required", never>;
declare const _default: import("convex/server").SchemaDefinition<{
    users: import("convex/server").TableDefinition<import("convex/values").VObject<{
        externalId?: string;
        image?: string;
        name: string;
        email: string;
        emailVerified: boolean;
        createdAt: number;
        updatedAt: number;
    }, {
        externalId: import("convex/values").VString<string, "optional">;
        name: import("convex/values").VString<string, "required">;
        email: import("convex/values").VString<string, "required">;
        emailVerified: import("convex/values").VBoolean<boolean, "required">;
        image: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "externalId" | "name" | "email" | "emailVerified" | "image" | "createdAt" | "updatedAt">, {
        by_email: ["email", "_creationTime"];
        by_external_id: ["externalId", "_creationTime"];
    }, {}, {}>;
    sessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        ipAddress?: string;
        userAgent?: string;
        createdAt: number;
        updatedAt: number;
        token: string;
        expiresAt: number;
        userId: import("convex/values").GenericId<"users">;
    }, {
        token: import("convex/values").VString<string, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
        ipAddress: import("convex/values").VString<string, "optional">;
        userAgent: import("convex/values").VString<string, "optional">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "updatedAt" | "token" | "expiresAt" | "ipAddress" | "userAgent" | "userId">, {
        by_token: ["token", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    accounts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        accessToken?: string;
        refreshToken?: string;
        idToken?: string;
        accessTokenExpiresAt?: number;
        refreshTokenExpiresAt?: number;
        scope?: string;
        password?: string;
        githubInstallationId?: string;
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        accountId: string;
        providerId: string;
        githubAppConnected: boolean;
    }, {
        accountId: import("convex/values").VString<string, "required">;
        providerId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        accessToken: import("convex/values").VString<string, "optional">;
        refreshToken: import("convex/values").VString<string, "optional">;
        idToken: import("convex/values").VString<string, "optional">;
        accessTokenExpiresAt: import("convex/values").VFloat64<number, "optional">;
        refreshTokenExpiresAt: import("convex/values").VFloat64<number, "optional">;
        scope: import("convex/values").VString<string, "optional">;
        password: import("convex/values").VString<string, "optional">;
        githubInstallationId: import("convex/values").VString<string, "optional">;
        githubAppConnected: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "updatedAt" | "userId" | "accountId" | "providerId" | "accessToken" | "refreshToken" | "idToken" | "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "scope" | "password" | "githubInstallationId" | "githubAppConnected">, {
        by_user: ["userId", "_creationTime"];
        by_provider: ["providerId", "accountId", "_creationTime"];
        by_user_provider: ["userId", "providerId", "_creationTime"];
    }, {}, {}>;
    verification: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt?: number;
        updatedAt?: number;
        value: string;
        expiresAt: number;
        identifier: string;
    }, {
        identifier: import("convex/values").VString<string, "required">;
        value: import("convex/values").VString<string, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "optional">;
        updatedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "value" | "createdAt" | "updatedAt" | "expiresAt" | "identifier">, {
        by_identifier: ["identifier", "_creationTime"];
    }, {}, {}>;
    tasks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        mainModel?: string;
        workspacePath?: string;
        scheduledCleanupAt?: number;
        initializationError?: string;
        errorMessage?: string;
        pullRequestNumber?: number;
        githubIssueId?: string;
        codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
        status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
        repoUrl: string;
        baseBranch: string;
        shadowBranch: string;
        baseCommitSha: string;
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        initStatus: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
        title: string;
        repoFullName: string;
        isScratchpad: boolean;
        workspaceCleanedUp: boolean;
        hasBeenInitialized: boolean;
    }, {
        title: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED", [import("convex/values").VLiteral<"STOPPED", "required">, import("convex/values").VLiteral<"INITIALIZING", "required">, import("convex/values").VLiteral<"ARCHIVED", "required">, import("convex/values").VLiteral<"RUNNING", "required">, import("convex/values").VLiteral<"COMPLETED", "required">, import("convex/values").VLiteral<"FAILED", "required">], "required", never>;
        repoFullName: import("convex/values").VString<string, "required">;
        repoUrl: import("convex/values").VString<string, "required">;
        isScratchpad: import("convex/values").VBoolean<boolean, "required">;
        mainModel: import("convex/values").VString<string, "optional">;
        workspacePath: import("convex/values").VString<string, "optional">;
        initStatus: import("convex/values").VUnion<"INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE", [import("convex/values").VLiteral<"INACTIVE", "required">, import("convex/values").VLiteral<"PREPARE_WORKSPACE", "required">, import("convex/values").VLiteral<"CREATE_VM", "required">, import("convex/values").VLiteral<"WAIT_VM_READY", "required">, import("convex/values").VLiteral<"VERIFY_VM_WORKSPACE", "required">, import("convex/values").VLiteral<"START_BACKGROUND_SERVICES", "required">, import("convex/values").VLiteral<"INSTALL_DEPENDENCIES", "required">, import("convex/values").VLiteral<"COMPLETE_SHADOW_WIKI", "required">, import("convex/values").VLiteral<"ACTIVE", "required">], "required", never>;
        scheduledCleanupAt: import("convex/values").VFloat64<number, "optional">;
        initializationError: import("convex/values").VString<string, "optional">;
        errorMessage: import("convex/values").VString<string, "optional">;
        workspaceCleanedUp: import("convex/values").VBoolean<boolean, "required">;
        hasBeenInitialized: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        baseBranch: import("convex/values").VString<string, "required">;
        baseCommitSha: import("convex/values").VString<string, "required">;
        shadowBranch: import("convex/values").VString<string, "required">;
        pullRequestNumber: import("convex/values").VFloat64<number, "optional">;
        githubIssueId: import("convex/values").VString<string, "optional">;
        codebaseUnderstandingId: import("convex/values").VId<import("convex/values").GenericId<"codebaseUnderstanding">, "optional">;
    }, "required", "status" | "repoUrl" | "baseBranch" | "shadowBranch" | "baseCommitSha" | "createdAt" | "updatedAt" | "userId" | "initStatus" | "title" | "repoFullName" | "isScratchpad" | "mainModel" | "workspacePath" | "scheduledCleanupAt" | "initializationError" | "errorMessage" | "workspaceCleanedUp" | "hasBeenInitialized" | "pullRequestNumber" | "githubIssueId" | "codebaseUnderstandingId">, {
        by_user: ["userId", "_creationTime"];
        by_repo: ["repoFullName", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_user_repo: ["userId", "repoFullName", "_creationTime"];
        by_scheduled_cleanup: ["scheduledCleanupAt", "_creationTime"];
    }, {}, {}>;
    taskSessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        podName?: string;
        podNamespace?: string;
        connectionId?: string;
        endedAt?: number;
        createdAt: number;
        isActive: boolean;
        taskId: import("convex/values").GenericId<"tasks">;
    }, {
        podName: import("convex/values").VString<string, "optional">;
        podNamespace: import("convex/values").VString<string, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        connectionId: import("convex/values").VString<string, "optional">;
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        endedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "createdAt" | "podName" | "podNamespace" | "isActive" | "connectionId" | "taskId" | "endedAt">, {
        by_task: ["taskId", "_creationTime"];
        by_task_active: ["taskId", "isActive", "_creationTime"];
    }, {}, {}>;
    chatMessages: import("convex/server").TableDefinition<import("convex/values").VObject<{
        status?: "pending" | "streaming" | "complete" | "failed";
        llmModel?: string;
        metadataJson?: string;
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        finishReason?: string;
        editedAt?: number;
        stackedTaskId?: import("convex/values").GenericId<"tasks">;
        promptMessageId?: import("convex/values").GenericId<"chatMessages">;
        clientMessageId?: string;
        content: string;
        createdAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        role: "USER" | "ASSISTANT" | "SYSTEM";
        sequence: number;
    }, {
        content: import("convex/values").VString<string, "required">;
        role: import("convex/values").VUnion<"USER" | "ASSISTANT" | "SYSTEM", [import("convex/values").VLiteral<"USER", "required">, import("convex/values").VLiteral<"ASSISTANT", "required">, import("convex/values").VLiteral<"SYSTEM", "required">], "required", never>;
        llmModel: import("convex/values").VString<string, "optional">;
        metadataJson: import("convex/values").VString<string, "optional">;
        sequence: import("convex/values").VFloat64<number, "required">;
        promptTokens: import("convex/values").VFloat64<number, "optional">;
        completionTokens: import("convex/values").VFloat64<number, "optional">;
        totalTokens: import("convex/values").VFloat64<number, "optional">;
        finishReason: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        editedAt: import("convex/values").VFloat64<number, "optional">;
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        stackedTaskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "optional">;
        status: import("convex/values").VUnion<"pending" | "streaming" | "complete" | "failed", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"streaming", "required">, import("convex/values").VLiteral<"complete", "required">, import("convex/values").VLiteral<"failed", "required">], "optional", never>;
        promptMessageId: import("convex/values").VId<import("convex/values").GenericId<"chatMessages">, "optional">;
        clientMessageId: import("convex/values").VString<string, "optional">;
    }, "required", "status" | "content" | "createdAt" | "taskId" | "role" | "llmModel" | "metadataJson" | "sequence" | "promptTokens" | "completionTokens" | "totalTokens" | "finishReason" | "editedAt" | "stackedTaskId" | "promptMessageId" | "clientMessageId">, {
        by_task_sequence: ["taskId", "sequence", "_creationTime"];
        by_task_role: ["taskId", "role", "_creationTime"];
        by_model_created: ["llmModel", "createdAt", "_creationTime"];
        by_status: ["taskId", "status", "_creationTime"];
        by_task_clientMessageId: ["taskId", "clientMessageId", "_creationTime"];
        by_task_promptMessageId: ["taskId", "promptMessageId", "_creationTime"];
    }, {}, {}>;
    pullRequestSnapshots: import("convex/server").TableDefinition<import("convex/values").VObject<{
        status: "CREATED" | "UPDATED";
        linesAdded: number;
        linesRemoved: number;
        commitSha: string;
        createdAt: number;
        title: string;
        description: string;
        filesChanged: number;
        messageId: import("convex/values").GenericId<"chatMessages">;
    }, {
        status: import("convex/values").VUnion<"CREATED" | "UPDATED", [import("convex/values").VLiteral<"CREATED", "required">, import("convex/values").VLiteral<"UPDATED", "required">], "required", never>;
        title: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "required">;
        filesChanged: import("convex/values").VFloat64<number, "required">;
        linesAdded: import("convex/values").VFloat64<number, "required">;
        linesRemoved: import("convex/values").VFloat64<number, "required">;
        commitSha: import("convex/values").VString<string, "required">;
        messageId: import("convex/values").VId<import("convex/values").GenericId<"chatMessages">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "linesAdded" | "linesRemoved" | "commitSha" | "createdAt" | "title" | "description" | "filesChanged" | "messageId">, {
        by_message: ["messageId", "_creationTime"];
    }, {}, {}>;
    toolCalls: import("convex/server").TableDefinition<import("convex/values").VObject<{
        error?: string;
        messageId?: import("convex/values").GenericId<"chatMessages">;
        threadId?: string;
        resultJson?: string;
        completedAt?: number;
        status: "RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED";
        createdAt: number;
        updatedAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        toolCallId: string;
        toolName: string;
        argsJson: string;
        startedAt: number;
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        threadId: import("convex/values").VString<string, "optional">;
        messageId: import("convex/values").VId<import("convex/values").GenericId<"chatMessages">, "optional">;
        toolCallId: import("convex/values").VString<string, "required">;
        toolName: import("convex/values").VString<string, "required">;
        argsJson: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"RUNNING" | "FAILED" | "REQUESTED" | "SUCCEEDED", [import("convex/values").VLiteral<"REQUESTED", "required">, import("convex/values").VLiteral<"RUNNING", "required">, import("convex/values").VLiteral<"SUCCEEDED", "required">, import("convex/values").VLiteral<"FAILED", "required">], "required", never>;
        resultJson: import("convex/values").VString<string, "optional">;
        error: import("convex/values").VString<string, "optional">;
        startedAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "error" | "status" | "createdAt" | "updatedAt" | "taskId" | "messageId" | "threadId" | "toolCallId" | "toolName" | "argsJson" | "resultJson" | "startedAt" | "completedAt">, {
        by_task: ["taskId", "createdAt", "_creationTime"];
        by_message: ["messageId", "createdAt", "_creationTime"];
        by_status: ["status", "createdAt", "_creationTime"];
    }, {}, {}>;
    todos: import("convex/server").TableDefinition<import("convex/values").VObject<{
        status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
        content: string;
        createdAt: number;
        updatedAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        sequence: number;
    }, {
        content: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED", [import("convex/values").VLiteral<"PENDING", "required">, import("convex/values").VLiteral<"IN_PROGRESS", "required">, import("convex/values").VLiteral<"COMPLETED", "required">, import("convex/values").VLiteral<"CANCELLED", "required">], "required", never>;
        sequence: import("convex/values").VFloat64<number, "required">;
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "content" | "createdAt" | "updatedAt" | "taskId" | "sequence">, {
        by_task: ["taskId", "_creationTime"];
        by_task_sequence: ["taskId", "sequence", "_creationTime"];
        by_task_status: ["taskId", "status", "_creationTime"];
    }, {}, {}>;
    memories: import("convex/server").TableDefinition<import("convex/values").VObject<{
        content: string;
        repoUrl: string;
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        repoFullName: string;
        taskId: import("convex/values").GenericId<"tasks">;
        category: "INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL";
    }, {
        content: import("convex/values").VString<string, "required">;
        category: import("convex/values").VUnion<"INFRA" | "SETUP" | "STYLES" | "ARCHITECTURE" | "TESTING" | "PATTERNS" | "BUGS" | "PERFORMANCE" | "CONFIG" | "GENERAL", [import("convex/values").VLiteral<"INFRA", "required">, import("convex/values").VLiteral<"SETUP", "required">, import("convex/values").VLiteral<"STYLES", "required">, import("convex/values").VLiteral<"ARCHITECTURE", "required">, import("convex/values").VLiteral<"TESTING", "required">, import("convex/values").VLiteral<"PATTERNS", "required">, import("convex/values").VLiteral<"BUGS", "required">, import("convex/values").VLiteral<"PERFORMANCE", "required">, import("convex/values").VLiteral<"CONFIG", "required">, import("convex/values").VLiteral<"GENERAL", "required">], "required", never>;
        repoFullName: import("convex/values").VString<string, "required">;
        repoUrl: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "content" | "repoUrl" | "createdAt" | "updatedAt" | "userId" | "repoFullName" | "taskId" | "category">, {
        by_user_repo: ["userId", "repoFullName", "_creationTime"];
        by_task: ["taskId", "_creationTime"];
        by_category: ["category", "_creationTime"];
    }, {}, {}>;
    repositoryIndex: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastCommitSha?: string;
        createdAt: number;
        updatedAt: number;
        repoFullName: string;
        lastIndexedAt: number;
    }, {
        repoFullName: import("convex/values").VString<string, "required">;
        lastIndexedAt: import("convex/values").VFloat64<number, "required">;
        lastCommitSha: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "updatedAt" | "repoFullName" | "lastIndexedAt" | "lastCommitSha">, {
        by_repo: ["repoFullName", "_creationTime"];
    }, {}, {}>;
    codebaseUnderstanding: import("convex/server").TableDefinition<import("convex/values").VObject<{
        repoUrl: string;
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        repoFullName: string;
        contentJson: string;
    }, {
        repoFullName: import("convex/values").VString<string, "required">;
        repoUrl: import("convex/values").VString<string, "required">;
        contentJson: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "repoUrl" | "createdAt" | "updatedAt" | "userId" | "repoFullName" | "contentJson">, {
        by_repo: ["repoFullName", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    userSettings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        rules?: string;
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        memoriesEnabled: boolean;
        autoPullRequest: boolean;
        enableShadowWiki: boolean;
        enableIndexing: boolean;
        selectedModels: string[];
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        memoriesEnabled: import("convex/values").VBoolean<boolean, "required">;
        autoPullRequest: import("convex/values").VBoolean<boolean, "required">;
        enableShadowWiki: import("convex/values").VBoolean<boolean, "required">;
        enableIndexing: import("convex/values").VBoolean<boolean, "required">;
        selectedModels: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        rules: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "updatedAt" | "userId" | "memoriesEnabled" | "autoPullRequest" | "enableShadowWiki" | "enableIndexing" | "selectedModels" | "rules">, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    mcpConnectors: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId?: import("convex/values").GenericId<"users">;
        templateId?: string;
        configJson?: string;
        oauthClientId?: string;
        oauthClientSecret?: string;
        type: "HTTP" | "SSE";
        url: string;
        name: string;
        createdAt: number;
        updatedAt: number;
        nameId: string;
        enabled: boolean;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "optional">;
        name: import("convex/values").VString<string, "required">;
        nameId: import("convex/values").VString<string, "required">;
        url: import("convex/values").VString<string, "required">;
        type: import("convex/values").VUnion<"HTTP" | "SSE", [import("convex/values").VLiteral<"HTTP", "required">, import("convex/values").VLiteral<"SSE", "required">], "required", never>;
        templateId: import("convex/values").VString<string, "optional">;
        configJson: import("convex/values").VString<string, "optional">;
        oauthClientId: import("convex/values").VString<string, "optional">;
        oauthClientSecret: import("convex/values").VString<string, "optional">;
        enabled: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "type" | "url" | "name" | "createdAt" | "updatedAt" | "userId" | "nameId" | "templateId" | "configJson" | "oauthClientId" | "oauthClientSecret" | "enabled">, {
        by_user: ["userId", "_creationTime"];
        by_user_name_id: ["userId", "nameId", "_creationTime"];
    }, {}, {}>;
    fileChanges: import("convex/server").TableDefinition<import("convex/values").VObject<{
        additions: number;
        deletions: number;
        createdAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        operation: "CREATE" | "UPDATE" | "DELETE" | "RENAME";
        filePath: string;
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        filePath: import("convex/values").VString<string, "required">;
        operation: import("convex/values").VUnion<"CREATE" | "UPDATE" | "DELETE" | "RENAME", [import("convex/values").VLiteral<"CREATE", "required">, import("convex/values").VLiteral<"UPDATE", "required">, import("convex/values").VLiteral<"DELETE", "required">, import("convex/values").VLiteral<"RENAME", "required">], "required", never>;
        additions: import("convex/values").VFloat64<number, "required">;
        deletions: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "additions" | "deletions" | "createdAt" | "taskId" | "operation" | "filePath">, {
        by_task: ["taskId", "createdAt", "_creationTime"];
        by_task_path: ["taskId", "filePath", "_creationTime"];
    }, {}, {}>;
    toolLogs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        error?: string;
        resultJson?: string;
        completedAt?: number;
        durationMs?: number;
        status: "RUNNING" | "COMPLETED" | "FAILED";
        createdAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        toolName: string;
        argsJson: string;
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        toolName: import("convex/values").VString<string, "required">;
        argsJson: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"RUNNING" | "COMPLETED" | "FAILED", [import("convex/values").VLiteral<"RUNNING", "required">, import("convex/values").VLiteral<"COMPLETED", "required">, import("convex/values").VLiteral<"FAILED", "required">], "required", never>;
        resultJson: import("convex/values").VString<string, "optional">;
        error: import("convex/values").VString<string, "optional">;
        durationMs: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "error" | "status" | "createdAt" | "taskId" | "toolName" | "argsJson" | "resultJson" | "completedAt" | "durationMs">, {
        by_task: ["taskId", "createdAt", "_creationTime"];
        by_status: ["status", "createdAt", "_creationTime"];
    }, {}, {}>;
    terminalOutput: import("convex/server").TableDefinition<import("convex/values").VObject<{
        timestamp: number;
        content: string;
        taskId: import("convex/values").GenericId<"tasks">;
        streamType: "stdout" | "stderr";
        commandId: string;
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        commandId: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        streamType: import("convex/values").VUnion<"stdout" | "stderr", [import("convex/values").VLiteral<"stdout", "required">, import("convex/values").VLiteral<"stderr", "required">], "required", never>;
        timestamp: import("convex/values").VFloat64<number, "required">;
    }, "required", "timestamp" | "content" | "taskId" | "streamType" | "commandId">, {
        by_task: ["taskId", "timestamp", "_creationTime"];
        by_command: ["commandId", "timestamp", "_creationTime"];
    }, {}, {}>;
    workspaceStatus: import("convex/server").TableDefinition<import("convex/values").VObject<{
        activeProcessCount?: number;
        diskUsageBytes?: number;
        createdAt: number;
        updatedAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        isHealthy: boolean;
        lastHeartbeat: number;
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        isHealthy: import("convex/values").VBoolean<boolean, "required">;
        lastHeartbeat: import("convex/values").VFloat64<number, "required">;
        activeProcessCount: import("convex/values").VFloat64<number, "optional">;
        diskUsageBytes: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "updatedAt" | "taskId" | "isHealthy" | "lastHeartbeat" | "activeProcessCount" | "diskUsageBytes">, {
        by_task: ["taskId", "_creationTime"];
    }, {}, {}>;
    presence: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userImage?: string;
        cursor?: {
            x: number;
            y: number;
        };
        selection?: {
            filePath?: string;
            start: number;
            end: number;
        };
        createdAt: number;
        updatedAt: number;
        userId: import("convex/values").GenericId<"users">;
        taskId: import("convex/values").GenericId<"tasks">;
        userName: string;
        activity: "viewing" | "typing" | "editing-file" | "running-command" | "idle";
        lastSeenAt: number;
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        userName: import("convex/values").VString<string, "required">;
        userImage: import("convex/values").VString<string, "optional">;
        cursor: import("convex/values").VObject<{
            x: number;
            y: number;
        }, {
            x: import("convex/values").VFloat64<number, "required">;
            y: import("convex/values").VFloat64<number, "required">;
        }, "optional", "x" | "y">;
        selection: import("convex/values").VObject<{
            filePath?: string;
            start: number;
            end: number;
        }, {
            start: import("convex/values").VFloat64<number, "required">;
            end: import("convex/values").VFloat64<number, "required">;
            filePath: import("convex/values").VString<string, "optional">;
        }, "optional", "filePath" | "start" | "end">;
        activity: import("convex/values").VUnion<"viewing" | "typing" | "editing-file" | "running-command" | "idle", [import("convex/values").VLiteral<"viewing", "required">, import("convex/values").VLiteral<"typing", "required">, import("convex/values").VLiteral<"editing-file", "required">, import("convex/values").VLiteral<"running-command", "required">, import("convex/values").VLiteral<"idle", "required">], "required", never>;
        lastSeenAt: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "updatedAt" | "userId" | "taskId" | "userName" | "userImage" | "cursor" | "selection" | "activity" | "lastSeenAt" | "cursor.x" | "cursor.y" | "selection.filePath" | "selection.start" | "selection.end">, {
        by_task: ["taskId", "_creationTime"];
        by_task_user: ["taskId", "userId", "_creationTime"];
    }, {}, {}>;
    activities: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: string;
        timestamp: number;
        userId: import("convex/values").GenericId<"users">;
        taskId: import("convex/values").GenericId<"tasks">;
        activityType: "user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed";
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        activityType: import("convex/values").VUnion<"user-joined" | "user-left" | "file-opened" | "file-saved" | "command-started" | "command-completed", [import("convex/values").VLiteral<"user-joined", "required">, import("convex/values").VLiteral<"user-left", "required">, import("convex/values").VLiteral<"file-opened", "required">, import("convex/values").VLiteral<"file-saved", "required">, import("convex/values").VLiteral<"command-started", "required">, import("convex/values").VLiteral<"command-completed", "required">], "required", never>;
        metadata: import("convex/values").VString<string, "optional">;
        timestamp: import("convex/values").VFloat64<number, "required">;
    }, "required", "timestamp" | "metadata" | "userId" | "taskId" | "activityType">, {
        by_task: ["taskId", "timestamp", "_creationTime"];
    }, {}, {}>;
    agentTools: import("convex/server").TableDefinition<import("convex/values").VObject<{
        error?: string;
        completedAt?: number;
        result?: any;
        status: "RUNNING" | "COMPLETED" | "FAILED" | "PENDING";
        args: any;
        createdAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        messageId: import("convex/values").GenericId<"chatMessages">;
        toolCallId: string;
        toolName: string;
    }, {
        messageId: import("convex/values").VId<import("convex/values").GenericId<"chatMessages">, "required">;
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        toolName: import("convex/values").VString<string, "required">;
        args: import("convex/values").VAny<any, "required", string>;
        toolCallId: import("convex/values").VString<string, "required">;
        result: import("convex/values").VAny<any, "optional", string>;
        status: import("convex/values").VUnion<"RUNNING" | "COMPLETED" | "FAILED" | "PENDING", [import("convex/values").VLiteral<"PENDING", "required">, import("convex/values").VLiteral<"RUNNING", "required">, import("convex/values").VLiteral<"COMPLETED", "required">, import("convex/values").VLiteral<"FAILED", "required">], "required", never>;
        error: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
    }, "required", "error" | "status" | "args" | "createdAt" | "taskId" | "messageId" | "toolCallId" | "toolName" | "completedAt" | "result" | `args.${string}` | `result.${string}`>, {
        by_message: ["messageId", "_creationTime"];
        by_task: ["taskId", "_creationTime"];
        by_tool_call_id: ["toolCallId", "_creationTime"];
    }, {}, {}>;
    workflowTraces: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: string;
        errorMessage?: string;
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
        messageId?: import("convex/values").GenericId<"chatMessages">;
        completedAt?: number;
        totalDurationMs?: number;
        estimatedCostMillicents?: number;
        model?: string;
        provider?: string;
        errorType?: string;
        retryCount?: number;
        status: "COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED";
        createdAt: number;
        updatedAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        startedAt: number;
        traceId: string;
        workflowType: "streamChat" | "streamChatWithTools" | "generateText" | "toolExecution";
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        traceId: import("convex/values").VString<string, "required">;
        messageId: import("convex/values").VId<import("convex/values").GenericId<"chatMessages">, "optional">;
        workflowType: import("convex/values").VUnion<"streamChat" | "streamChatWithTools" | "generateText" | "toolExecution", [import("convex/values").VLiteral<"streamChat", "required">, import("convex/values").VLiteral<"streamChatWithTools", "required">, import("convex/values").VLiteral<"generateText", "required">, import("convex/values").VLiteral<"toolExecution", "required">], "required", never>;
        status: import("convex/values").VUnion<"COMPLETED" | "FAILED" | "IN_PROGRESS" | "CANCELLED" | "STARTED", [import("convex/values").VLiteral<"STARTED", "required">, import("convex/values").VLiteral<"IN_PROGRESS", "required">, import("convex/values").VLiteral<"COMPLETED", "required">, import("convex/values").VLiteral<"FAILED", "required">, import("convex/values").VLiteral<"CANCELLED", "required">], "required", never>;
        startedAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        totalDurationMs: import("convex/values").VFloat64<number, "optional">;
        promptTokens: import("convex/values").VFloat64<number, "optional">;
        completionTokens: import("convex/values").VFloat64<number, "optional">;
        totalTokens: import("convex/values").VFloat64<number, "optional">;
        estimatedCostMillicents: import("convex/values").VFloat64<number, "optional">;
        model: import("convex/values").VString<string, "optional">;
        provider: import("convex/values").VString<string, "optional">;
        errorType: import("convex/values").VString<string, "optional">;
        errorMessage: import("convex/values").VString<string, "optional">;
        retryCount: import("convex/values").VFloat64<number, "optional">;
        metadata: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "metadata" | "createdAt" | "updatedAt" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "totalTokens" | "messageId" | "startedAt" | "completedAt" | "traceId" | "workflowType" | "totalDurationMs" | "estimatedCostMillicents" | "model" | "provider" | "errorType" | "retryCount">, {
        by_task: ["taskId", "createdAt", "_creationTime"];
        by_trace_id: ["traceId", "_creationTime"];
        by_status: ["status", "createdAt", "_creationTime"];
        by_model: ["model", "createdAt", "_creationTime"];
    }, {}, {}>;
    workflowSteps: import("convex/server").TableDefinition<import("convex/values").VObject<{
        errorMessage?: string;
        promptTokens?: number;
        completionTokens?: number;
        finishReason?: string;
        toolCallId?: string;
        toolName?: string;
        completedAt?: number;
        durationMs?: number;
        chunkCount?: number;
        totalChars?: number;
        status: "COMPLETED" | "FAILED" | "STARTED";
        createdAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        startedAt: number;
        traceId: string;
        stepNumber: number;
        stepType: "llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry";
    }, {
        traceId: import("convex/values").VString<string, "required">;
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        stepNumber: import("convex/values").VFloat64<number, "required">;
        stepType: import("convex/values").VUnion<"llm_call" | "tool_call" | "tool_result" | "text_delta" | "retry", [import("convex/values").VLiteral<"llm_call", "required">, import("convex/values").VLiteral<"tool_call", "required">, import("convex/values").VLiteral<"tool_result", "required">, import("convex/values").VLiteral<"text_delta", "required">, import("convex/values").VLiteral<"retry", "required">], "required", never>;
        startedAt: import("convex/values").VFloat64<number, "required">;
        completedAt: import("convex/values").VFloat64<number, "optional">;
        durationMs: import("convex/values").VFloat64<number, "optional">;
        toolName: import("convex/values").VString<string, "optional">;
        toolCallId: import("convex/values").VString<string, "optional">;
        promptTokens: import("convex/values").VFloat64<number, "optional">;
        completionTokens: import("convex/values").VFloat64<number, "optional">;
        finishReason: import("convex/values").VString<string, "optional">;
        status: import("convex/values").VUnion<"COMPLETED" | "FAILED" | "STARTED", [import("convex/values").VLiteral<"STARTED", "required">, import("convex/values").VLiteral<"COMPLETED", "required">, import("convex/values").VLiteral<"FAILED", "required">], "required", never>;
        errorMessage: import("convex/values").VString<string, "optional">;
        chunkCount: import("convex/values").VFloat64<number, "optional">;
        totalChars: import("convex/values").VFloat64<number, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "errorMessage" | "taskId" | "promptTokens" | "completionTokens" | "finishReason" | "toolCallId" | "toolName" | "startedAt" | "completedAt" | "durationMs" | "traceId" | "stepNumber" | "stepType" | "chunkCount" | "totalChars">, {
        by_trace: ["traceId", "stepNumber", "_creationTime"];
        by_task: ["taskId", "createdAt", "_creationTime"];
    }, {}, {}>;
    streamingMetrics: import("convex/server").TableDefinition<import("convex/values").VObject<{
        traceId?: string;
        totalDurationMs?: number;
        streamEndedAt?: number;
        charsPerWrite?: number;
        createdAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        messageId: import("convex/values").GenericId<"chatMessages">;
        totalChars: number;
        totalDeltas: number;
        avgChunkSize: number;
        throttleIntervalMs: number;
        streamStartedAt: number;
        dbWriteCount: number;
        streamStatus: "aborted" | "streaming" | "failed" | "completed";
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        messageId: import("convex/values").VId<import("convex/values").GenericId<"chatMessages">, "required">;
        traceId: import("convex/values").VString<string, "optional">;
        totalDeltas: import("convex/values").VFloat64<number, "required">;
        totalChars: import("convex/values").VFloat64<number, "required">;
        avgChunkSize: import("convex/values").VFloat64<number, "required">;
        throttleIntervalMs: import("convex/values").VFloat64<number, "required">;
        streamStartedAt: import("convex/values").VFloat64<number, "required">;
        streamEndedAt: import("convex/values").VFloat64<number, "optional">;
        totalDurationMs: import("convex/values").VFloat64<number, "optional">;
        dbWriteCount: import("convex/values").VFloat64<number, "required">;
        charsPerWrite: import("convex/values").VFloat64<number, "optional">;
        streamStatus: import("convex/values").VUnion<"aborted" | "streaming" | "failed" | "completed", [import("convex/values").VLiteral<"streaming", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"aborted", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "taskId" | "messageId" | "traceId" | "totalDurationMs" | "totalChars" | "totalDeltas" | "avgChunkSize" | "throttleIntervalMs" | "streamStartedAt" | "streamEndedAt" | "dbWriteCount" | "charsPerWrite" | "streamStatus">, {
        by_task: ["taskId", "createdAt", "_creationTime"];
        by_message: ["messageId", "_creationTime"];
    }, {}, {}>;
    commandLogs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        timestamp: number;
        content: string;
        taskId: import("convex/values").GenericId<"tasks">;
        commandId: string;
        stream: "stdout" | "stderr" | "system";
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        commandId: import("convex/values").VString<string, "required">;
        stream: import("convex/values").VUnion<"stdout" | "stderr" | "system", [import("convex/values").VLiteral<"stdout", "required">, import("convex/values").VLiteral<"stderr", "required">, import("convex/values").VLiteral<"system", "required">], "required", never>;
        content: import("convex/values").VString<string, "required">;
        timestamp: import("convex/values").VFloat64<number, "required">;
    }, "required", "timestamp" | "content" | "taskId" | "commandId" | "stream">, {
        by_task: ["taskId", "timestamp", "_creationTime"];
        by_command: ["commandId", "timestamp", "_creationTime"];
    }, {}, {}>;
    gitState: import("convex/server").TableDefinition<import("convex/values").VObject<{
        repoUrl?: string;
        status: string;
        currentBranch: string;
        createdAt: number;
        updatedAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        workDir: string;
        lastOperation: string;
        lastOperationTime: number;
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        workDir: import("convex/values").VString<string, "required">;
        repoUrl: import("convex/values").VString<string, "optional">;
        currentBranch: import("convex/values").VString<string, "required">;
        status: import("convex/values").VString<string, "required">;
        lastOperation: import("convex/values").VString<string, "required">;
        lastOperationTime: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "repoUrl" | "currentBranch" | "createdAt" | "updatedAt" | "taskId" | "workDir" | "lastOperation" | "lastOperationTime">, {
        by_task: ["taskId", "_creationTime"];
    }, {}, {}>;
    virtualFiles: import("convex/server").TableDefinition<import("convex/values").VObject<{
        content?: string;
        storageId?: import("convex/values").GenericId<"_storage">;
        mimeType?: string;
        path: string;
        createdAt: number;
        updatedAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        size: number;
        isDirectory: boolean;
    }, {
        taskId: import("convex/values").VId<import("convex/values").GenericId<"tasks">, "required">;
        path: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "optional">;
        storageId: import("convex/values").VId<import("convex/values").GenericId<"_storage">, "optional">;
        size: import("convex/values").VFloat64<number, "required">;
        isDirectory: import("convex/values").VBoolean<boolean, "required">;
        mimeType: import("convex/values").VString<string, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "path" | "content" | "createdAt" | "updatedAt" | "taskId" | "storageId" | "size" | "isDirectory" | "mimeType">, {
        by_task: ["taskId", "_creationTime"];
        by_task_path: ["taskId", "path", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
//# sourceMappingURL=schema.d.ts.map