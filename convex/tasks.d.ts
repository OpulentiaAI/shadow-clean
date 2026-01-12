import { action } from "./_generated/server";
export declare const create: import("convex/server").RegisteredMutation<"public", {
    baseBranch?: string;
    shadowBranch?: string;
    baseCommitSha?: string;
    isScratchpad?: boolean;
    mainModel?: string;
    githubIssueId?: string;
    repoUrl: string;
    userId: import("convex/values").GenericId<"users">;
    title: string;
    repoFullName: string;
}, Promise<{
    taskId: import("convex/values").GenericId<"tasks">;
}>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    status?: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
    shadowBranch?: string;
    baseCommitSha?: string;
    initStatus?: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
    title?: string;
    mainModel?: string;
    workspacePath?: string;
    scheduledCleanupAt?: number;
    initializationError?: string;
    errorMessage?: string;
    workspaceCleanedUp?: boolean;
    hasBeenInitialized?: boolean;
    pullRequestNumber?: number;
    codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    taskId: import("convex/values").GenericId<"tasks">;
}>>;
export declare const updateTitle: import("convex/server").RegisteredMutation<"public", {
    title: string;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    task: {
        title: string;
        _id: import("convex/values").GenericId<"tasks">;
        _creationTime: number;
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
        repoFullName: string;
        isScratchpad: boolean;
        workspaceCleanedUp: boolean;
        hasBeenInitialized: boolean;
    };
}>>;
export declare const archive: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    task: {
        status: string;
        _id: import("convex/values").GenericId<"tasks">;
        _creationTime: number;
        mainModel?: string;
        workspacePath?: string;
        scheduledCleanupAt?: number;
        initializationError?: string;
        errorMessage?: string;
        pullRequestNumber?: number;
        githubIssueId?: string;
        codebaseUnderstandingId?: import("convex/values").GenericId<"codebaseUnderstanding">;
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
    };
}>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    success: boolean;
    task: {
        _id: import("convex/values").GenericId<"tasks">;
        _creationTime: number;
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
    };
}>>;
export declare const get: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"tasks">;
    _creationTime: number;
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
}>>;
export declare const getWithDetails: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    task: {
        _id: import("convex/values").GenericId<"tasks">;
        _creationTime: number;
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
    };
    todos: {
        _id: import("convex/values").GenericId<"todos">;
        _creationTime: number;
        status: "COMPLETED" | "PENDING" | "IN_PROGRESS" | "CANCELLED";
        content: string;
        createdAt: number;
        updatedAt: number;
        taskId: import("convex/values").GenericId<"tasks">;
        sequence: number;
    }[];
    messages: {
        _id: import("convex/values").GenericId<"chatMessages">;
        _creationTime: number;
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
    }[];
}>>;
export declare const getTitle: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<string>>;
export declare const getStatus: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
    initStatus: "INACTIVE" | "PREPARE_WORKSPACE" | "CREATE_VM" | "WAIT_VM_READY" | "VERIFY_VM_WORKSPACE" | "START_BACKGROUND_SERVICES" | "INSTALL_DEPENDENCIES" | "COMPLETE_SHADOW_WIKI" | "ACTIVE";
    initializationError: string;
    hasBeenInitialized: boolean;
}>>;
export declare const getStackedPRInfo: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    id: import("convex/values").GenericId<"tasks">;
    title: string;
    status: "STOPPED" | "INITIALIZING" | "ARCHIVED" | "RUNNING" | "COMPLETED" | "FAILED";
    shadowBranch: string;
}>>;
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"tasks">;
    _creationTime: number;
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
}[]>>;
export declare const listScheduledForCleanup: import("convex/server").RegisteredQuery<"public", {
    now: number;
}, Promise<{
    _id: import("convex/values").GenericId<"tasks">;
    _creationTime: number;
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
}[]>>;
export declare const listByUserExcludeArchived: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<{
    _id: import("convex/values").GenericId<"tasks">;
    _creationTime: number;
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
}[]>>;
export declare const countActiveByUser: import("convex/server").RegisteredQuery<"public", {
    userId: import("convex/values").GenericId<"users">;
}, Promise<number>>;
export declare const listByPrNumberAndRepo: import("convex/server").RegisteredQuery<"public", {
    repoFullName: string;
    pullRequestNumber: number;
}, Promise<{
    _id: import("convex/values").GenericId<"tasks">;
    _creationTime: number;
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
}[]>>;
export declare const getDetails: ReturnType<typeof action>;
export declare const createPullRequest: import("convex/server").RegisteredAction<"public", {
    userId?: string;
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<unknown>>;
export declare const initiate: import("convex/server").RegisteredAction<"public", {
    message: string;
    userId: import("convex/values").GenericId<"users">;
    taskId: import("convex/values").GenericId<"tasks">;
    model: string;
}, Promise<unknown>>;
/**
 * Update workspace status from sidecar (Convex-native mode)
 * Creates or updates the workspace status record for a task
 */
export declare const updateWorkspaceStatus: import("convex/server").RegisteredMutation<"public", {
    activeProcessCount?: number;
    diskUsageBytes?: number;
    taskId: import("convex/values").GenericId<"tasks">;
    isHealthy: boolean;
    lastHeartbeat: number;
}, Promise<{
    statusId: import("convex/values").GenericId<"workspaceStatus">;
}>>;
/**
 * Get workspace status for a task
 */
export declare const getWorkspaceStatus: import("convex/server").RegisteredQuery<"public", {
    taskId: import("convex/values").GenericId<"tasks">;
}, Promise<{
    _id: import("convex/values").GenericId<"workspaceStatus">;
    _creationTime: number;
    activeProcessCount?: number;
    diskUsageBytes?: number;
    createdAt: number;
    updatedAt: number;
    taskId: import("convex/values").GenericId<"tasks">;
    isHealthy: boolean;
    lastHeartbeat: number;
}>>;
//# sourceMappingURL=tasks.d.ts.map